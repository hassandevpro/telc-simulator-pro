# Sécurité — procédures et état (octobre 2026)

Ce document couvre les deux sprints de sécurisation : sessions / crédits /
authentification (sprint 1), puis transcription Hören, audios privés et règles
commerciales (sprint 2). Il contient surtout **ce qui ne peut pas être vérifié
depuis le dépôt** : les actions à faire sur Supabase, Vercel et chez les
prestataires de paiement.

> **Convention de lecture.** ✅ = vérifié par du code et des tests dans ce
> dépôt. 🔧 = action humaine sur un compte externe, **non vérifiable d'ici**.
> Les tests simulent Supabase et les prestataires : ils prouvent ce que
> *notre serveur* décide, jamais la configuration de vos comptes.

Documents liés : [`STAGING.md`](./STAGING.md) (environnement de test et checklist
de tests manuels).

---

## 1. Ordre de déploiement (staging d'abord, puis production)

Les étapes 1 à 4 se font sur **staging** et sont répétées à l'identique en
production après validation. Rien n'est déployé en production sans accord explicite.

1. 🔧 **Variables d'environnement** (section 5) : ajouter `SUPABASE_SERVICE_ROLE_KEY`
   (et, si besoin, `AUDIO_URL_TTL_SECONDS`).
2. 🔧 **Sauvegarde de la base** avant toute migration (point-in-time recovery
   Supabase ou `pg_dump`).
3. 🔧 **Migrations** : `npx prisma migrate deploy` (*session pooler*, port 5432).
   Trois migrations **additives**, dans l'ordre :

   | Migration | Ajoute | Retour arrière |
   | --- | --- | --- |
   | `20261011120000_security_hardening` | `creditStatus`, `emailVerifiedBy`, `centerJoinedAt`, table `CenterSeatGrant` | non fournie (voir note) |
   | `20261012090000_private_audio` | `ExamPart.audioPath`, `ExamSession.audioIssued` | `down.sql` ✅ testé |
   | `20261013090000_commercial_rules` | `Payment.centerMode/periodDays`, `ExamSession.creditAccountId`, table `CreditAdjustment` | `down.sql` ✅ testé |

   *Note (migration 1)* : elle ne supprime ni ne modifie rien ; ses colonnes
   peuvent rester sans effet si l'on revient à l'ancien code. Seule la reprise
   des sièges (`CenterSeatGrant`) est une conversion de données (section 4).
4. **Déployer le code.**
5. 🔧 **Rendre le bucket `audio` privé** (section 2) — **après** le déploiement :
   le nouveau code fonctionne bucket public *ou* privé ; l'ancien code ne
   fonctionne qu'en public.
6. 🔧 Lancer `npm run check:audio` (section 2.4) puis la checklist de `STAGING.md`.

### Effets de la migration sur les données existantes ✅ (testés sur base temporaire)

| Donnée | Effet |
| --- | --- |
| Sessions en cours | `creditStatus = NULL` (historique) : l'ancien débit à la remise leur est appliqué une fois. |
| Centres avec `seats > 0` | Une dotation valable jusqu'à `planExpiresAt` du propriétaire (ou +30 jours s'il n'en a pas). `Center.seats` n'est plus lu mais conservé. |
| Membres de centre | `centerJoinedAt = createdAt` (priorité si les sièges actifs sont moins nombreux que les membres). |
| Comptes Google | `emailVerifiedBy = 'GOOGLE'`. Les comptes à mot de passe restent à prouver, sans autre modification. |
| `ExamPart.audioUrl` | **Jamais modifié.** `audioPath` en est extrait quand l'URL est celle du bucket `audio` avec un nom sûr. Les autres lignes (démo `/audio/demo/…`, URL externes, sous-dossiers) gardent `audioPath = NULL`. |
| Paiements en attente | `centerMode = NULL` : traités comme avant (30 jours à partir de l'activation). |
| Fichiers du bucket | **Aucun fichier n'est déplacé, copié ni supprimé.** |

Requêtes de contrôle après la migration audio :

```sql
-- Teils dont l'audio n'a pas pu être converti en chemin (à ré-attacher à la main)
select e.title, p."sectionId", p."partId", p."audioUrl"
from "ExamPart" p join "Exam" e on e.id = p."examId"
where p."audioUrl" is not null and p."audioPath" is null
  and p."audioUrl" not like '/%';                -- hors chemins statiques de la démo
-- Répartition
select count(*) filter (where "audioPath" is not null) as migres,
       count(*) filter (where "audioPath" is null and "audioUrl" is not null) as non_migres
from "ExamPart";
```

### Retour arrière complet

1. Remettre l'ancien code. 2. Rendre le bucket `audio` de nouveau **public** (sinon
l'ancien code ne lit plus rien). 3. Exécuter les `down.sql` dans l'ordre inverse :

```bash
psql "$DATABASE_URL" -f prisma/migrations/20261013090000_commercial_rules/down.sql
psql "$DATABASE_URL" -v supabase_url='https://xxxx.supabase.co' \
     -f prisma/migrations/20261012090000_private_audio/down.sql
```

`private_audio/down.sql` reconstruit l'URL publique des audios rattachés *après*
la migration. `commercial_rules/down.sql` **supprime le journal des
remboursements** : l'exporter d'abord (commande en tête du fichier). Les crédits
déjà recrédités restent sur les comptes.

---

## 2. Supabase Storage 🔧 (bucket `audio`)

### 2.1 Ce qui est vérifié dans le code ✅

- Le client Storage serveur utilise `SUPABASE_SERVICE_ROLE_KEY`
  (`src/lib/storage-credentials.ts`). L'application **refuse** de l'utiliser si
  cette clé est égale à la clé anon ou si `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
  existe. Il n'y a **aucun repli sur la clé anon**.
- `service_role` n'apparaît dans aucune variable `NEXT_PUBLIC_*`, et le build de
  production avec des valeurs secrètes factices n'en laisse **aucune
  occurrence** dans `.next/static` (vérifié).
- Jetons d'upload : à usage unique, un seul chemin, **nom unique**, `upsert:false`.
  Uploads serveur et génération ElevenLabs : même règle. Aucune route n'écrit
  avec `upsert:true`.
- Seuls les administrateurs (rôle relu **en base**) peuvent téléverser, rattacher
  ou écouter en aperçu. Rattacher un audio exige un **chemin sûr** (une composante,
  `[A-Za-z0-9._-]`) ; toute URL http(s) est refusée.

### 2.2 Rendre le bucket privé 🔧

Dashboard Supabase → *Storage* → bucket `audio` → *Edit bucket* → décocher
**Public bucket**. Équivalent SQL :

```sql
update storage.buckets set public = false where id = 'audio';
```

Les fichiers existants **restent en place** ; seule leur accessibilité par URL
publique disparaît. Pour revenir en arrière : `set public = true`.

### 2.3 Règles d'accès (RLS) 🔧

Je n'ai pas accès à votre projet : **lisez l'état réel** avant d'agir.

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects';
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'audio';
```

Attendu : **aucune** règle `INSERT`, `UPDATE`, `DELETE` ni `SELECT` visant le
bucket `audio` pour `anon` ou `authenticated` (la clé de service contourne RLS ;
le navigateur n'envoie un fichier qu'avec un jeton signé, qui n'a pas besoin de
règle). Supprimer les règles existantes : `drop policy "<nom>" on storage.objects;`
— *après* le déploiement. Fixer aussi sur le bucket `file_size_limit` (≈ 20 Mo) et
`allowed_mime_types` (`audio/*`) : un jeton signé ne borne ni la taille ni le type.

### 2.4 Contrôle automatique 🔧 → `npm run check:audio`

```bash
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
  npm run check:audio
```

Lecture seule, sauf une sonde : il tente **d'écrire un fichier `__write-probe-…`
avec la clé anon** ; s'il y parvient (mauvaise configuration), il le supprime
aussitôt et échoue. Il vérifie : bucket privé, lecture anonyme d'un fichier
existant refusée, écriture et liste anonymes refusées, limites de taille/type.
Code de sortie ≠ 0 au moindre échec. **À lancer contre staging d'abord.**
(Le code du contrôle est testé contre un faux serveur ; son résultat sur *votre*
projet ne peut venir que de vous.)

### 2.5 Accès des candidats aux audios payants ✅ (logique) / 🔧 (stockage)

Le candidat ne reçoit **aucun** emplacement de fichier : la page porte seulement
`hasAudio`. Au clic sur « Wiedergabe starten », le navigateur appelle
`POST /api/sessions/{id}/audio/{section}/{teil}`, que le serveur n'accorde que si :
identité ✔, session **possédée** ✔, épreuve **en cours** et dans son temps ✔,
audio **non déjà écouté** ✔, **au plus 2 émissions** ✔ (réservation atomique en
SQL, rendue si la signature échoue). Il renvoie une **URL signée de 20 minutes**
(`AUDIO_URL_TTL_SECONDS`, bornée 5 min – 1 h), qui couvre toute l'écoute y
compris les requêtes HTTP partielles (testé de bout en bout avec `Range`).

> **Limites techniques — à ne pas ignorer.**
> - Une URL signée reste utilisable par **quiconque la possède** jusqu'à son
>   expiration (20 min par défaut). Elle n'est liée ni à un compte ni à une IP.
> - Un audio entendu peut être **enregistré** (capture du son, ou téléchargement
>   de l'URL pendant sa validité). Aucun mécanisme web ne l'empêche.
> - « Une seule écoute » est une **règle d'interface** (le lecteur n'offre ni
>   pause ni retour). Le serveur l'appuie par la limite de 2 émissions et par le
>   refus après l'événement `play` signalé par le navigateur, mais **il ne peut pas
>   empêcher** de rejouer un fichier déjà téléchargé. Un client modifié peut
>   aussi ne jamais signaler `play` et obtenir 2 URL.
> - Une piste plus longue que la validité de l'URL (> ~18 min) serait coupée :
>   augmenter `AUDIO_URL_TTL_SECONDS` dans ce cas.
> - La **démo gratuite** (`/audio/demo/*.wav`) est servie par l'application,
>   publique par nature (examen gratuit).
> - Une fois le bucket privé, une URL publique ne fonctionne plus ; mais tant que
>   le bucket reste public (étape 5 non faite), les audios restent lisibles par
>   leur ancienne URL — **le correctif n'est complet qu'après l'étape 2.2**.

---

## 3. Vercel 🔧

Variables par environnement (*Settings → Environment Variables*). **Production,
Preview et Development ont chacune leurs propres valeurs** ; ne jamais réutiliser
les clés de production en Preview.

| Variable | Rôle | Exposée au navigateur ? |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage côté serveur — **nouvelle, obligatoire** | **Non** — ne jamais préfixer par `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Envoi d'un fichier avec un jeton signé | Oui (publiques par nature) |
| `AUDIO_URL_TTL_SECONDS` | Validité des URL signées (défaut 1200) | Non |
| `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_*`, `RESEND_API_KEY` | Inchangées | Non |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Inchangées | Non |
| `FLW_SECRET_KEY`, `FLW_SECRET_HASH` | Inchangées | Non |
| `CAMERPAY_API_TOKEN`, `CAMERPAY_WEBHOOK_SECRET` | Inchangées | Non |
| `CAMERPAY_WEBHOOK_TRACE` | **À supprimer** après validation sandbox | — |
| `EMAIL_VERIFICATION_REQUIRED` | Voir section 6 | Non |

Procédure : ajouter la variable → *Redeploy* (une variable n'est lue qu'au
déploiement suivant) → vérifier avec `npm run check:audio` contre cet environnement.
Les variables `NEXT_PUBLIC_*` sont **figées au build** : les modifier exige un
nouveau build, pas seulement un redémarrage.

---

## 4. Règles commerciales validées ✅ (comportement testé)

| Règle | Comportement |
| --- | --- |
| **Crédit** | Débité atomiquement au **démarrage effectif** (après le test casque). Une confirmation explicite l'annonce avant de lancer l'épreuve (« 1 Credit wird verbraucht », solde avant/après ; « aucun crédit » pour un rejeu). Rejouer un examen déjà terminé est gratuit. |
| **Remboursement** | **Manuel**, par un administrateur, jamais automatique (le contenu est visible dès le démarrage). `/admin/sessions` : recherche par e-mail, motif obligatoire, **une fois par session** même sous clics simultanés, journalisé (`CreditAdjustment`). Le compte réellement débité est recrédité (pool du centre pour un étudiant de centre). Une session encore ouverte est fermée. |
| **Student pendant Premium actif** | **Refusé** (409 `PREMIUM_ACTIVE`) sur Stripe, Flutterwave et CamerPay ; la page tarifs l'explique et propose de renouveler Premium. *Filet* : un paiement Student ouvert avant l'achat Premium et réglé après ne rétrograde jamais — le plan Premium est conservé et la valeur payée convertie au prorata des prix (30 j Student = 15 j Premium). |
| **Centre — nouveau** | Aucun siège actif : N sièges, 30 jours à partir de l'activation, prix plein. |
| **Centre — renouvellement** | Sièges actifs, choix « renouveler » : 30 jours qui **commencent à la fin de la dernière période payée**, prix plein. Les renouvellements anticipés s'enchaînent, sans chevauchement (même payés simultanément). |
| **Centre — sièges en plus** | Choix « ajouter » : sièges actifs **maintenant** jusqu'à l'échéance de la période en cours, **au prorata** : `siège × prix × jours restants / 30`, tout jour entamé dû, minimum 1 jour, XAF arrondi au franc, EUR au centime. Exemple : 10 sièges, 10 jours restants → 8 333 FCFA / 13,33 €. |
| **Choix obligatoire** | Tant que des sièges sont actifs, le serveur refuse de deviner entre renouveler et ajouter (409 `CENTER_MODE_REQUIRED`). Le montant ne vient jamais du navigateur ; `/api/center/quote` affiche exactement ce qui sera facturé. |

### Hypothèses à confirmer (non précisées dans les décisions)

- **Crédits d'un ajout au prorata** : proportionnels aux jours payés
  (`15 × sièges × jours / 30`, arrondi). Les crédits d'un renouvellement sont
  versés **au paiement** (comme avant), pas au début de la période.
- **Reprise des centres existants** : leur quota devient une dotation valable
  jusqu'à la fin de l'abonnement du propriétaire (ou +30 jours sans date) : aucun
  centre ne perd d'accès à la migration.
- **Un rejeu gratuit remboursé** n'est pas possible (aucun débit à rendre) ; en
  revanche un examen remboursé puis remis compte ensuite comme « déjà fait ».

---

## 5. Prestataires de paiement 🔧

### Dans le code ✅

| | Vérifié |
| --- | --- |
| **Stripe** | Signature vérifiée sur le corps brut ; activation idempotente ; montant du Centre calculé côté serveur (une ligne, `unit_amount` = devis). |
| **Flutterwave** | `verif-hash` comparé à temps constant ; transaction relue chez Flutterwave (montant ≥ dû, devise) ; **503 si la vérification est impossible** (réseau, 5xx, 429, délai 15 s) ; 401 si le hash est faux. |
| **CamerPay** | Signature HMAC `uuid\|invoice_id\|status\|amount` à temps constant ; relecture du statut chez CamerPay ; 503 si CamerPay est injoignable ; idempotence. |
| **Tous** | Activation sous `UPDATE` conditionnel : 6 webhooks simultanés = 1 seul octroi (testé sur PostgreSQL réel). Le plan, les crédits et les sièges ne sont accordés que par un webhook vérifié, jamais par le retour navigateur. |

### Sur vos comptes 🔧 — non vérifiable depuis le dépôt

- [ ] **Flutterwave** : les **nouvelles tentatives de webhook sont activées**
      (*Settings → Webhooks → Retry*). Sans elles, un 503 ne sera jamais rejoué et
      un paiement réel peut rester non activé. *Je ne connais pas avec certitude
      leur politique de relance : à vérifier dans leur documentation/tableau de bord.*
- [ ] **Flutterwave** : `FLW_SECRET_HASH` long (≥ 32 caractères aléatoires), identique
      dans le tableau de bord et dans Vercel ; clés *live* distinctes des clés *test*.
- [ ] **Stripe** : l'endpoint écoute `checkout.session.completed` ; `STRIPE_WEBHOOK_SECRET`
      propre à l'environnement (staging ≠ production).
- [ ] **CamerPay** : confirmer en **sandbox** l'en-tête de signature réellement envoyé
      (le code attend `x-camerpay-signature`), la composition de la signature et les
      noms de champs — activer temporairement `CAMERPAY_WEBHOOK_TRACE=1`, lire les
      journaux, **puis supprimer la variable**. Le bloc de journalisation « temporaire »
      est toujours dans `camerpay/webhook/route.ts` (il ne journalise ni secret ni
      signature, seulement leur forme). Seul Orange Money est branché : l'identifiant
      API de MTN MoMo n'est pas confirmé.
- [ ] **CamerPay** : l'URL de rappel déclarée est `https://VOTRE-DOMAINE/api/payments/camerpay/webhook`
      et le secret est **identique des deux côtés** (sinon tout webhook est rejeté en 401).
- [ ] **Tous** : rejouer un webhook déjà traité depuis chaque tableau de bord → réponse
      200 et **aucun** crédit supplémentaire.

---

## 6. Authentification ✅

- Liaison Google : refusée pour un compte à mot de passe dont l'adresse n'a pas été
  prouvée **par lien** (`emailVerifiedBy`). Aucun compte n'est modifié ni fusionné.
- L'inscription n'est plus « vérifiée d'office » ; le lien est envoyé dans tous les cas.
- Rôles : relus en base à chaque appel admin ; JWT rafraîchi toutes les 60 s et
  invalidé si le compte est supprimé. Limitation de débit : connexion, inscription.
- `EMAIL_VERIFICATION_REQUIRED="true"` rend la vérification obligatoire à la
  connexion (non activé par défaut).

---

## 7. Tests

```bash
npm test                                   # unitaires ; intégration = SKIP (affiché)
createdb telc_test                         # base JETABLE
DATABASE_URL=postgresql://…/telc_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://…/telc_test npm test   # tout, en série
```

Les `tests/int-*.test.ts` **vident la base de test** à chaque cas : ne jamais
pointer `TEST_DATABASE_URL` vers une base réelle (les URL Supabase/AWS sont refusées).

| Fichier | Couvre |
| --- | --- |
| `candidate-content`, `int-content-leak` | transcription / emplacement audio / corrigé absents de **tout** ce que reçoit un candidat (service, arbre de composants des pages, routes API) |
| `int-audio-access`, `audio-path`, `audio-storage`, `supabase-audio-check` | autorisations audio, état de l'épreuve, limite d'émissions sous 20 requêtes simultanées, administration, `upsert:false` |
| `int-sessions` | crédits, démarrage simultané, remise, immutabilité, échéance serveur, propriété |
| `int-commercial`, `center-pricing` | Student/Premium, nouveau/renouvellement/ajout, prorata, enchaînement simultané, remboursement unique |
| `int-billing`, `idempotence-paiement`, `webhooks-regression`, `camerpay-webhook` | idempotence des paiements, webhooks |
| `int-auth`, `security-units` | liaison Google, rôles révoqués, autosave récupérable, limitation de débit |
| `int-migrations` | les 3 migrations sur base temporaire (données d'avant, après, retour arrière) |

Les contrôles clés ont été **validés par mutation** : en réintroduisant l'ancien
défaut (limite d'émissions retirée, verrou du centre retiré, prorata supprimé,
blocage Student retiré, `upsert:true`, projection candidat désactivée), les tests
échouent. **Non couvert indépendamment** : la condition `status = 'IN_PROGRESS'`
dans le SQL de réservation d'une émission audio double un contrôle JavaScript
antérieur ; elle ne protège que d'une course (session fermée entre les deux), non
reproductible de façon déterministe.

---

## 8. Risques résiduels

1. **Audios** : URL signée partageable pendant sa validité ; audio enregistrable ;
   « une écoute » non imposable techniquement (section 2.5).
2. **Bucket encore public** tant que la section 2.2 n'est pas faite : le correctif
   audio n'est complet qu'ensuite. Ne rien conclure avant d'avoir lancé `check:audio`.
3. **Limitation de débit en mémoire** (`src/lib/rate-limit.ts`) : par instance
   serverless, non globale. Pour une limite réelle, brancher un stockage partagé.
4. **Pas de réinitialisation de mot de passe** : la victime d'une adresse usurpée ne
   peut pas récupérer son compte seule ; un administrateur doit le supprimer.
5. **Paiements** : relances Flutterwave, contrat CamerPay et secrets de webhook non
   vérifiables ici (section 5).
6. **Onglets ouverts pendant le déploiement** : un candidat avec l'ancien JavaScript
   verra un échec à la remise jusqu'au rechargement (réponses conservées en base).
   Ne pas déployer pendant un examen organisé par un centre.
7. **`src/lib/email.ts`** journalise le lien de vérification (jeton compris) quand
   `RESEND_API_KEY` est absente : jamais en production.
8. **Stripe** : la ligne `Payment` est créée *après* la session Checkout. Si la base
   échoue entre les deux, un paiement peut rester sans trace (rare, antérieur à ces
   sprints).
9. **Paiements historiques à plusieurs sièges** et autres **données de production
   réelles** n'ont été testés que sur des jeux de données simulés : valider la
   migration sur une **copie** de la base de production.
