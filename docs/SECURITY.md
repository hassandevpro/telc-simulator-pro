# Sécurité — sprint de correction (octobre 2026)

Ce document accompagne le durcissement des sessions d'examen, des crédits, des
sièges de centre, de l'authentification et du stockage audio. Il contient ce
qui ne peut pas être vérifié depuis le dépôt : **les vérifications manuelles à
faire avant la mise en production**.

## 1. Déploiement — ordre impératif

1. **Configurer `SUPABASE_SERVICE_ROLE_KEY`** dans Vercel (Production et
   Preview). Sans elle, l'upload audio admin est désactivé : l'application ne
   retombe plus jamais sur la clé anon.
2. **Appliquer la migration** `20261011120000_security_hardening` :
   `npx prisma migrate deploy` (avec le *session pooler*, port 5432).
   Elle est **additive** : 3 colonnes, 1 table, aucune suppression.
3. **Déployer le code.**
4. **Corriger les règles du bucket `audio`** (section 2), *après* le
   déploiement : l'ancien code a besoin des règles anonymes, le nouveau non.

### Effets de la migration sur les données existantes

| Donnée | Effet |
| --- | --- |
| Sessions en cours | `creditStatus = NULL` (historique) : l'**ancien** débit à la remise leur est appliqué, une fois. Aucune n'est cassée. |
| Centres avec `seats > 0` | Une dotation de `seats` sièges valable jusqu'à `planExpiresAt` du propriétaire (ou **+30 jours** s'il n'en a pas). `Center.seats` n'est plus lu, mais il est conservé. |
| Membres de centre | `centerJoinedAt = createdAt` (ordre de priorité si les sièges actifs sont moins nombreux que les membres). |
| Comptes Google (`passwordHash` NULL et e-mail vérifié) | `emailVerifiedBy = 'GOOGLE'`. |
| Comptes à mot de passe | **Inchangés**. Ils ne peuvent lier Google qu'après avoir confirmé leur adresse par le lien e-mail. La connexion par mot de passe n'est pas affectée. |

### Navigateurs ouverts au moment du déploiement

Un onglet chargé avec l'ancien JavaScript remet la copie via l'ancien flux, que
le serveur refuse désormais (409). Le candidat voit « La correction a échoué ».
Un rechargement de la page suffit, et ses réponses sont conservées en base.
Évitez de déployer pendant une session d'examen organisée par un centre.

## 2. Supabase Storage — vérifications manuelles

Les règles d'accès (RLS) du bucket ne sont **pas** dans le dépôt. À vérifier
dans le tableau de bord Supabase → *Storage* → *Policies*, ou en SQL :

```sql
-- 1. Règles actuelles sur les objets de stockage
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects';

-- 2. Configuration du bucket
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'audio';
```

Attendu après correction :

- [ ] **Aucune** règle `INSERT`, `UPDATE` ou `DELETE` sur `storage.objects` pour
      les rôles `anon` ou `authenticated` visant le bucket `audio`. Supprimer
      celles qui existent (`drop policy "<nom>" on storage.objects;`). Le
      serveur utilise la clé de service, qui contourne RLS ; le navigateur
      envoie les fichiers avec un jeton signé, qui n'a pas besoin de règle.
- [ ] `file_size_limit` ≈ 20 Mo et `allowed_mime_types` limité à `audio/*` :
      un jeton d'upload signé ne borne ni la taille ni le type.
- [ ] Test négatif, avec la clé **anon** (celle du navigateur) :
      ```bash
      curl -X POST "$SUPABASE_URL/storage/v1/object/audio/test-anon.mp3" \
        -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
        -H "Content-Type: audio/mpeg" --data-binary @petit.mp3
      ```
      Résultat attendu : **403** (ou 400 « new row violates row-level security »).
      Refaire le test avec `x-upsert: true` sur un fichier existant : refus attendu.
- [ ] La clé `service_role` n'apparaît dans **aucune** variable `NEXT_PUBLIC_*`.
      L'application refuse d'ailleurs l'upload si `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` existe.

### Lecture des audios payants — risque non corrigé

Le bucket est **public en lecture** : l'URL d'un audio Hören d'un examen payant
n'est envoyée qu'aux candidats autorisés, mais elle reste téléchargeable par
quiconque l'obtient (partage, historique). Pour la fermer : passer le bucket
en privé, puis générer côté serveur une URL signée de courte durée lors du rendu
de `TeilPage`. Ce chantier n'est pas fait dans ce sprint.

## 3. Prestataires de paiement — vérifications manuelles

- [ ] **Flutterwave** : le webhook répond désormais **503** quand la
      vérification de la transaction est impossible (réseau, 5xx). Vérifier dans
      le tableau de bord que les nouvelles tentatives sont activées
      (*Settings → Webhooks → Retry*). Sinon, un paiement réel peut rester
      non activé.
- [ ] **Flutterwave** : `FLW_SECRET_HASH` est un secret long et aléatoire
      (≥ 32 caractères).
- [ ] **Stripe** : l'endpoint écoute `checkout.session.completed`, avec un
      `STRIPE_WEBHOOK_SECRET` propre à l'environnement.
- [ ] **CamerPay** : retirer `CAMERPAY_WEBHOOK_TRACE` de Vercel. Le bloc de
      journalisation « temporaire » existe toujours dans le webhook.
- [ ] Rejouer un webhook déjà traité depuis chaque tableau de bord : la
      réponse doit être 200, sans nouveau crédit (idempotence testée sur
      PostgreSQL réel par `tests/int-billing.test.ts`).

## 4. Décisions métier à confirmer

Les règles suivantes ont été changées **par nécessité technique**. Elles
doivent être validées par le responsable produit.

| Règle | Avant | Après | Pourquoi |
| --- | --- | --- | --- |
| Moment du débit d'un crédit | À la remise | Au **démarrage** (après le test casque) | Avec le débit à la remise, il suffisait de ne jamais remettre, ou d'ouvrir N examens avec 1 crédit. Seul un débit atomique au démarrage est inviolable. |
| Achat d'un plan inférieur pendant un plan supérieur actif | Rétrograde le plan | Le plan supérieur est conservé ; la durée achetée est convertie au prorata des prix (30 j Student = 15 j Premium) ; les crédits sont ajoutés | Ni rétrogradation, ni paiement perdu. |
| Durée du plan CENTER du propriétaire | Cumulée à chaque achat | Jusqu'à la fin des sièges achetés (sans cumul) | Les sièges sont désormais datés : cumuler la durée recréait des droits non payés. |
| Sièges | Compteur cumulatif permanent | Dotations de 30 jours | Faille n° 4 de l'audit. |
| E-mail de vérification | Envoyé seulement si la vérification est obligatoire | Envoyé à chaque inscription | C'est la seule preuve qui permette ensuite une liaison Google sûre. |

## 5. Tests

```bash
npm test                                   # unitaires ; intégration = SKIP
createdb telc_test                         # base JETABLE
DATABASE_URL=postgresql://…/telc_test npx prisma migrate deploy
TEST_DATABASE_URL=postgresql://…/telc_test npm test   # tout, en série
```

Les tests `tests/int-*.test.ts` vident la base à chaque cas : ne jamais pointer
`TEST_DATABASE_URL` vers la production (les URL Supabase/AWS sont refusées).

## 6. Risques résiduels

- **Limitation de débit en mémoire** (`src/lib/rate-limit.ts`) : sur Vercel,
  elle s'applique par instance et non globalement. Pour une limite réelle,
  brancher un stockage partagé (Upstash Redis, ou une table PostgreSQL).
- **Pas de réinitialisation de mot de passe.** Si quelqu'un a inscrit l'adresse
  d'une victime avant elle, la victime ne peut ni lier Google ni récupérer le
  compte. Un administrateur doit supprimer le compte usurpé.
- **Audios payants publics en lecture** (section 2).
- **Rôle dans le JWT** : relu en base toutes les 60 s. Les routes et pages
  d'administration relisent la base à chaque requête (révocation immédiate).
  Les autres pages suivent avec 60 s au plus de retard.
- **`src/lib/email.ts`** journalise le lien de vérification (jeton compris)
  quand `RESEND_API_KEY` est absente : jamais en production.
- **Stripe** : la ligne `Payment` est créée *après* la session Checkout. Si la
  base échoue entre les deux, un paiement peut rester sans trace. C'est rare,
  et cela existait déjà avant ce sprint.
