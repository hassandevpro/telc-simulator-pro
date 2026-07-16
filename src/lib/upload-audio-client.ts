"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface UploadAudioResult {
  url?: string;
  error?: string;
}

/**
 * Upload d'un fichier audio depuis le navigateur — contourne la limite
 * de corps de requête des fonctions Vercel (~4,5 Mo) en envoyant les
 * octets DIRECTEMENT à Supabase Storage, jamais via une route API Next.js.
 *
 * 1. Demande un jeton d'upload signé à /api/admin/audio/sign (admin-gated
 *    côté serveur, jamais de fichier dans cette requête — juste le nom).
 * 2. Envoie le fichier directement à Supabase avec ce jeton.
 *
 * Repli automatique sur l'ancienne route POST /api/admin/audio (upload
 * classique par le serveur) si Supabase n'est pas configuré — pratique
 * en développement local, mais alors soumis à la limite de la plateforme.
 */
export async function uploadAudioFromBrowser(
  file: File,
): Promise<UploadAudioResult> {
  const signResponse = await fetch("/api/admin/audio/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name }),
  });

  if (signResponse.ok) {
    const { path, token, publicUrl } = (await signResponse.json()) as {
      path: string;
      token: string;
      publicUrl: string;
    };

    if (!url || !anonKey) {
      return { error: "Supabase-Konfiguration fehlt im Browser." };
    }
    const client = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { error } = await client.storage
      .from("audio")
      .uploadToSignedUrl(path, token, file, { contentType: file.type });
    if (error) return { error: error.message };
    return { url: publicUrl };
  }

  if (signResponse.status === 501) {
    // Repli : upload classique par le serveur (soumis à la limite
    // plateforme ~4,5 Mo — acceptable en dev, pas en production).
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/audio", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;
    if (!response.ok) {
      return { error: data?.error ?? "Upload fehlgeschlagen." };
    }
    return { url: data?.url };
  }

  const data = (await signResponse.json().catch(() => null)) as {
    error?: string;
  } | null;
  return { error: data?.error ?? "Upload fehlgeschlagen." };
}
