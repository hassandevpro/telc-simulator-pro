# Environnement de staging : guide pas à pas et checklist de tests manuels

> Ce document **prépare** le staging. Rien n'a été créé ni déployé depuis le
> dépôt : aucun accès à Vercel, Supabase ni aux prestataires. Chaque étape est
> une action humaine dans une interface externe. **Aucun déploiement en
> production sans accord explicite.**
>
> Les libellés des interfaces (Vercel, Supabase, Stripe, Flutterwave, CamerPay)
> sont donnés de mémoire et **peuvent différer légèrement** : en cas de doute,
> cherchez le mot-clé indiqué en *italique* dans la barre de recherche de
> l'interface.

## Principe : un environnement entièrement séparé

Le staging ne partage **aucune** ressource avec la production : ni base, ni
bucket, ni clé, ni secret de webhook. Les tests d'intégration vident des tables ;
un staging relié à la production détruirait de vraies données.

| Ressource | Staging | Interdit |
| --- | --- | --- |
| Vercel | **Projet Vercel séparé** (recommandé) | Réutiliser les variables du projet réel |
| Base PostgreSQL | **Projet Supabase séparé** | Pointer vers la base de production |
| Bucket `audio` | Celui du projet Supabase de staging, **privé** | Le bucket de production |
| Stripe | Mode **test** (`sk_test_…`) | Clés *live* |
| Flutterwave | Clés **test** | Clés *live* |
| CamerPay | Compte / jeton **sandbox** | Compte réel |
| Google OAuth | Client OAuth dédié (ou URI de redirection ajoutée) | — |
| E-mail | Aucune clé Resend (liens lus dans les journaux) | Envoyer à de vrais candidats |

---

## Étape 0 — Protéger la production (À FAIRE EN PREMIER) 🔧

**Pourquoi.** L'intégration GitHub de Vercel déploie automatiquement chaque
branche en « Preview » dans le projet **réel**. C'est déjà arrivé pour la
branche de cette PR. Un Preview utilise les variables d'environnement marquées
*Preview* : si elles contiennent les clés et la base de production, ce Preview
tourne contre la production avec un code dont les migrations ne sont pas
appliquées.

1. **Vercel → projet `telc-simulator-pro` → Settings → Environment Variables.**
   Pour chaque variable sensible (`DATABASE_URL`, `AUTH_SECRET`, `STRIPE_*`,
   `FLW_*`, `CAMERPAY_*`, `SUPABASE_*`, `RESEND_API_KEY`, `ELEVENLABS_API_KEY`),
   regarder la colonne des environnements : **« Preview » est-il coché avec une
   valeur de production ?** Notez la réponse.
2. Si oui, deux options (au choix) :
   - décocher *Preview* sur ces variables de production ; ou
   - **Settings → Git → Ignored Build Step** (ou *Settings → Git → Pull Request
     Comments / Deploy Hooks* selon l'interface) pour ne plus construire les
     branches `claude/*`.
3. **Vercel → Deployments** : repérer le Preview de `claude/admiring-allen-adkm5h`
   (URL de la forme `telc-simulator-pro-git-claude-adm-…vercel.app`). Ouvrir
   *… → Delete* **si** vous voulez le retirer ; ou vérifier que **Settings →
   Deployment Protection → Vercel Authentication** est actif pour les Previews
   (il exige alors une connexion Vercel pour y accéder).
4. Dites-moi ce que vous avez constaté : je ne pousse plus de commit sur la
   branche avant cette confirmation.

> Ne pas supprimer de variable de **Production**. Seul le périmètre *Preview* est concerné.

---

## Étape 1 — Supabase (projet de staging) 🔧

Interface : <https://supabase.com/dashboard>.

1. **New project** → organisation → nom `telc-staging` → **mot de passe de base de
   données** (le noter dans un gestionnaire de mots de passe) → région proche de
   votre projet réel → *Create new project*. Patienter jusqu'à la fin de l'initialisation.
2. **Récupérer les clés** : *Project Settings → API* (mot-clé : *API Keys*).
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - clé `anon` / *public* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - clé `service_role` / *secret* → `SUPABASE_SERVICE_ROLE_KEY`
     (**secrète** : à ne coller que dans Vercel, jamais dans une variable `NEXT_PUBLIC_`).
3. **Chaîne de connexion** : bouton **Connect** en haut du projet (ou *Project
   Settings → Database → Connection string*) → onglet **Session pooler**, port
   **5432** → copier l'URL, remplacer `[YOUR-PASSWORD]` par le mot de passe de
   l'étape 1. Si le mot de passe contient `@ : / ? # %`, les encoder (`%40`…).
   → `DATABASE_URL`. *(Le mode « Direct » n'est qu'IPv6 : il échoue sur Vercel.)*
4. **Créer le bucket** : *Storage → New bucket* :
   - nom exact : `audio`
   - **Public bucket : désactivé** (privé)
   - activer la limite de taille (≈ 20 Mo) et les types MIME autorisés (`audio/*`)
     si l'interface le propose (*Restrict file size* / *Restrict MIME types*).
5. **Ne créer aucune règle d'accès** (*Storage → Policies*) pour ce bucket :
   la clé de service contourne les règles, et le navigateur envoie les fichiers
   avec un jeton signé qui n'en a pas besoin. Vérifier ensuite en SQL
   (*SQL Editor → New query*) :
   ```sql
   select policyname, cmd, roles from pg_policies
   where schemaname = 'storage' and tablename = 'objects';   -- attendu : aucune ligne sur "audio"
   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'audio';
   ```
6. Notez : l'URL, les deux clés et `DATABASE_URL`. **Ne les publiez nulle part**
   (ni PR, ni discussion).

## Étape 2 — Vercel (projet de staging) 🔧

Interface : <https://vercel.com/dashboard>.

1. **Add New… → Project → Import Git Repository** → `hassandevpro/telc-simulator-pro`.
   Nom : `telc-simulator-staging`. Framework : Next.js (détecté).
2. **Avant de lancer le premier déploiement**, section *Environment Variables*
   (ou plus tard : *Settings → Environment Variables*), ajouter les variables
   ci-dessous, en cochant **Production** *et* **Preview** (ce projet n'a pas de
   « vraie » production : sa branche de production est la branche de test).

   | Variable | Valeur |
   | --- | --- |
   | `DATABASE_URL` | session pooler du **staging** (étape 1.3) |
   | `AUTH_SECRET` | nouveau secret : `openssl rand -base64 32` |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | étape 1.2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | étape 1.2 — **secrète** |
   | `AUDIO_URL_TTL_SECONDS` | `1200` (ou `300` pour tester l'expiration) |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **test** (étape 3) |
   | `FLW_SECRET_KEY`, `FLW_SECRET_HASH` | **test** (étape 3) |
   | `CAMERPAY_API_TOKEN`, `CAMERPAY_WEBHOOK_SECRET`, `CAMERPAY_API_URL` | **sandbox** (étape 3) |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | client OAuth de staging (optionnel) |
   | `CAMERPAY_WEBHOOK_TRACE` | `1` **temporairement** (staging seulement) |

   Laisser **vides** : `RESEND_API_KEY` (les liens de vérification sont alors
   écrits dans les journaux Vercel), `ELEVENLABS_API_KEY` (sauf test de génération).
3. **Settings → Git → Production Branch** : mettre `claude/admiring-allen-adkm5h`
   (ou une branche `staging` que vous créez). Ainsi le projet de staging ne se
   déploie que depuis cette branche.
4. **Settings → Deployment Protection** : activer *Vercel Authentication* (ou
   *Password Protection*) pour que le staging ne soit pas public.
5. **Ne pas** ajouter encore les webhooks : il faut d'abord l'URL du déploiement
   (étape 3). Lancer le déploiement (*Deploy*). Une variable ajoutée après un
   déploiement n'est lue qu'au **déploiement suivant** (*Deployments → … →
   Redeploy*) ; les variables `NEXT_PUBLIC_*` sont figées **au build**.
6. Noter le domaine de staging, p. ex. `https://telc-staging.vercel.app`.

## Étape 3 — Prestataires en mode test 🔧

URL de rappel de chacun = domaine de staging + chemin ci-dessous.

- **Stripe** — <https://dashboard.stripe.com> : activer le **mode test** (bascule
  en haut). *Developers → API keys* → clé secrète `sk_test_…` → `STRIPE_SECRET_KEY`.
  *Developers → Webhooks → Add endpoint* → URL `…/api/payments/stripe/webhook`,
  événement **`checkout.session.completed`** → *Signing secret* `whsec_…` →
  `STRIPE_WEBHOOK_SECRET`. Carte de test : `4242 4242 4242 4242`, date future, CVC quelconque.
- **Flutterwave** — dashboard : basculer en **Test mode**. *Settings → API* (clés
  de test) → `FLW_SECRET_KEY`. *Settings → Webhooks* : URL `…/api/payments/flutterwave/webhook`
  et un **Secret hash** de votre choix (long, aléatoire) → le même dans `FLW_SECRET_HASH`.
  **Relances automatiques : à vérifier** — les sources consultées se contredisent
  (de « 3 relances à 30 min d'intervalle » à « jusqu'à ~5 relances en 24 h »), je n'ai pas pu lire leur
  documentation officielle. Cherchez dans le tableau de bord une option de
  *retry* des webhooks ; sinon demandez-le au support Flutterwave. Notez la politique réelle.
- **CamerPay** — le mode sandbox/live dépend du **compte** : utilisez un compte
  sandbox. Jeton API → `CAMERPAY_API_TOKEN` ; clé de webhook → `CAMERPAY_WEBHOOK_SECRET`
  (identique des deux côtés) ; URL de rappel `…/api/payments/camerpay/webhook`.
  Avec `CAMERPAY_WEBHOOK_TRACE=1`, les journaux Vercel (*Logs*) montrent l'en-tête de
  signature réellement reçu : à noter, **puis supprimer la variable**.
- **Google (optionnel)** — *Google Cloud Console → APIs & Services → Credentials*
  → *Create credentials → OAuth client ID* (Web) → URI de redirection autorisée
  `…/api/auth/callback/google`.

Après avoir ajouté ces variables : **Redeploy** le projet de staging.

## Étape 4 — Base de données : migrations et copie de production 🔧

**Option simple (données vides).** Depuis un poste avec le dépôt :
```bash
DATABASE_URL='<session pooler staging>' npx prisma migrate deploy
```
Cinq migrations s'appliquent (`0_init` … `20261014090000_deferred_seat_credits`).

**Option réaliste (recommandée) : tester la migration sur une COPIE de la production.**
C'est ce qui prouve que vos données réelles sont reprises sans perte de droits.
1. 🔧 Sauvegarde de la production (Supabase → *Database → Backups*, ou `pg_dump`
   — une lecture seule de la production, à lancer par vous). Exemple :
   `pg_dump --no-owner --no-acl -n public -Fc "<url production>" > prod.dump`
2. Restaurer **dans la base de staging, avant** `migrate deploy` :
   `pg_restore --no-owner --no-acl -n public -d "<url staging>" prod.dump`
3. **Anonymiser** (staging uniquement) :
   ```sql
   update "User" set email = 'user-' || id || '@staging.test', phone = null,
          "passwordHash" = null where role <> 'SUPER_ADMIN';
   delete from "VerificationToken";
   ```
4. Lancer **l'audit en lecture seule** *avant* la migration (voir étape 5), puis
   `npx prisma migrate deploy`, puis relancer l'audit et comparer.

## Étape 5 — Contrôles automatiques

1. **Audit des droits existants** (lecture seule, sans effet) :
   ```bash
   psql "<url staging>" -f scripts/audit-entitlements.sql
   ```
   Lire les groupes `KEEP` (droits conservés), `REVIEW` (à examiner) et `INFO`.
   Détail et règle de migration : `docs/SECURITY.md` §4.
2. **Configuration du bucket** :
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… npm run check:audio
   ```
   Tous les contrôles doivent être ✔ (il tente d'écrire un fichier-sonde avec la
   clé publique ; s'il y parvient, il le supprime et échoue).

---

## Comptes et données de test

S'inscrire via `/register` (4 comptes), puis ajuster en SQL **sur le staging
uniquement** (*Supabase → SQL Editor*) :

```sql
update "User" set role = 'SUPER_ADMIN' where email = 'admin@staging.test';
update "User" set plan = 'STUDENT', "planExpiresAt" = now() + interval '10 days', credits = 3
 where email = 'student@staging.test';
update "User" set plan = 'PREMIUM', "planExpiresAt" = now() + interval '10 days', credits = 10
 where email = 'premium@staging.test';
update "User" set plan = 'STUDENT', "planExpiresAt" = now() + interval '10 days', credits = 0
 where email = 'zero@staging.test';
-- Plan SANS date (droit historique) :
update "User" set plan = 'PREMIUM', "planExpiresAt" = null, credits = 5 where email = 'sansdate@staging.test';
```

Générer un examen avec audio depuis `/admin/exams` (ou importer la démo), publier,
et téléverser un vrai fichier audio d'au moins 3 minutes sur un Teil Hören.
Les liens de vérification d'e-mail (sans Resend) sont dans *Vercel → Logs*.

---

## Checklist de tests manuels

Cochez au fur et à mesure ; notez la date, le navigateur et le compte utilisé.

### A. Transcription Hören
- [ ] Candidat, Teil Hören : **Affichage → code source**. Rechercher un mot de la
      transcription et le nom du fichier audio : **aucun résultat**. Onglet *Réseau* :
      aucune requête vers `…/storage/v1/object/public/…`.
- [ ] En admin, le script du Teil est toujours visible et modifiable.

### B. Audios privés
- [ ] `npm run check:audio` : tous ✔.
- [ ] Ouvrir l'ancienne URL publique d'un audio, déconnecté : **refus**.
- [ ] Candidat : « Wiedergabe starten » → l'audio se lit **jusqu'au bout**.
- [ ] Rafraîchir en pleine lecture : « Audio bereits abgespielt ».
- [ ] Appeler 3 fois `…/audio/hoeren/teil-1` (console réseau) : 200, 200, puis 409.
- [ ] Session d'un tiers : 404. Déconnecté : 401. Session non démarrée : 409.
- [ ] Avec `AUDIO_URL_TTL_SECONDS=300` : l'URL copiée ne marche plus après 5 min.
- [ ] Admin : téléverser deux fichiers de **même nom** → aucun n'écrase l'autre.
      Régénérer un examen avec audio → anciens fichiers intacts.
- [ ] Admin : aperçu « Anhören » OK ; compte non admin → 403.

### C. Crédits, confirmation, remboursement
- [ ] 0 crédit : la confirmation s'ouvre, le démarrage est refusé avec un message clair.
- [ ] 3 crédits : « 1 Credit… (verfügbar : 3, danach : 2) » ; « Abbrechen » ne consomme rien.
- [ ] Démarrer dans deux onglets avec 1 crédit : un seul démarre.
- [ ] Rafraîchir en plein examen : réponses et chrono conservés, pas de second débit.
- [ ] Rejouer un examen terminé : « kein Credit », solde inchangé.
- [ ] Couper le réseau en saisissant : « Speicherfehler », puis « Gespeichert ».
- [ ] Remettre la copie ; modifier une réponse ensuite → refus.
- [ ] `/admin/sessions` : rembourser **avec motif** → solde +1 ; recliquer → « bereits erstattet ».
- [ ] Étudiant de centre : le remboursement recrédite le **pool du centre**.

### D. Student / Premium
- [ ] Premium actif, `/pricing` : la carte Student explique le blocage (pas de boutons).
- [ ] API Student en console : 409 `PREMIUM_ACTIVE` sur les 3 prestataires.
- [ ] Student actif peut acheter Premium et Student. Premium expiré : Student redevient achetable.
- [ ] **Compte `sansdate` (Premium sans date)** : tout achat Student/Premium est refusé
      (`OPEN_ENDED_PLAN`) avec un message vers le support ; son plan n'est pas modifié.

### E. Sièges Centre
- [ ] Sans centre : 10 sièges → 25 000 FCFA ≈ 40 €, 30 jours ; crédits **versés tout de suite**.
- [ ] Centre avec sièges actifs : le choix *renouveler* / *ajouter* est exigé.
- [ ] *Renouveler* : prix plein, période annoncée **à partir de l'échéance** ; les crédits
      annoncés « zu Beginn der neuen Periode » ; **solde inchangé au paiement**, visible
      dans `/center` (« X Credits … werden am … gutgeschrieben »).
- [ ] Faire commencer la période (`update "CenterSeatGrant" set "startsAt" = now() - interval '1 minute' where credits > 0 and "creditedAt" is null;`) puis ouvrir le tableau de bord :
      les crédits sont versés **une seule fois** (recharger plusieurs fois).
- [ ] *Ajouter 10 sièges, 10 jours restants* : **8 333 FCFA / 13,33 €** ; sièges actifs
      maintenant, expirant à l'échéance ; crédits proportionnels versés tout de suite.
- [ ] Le montant affiché = le montant demandé par le prestataire.
- [ ] Plus d'élèves que de sièges actifs : le dernier est refusé.
- [ ] Expirer les sièges (`update "CenterSeatGrant" set "expiresAt" = now()`) : les élèves perdent l'accès.
- [ ] Centre « sans échéance » (voir H) : achat de sièges refusé avec le message du support.

### F. Paiements (modes **test** uniquement)
- [ ] Student / Premium par chaque prestataire : plan, date de fin et crédits corrects.
- [ ] Rejouer le webhook depuis le tableau de bord : 200, aucun crédit en plus.
- [ ] Flutterwave : provoquer une panne de vérification → **503** ; noter si Flutterwave **relance**.
- [ ] CamerPay sandbox : Orange Money activé ; noter l'en-tête reçu, **retirer `CAMERPAY_WEBHOOK_TRACE`**.

### G. Authentification
- [ ] Inscrire une adresse avec mot de passe sans la vérifier, puis « Mit Google » → refus
      expliqué. Après le lien de vérification → Google fonctionne.
- [ ] Rétrograder un admin en base : `/admin` et les API admin le refusent immédiatement.
- [ ] 6 inscriptions depuis la même IP en une heure → la 6e reçoit 429.

### H. Migration sur la copie de production
- [ ] Audit **avant** et **après** la migration : aucun compte `KEEP` ne perd son accès
      (comparer, pour chaque propriétaire et chaque membre, le plan effectif avant/après).
- [ ] Les comptes `A1`/`A2` (sans date) gardent leur accès ; les centres `C1`/`C2`
      (membres au-delà du quota, quota 0) gardent leurs membres.
- [ ] Les comptes `REVIEW` (`B2`, `C4`, `D1`) sont examinés un par un.
- [ ] Les Teils « non migrés » (SECURITY.md §1) sont ré-attachés à la main.
- [ ] Exécuter les `down.sql` sur une copie jetable : aucune donnée perdue.

## Critères de passage en production

À valider **par vous** avant toute demande de déploiement :

1. Toutes les cases cochées sur staging, `check:audio` ✔, audit relu et décisions prises.
2. Sauvegarde de la base de production réalisée et restaurable.
3. Politique de relance Flutterwave et contrat CamerPay **vérifiés**.
4. Fenêtre de déploiement hors examens organisés par des centres.
5. Plan de retour arrière lu (`SECURITY.md` §1).
