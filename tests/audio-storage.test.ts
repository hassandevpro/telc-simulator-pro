/**
 * 8. Téléversement audio : seuls les administrateurs (rôle relu EN BASE)
 * peuvent obtenir un jeton d'upload ou téléverser ; le client Storage
 * n'utilise jamais la clé anon publique, et un jeton ne permet jamais de
 * remplacer un fichier existant (upsert: false).
 */
import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

const state = {
  authUser: null as { id: string; role?: string } | null,
  dbRoles: new Map<string, string>(),
  storageCalls: [] as string[],
};

mock.module("@/lib/auth", {
  namedExports: {
    auth: async () => (state.authUser ? { user: state.authUser } : null),
  },
});

mock.module("@/lib/db", {
  namedExports: {
    db: {
      user: {
        findUnique: async ({ where }: { where: { id: string } }) => {
          const role = state.dbRoles.get(where.id);
          return role ? { id: where.id, role } : null;
        },
      },
      center: { findUnique: async () => null },
    },
  },
});

/**
 * Faux bucket : enregistre chaque opération. Le choix de la CLÉ est testé
 * séparément sur storageCredentials() (module réel, importé à part).
 */
const fakeBucket = () => {
  const record = (name: string) => async (...args: unknown[]) => {
    // Options = dernier argument (createSignedUploadUrl : 2e, upload : 3e).
    state.storageCalls.push(`${name}:${JSON.stringify(args.length > 1 ? args[args.length - 1] : null)}`);
    return { data: name === "list" ? [] : { path: "p", token: "t" }, error: null };
  };
  return {
    list: record("list"),
    upload: record("upload"),
    createSignedUploadUrl: record("createSignedUploadUrl"),
    getPublicUrl: () => ({ data: { publicUrl: "https://cdn/x" } }),
  };
};

let credentials: typeof import("@/lib/storage-credentials").storageCredentials;
mock.module("@/lib/supabase-storage", {
  namedExports: {
    getSupabaseStorage: () => (credentials() ? fakeBucket() : null),
  },
});

let audioRoute: typeof import("@/app/api/admin/audio/route");
let signRoute: typeof import("@/app/api/admin/audio/sign/route");

before(async () => {
  audioRoute = await import("@/app/api/admin/audio/route");
  signRoute = await import("@/app/api/admin/audio/sign/route");
  // Implémentation RÉELLE du choix de clé (module non simulé).
  credentials = (await import("@/lib/storage-credentials")).storageCredentials;
});

beforeEach(() => {
  state.authUser = null;
  state.dbRoles.clear();
  state.storageCalls.length = 0;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projet.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "cle-anon-publique";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-service-secrete";
  delete process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
});

function uploadRequest(): Request {
  const form = new FormData();
  form.set("file", new File([new Uint8Array([1, 2, 3])], "piste.mp3", { type: "audio/mpeg" }));
  return new Request("http://localhost/api/admin/audio", { method: "POST", body: form });
}

const signRequest = () =>
  new Request("http://localhost/api/admin/audio/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "piste.mp3" }),
  });

test("8. anonyme : upload et jeton signé refusés, Storage jamais appelé", async () => {
  assert.equal((await audioRoute.POST(uploadRequest())).status, 403);
  assert.equal((await signRoute.POST(signRequest())).status, 403);
  assert.equal((await audioRoute.GET()).status, 403);
  assert.deepEqual(state.storageCalls, []);
});

test("8. candidat connecté : refusé", async () => {
  state.authUser = { id: "u1", role: "STUDENT" };
  state.dbRoles.set("u1", "STUDENT");
  assert.equal((await audioRoute.POST(uploadRequest())).status, 403);
  assert.equal((await signRoute.POST(signRequest())).status, 403);
  assert.deepEqual(state.storageCalls, []);
});

test("8/9. JWT « SUPER_ADMIN » mais rôle RÉVOQUÉ en base : refusé", async () => {
  state.authUser = { id: "ex-admin", role: "SUPER_ADMIN" };
  state.dbRoles.set("ex-admin", "STUDENT");
  assert.equal((await audioRoute.POST(uploadRequest())).status, 403);
  assert.equal((await signRoute.POST(signRequest())).status, 403);
  assert.deepEqual(state.storageCalls, []);
});

test("9. compte SUPPRIMÉ avec un JWT encore valide : refusé", async () => {
  state.authUser = { id: "supprime", role: "SUPER_ADMIN" };
  assert.equal((await signRoute.POST(signRequest())).status, 403);
});

test("administrateur : jeton signé et upload autorisés, SANS remplacement possible", async () => {
  state.authUser = { id: "admin", role: "SUPER_ADMIN" };
  state.dbRoles.set("admin", "SUPER_ADMIN");
  const response = await signRoute.POST(signRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(state.storageCalls, ['createSignedUploadUrl:{"upsert":false}']);

  state.storageCalls.length = 0;
  assert.equal((await audioRoute.POST(uploadRequest())).status, 201);
  assert.match(state.storageCalls[0], /^upload:.*"upsert":false/);
});

test("Storage : la clé utilisée est la clé de SERVICE, jamais la clé anon", () => {
  assert.deepEqual(credentials(), {
    url: "https://projet.supabase.co",
    key: "cle-service-secrete",
  });
});

test("Storage : sans clé de service → null (jamais de repli sur la clé anon)", () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(credentials(), null);
});

test("Storage : clé de service exposée en NEXT_PUBLIC_ → refus explicite", () => {
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = "fuite";
  assert.throws(() => credentials(), /exposée au navigateur/);
});

test("Storage : clé de service identique à la clé anon → refus", () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cle-anon-publique";
  assert.throws(() => credentials(), /clé anon/);
});
