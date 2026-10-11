# Environnement de staging et checklist de tests manuels

> Ce document **prépare** le staging : il décrit quoi créer et quoi vérifier.
> Rien n'a été créé ni déployé depuis le dépôt (aucun accès à Vercel, Supabase ni
> aux prestataires). Chaque case 🔧 est une action humaine sur un compte externe.
> **Aucun déploiement en production sans accord explicite.**

## 1. Principe : un environnement entièrement séparé

Le staging ne partage **aucune** ressource avec la production : ni base, ni
bucket, ni clé, ni secret de webhook. Les tests d'intégration vident des tables ;
un staging relié à la production détruirait de vraies données.

| Ressource | Staging | Interdit |
| --- | --- | --- |
| Vercel | Projet ou environnement *Preview* dédié, variables propres | Réutiliser les variables *Production* |
| Base PostgreSQL | **Projet Supabase séparé**, ou copie anonymisée de la production | Pointer vers la base de production |
| Bucket `audio` | Celui du projet Supabase de staging, **privé** | Le bucket de production |
| Stripe | Mode **test** (`sk_test_…`), endpoint de webhook dédié | Clés *live* |
| Flutterwave | Clés **test**, `FLW_SECRET_HASH` dédié | Clés *live* |
| CamerPay | Compte / jeton **sandbox** | Compte réel |
| Google OAuth | URI de redirection du staging ajoutée | — |
| E-mail (Resend) | Domaine ou destinataires de test | Envoyer à de vrais candidats |

## 2. Mise en place 🔧

1. Créer le projet Supabase de staging. Noter l'URL, la clé anon, la clé
   `service_role`, et l'URL du **session pooler** (port 5432).
2. Créer le bucket `audio` **privé** (*Public bucket* décoché), avec
   `file_size_limit` ≈ 20 Mo et `allowed_mime_types = audio/*`. Ne créer **aucune**
   règle d'écriture pour `anon`/`authenticated`.
3. Appliquer les migrations sur la base de staging :
   `DATABASE_URL=… npx prisma migrate deploy`.
4. Si une copie de production sert de base de test : restaurer une sauvegarde
   dans le projet de staging **avant** `migrate deploy`, pour tester la migration
   sur des données réelles (anonymiser e-mails et téléphones).
5. Configurer les variables Vercel du staging (voir `docs/SECURITY.md` §3) :
   `DATABASE_URL`, `AUTH_SECRET` (nouveau), `AUTH_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, clés Stripe /
   Flutterwave / CamerPay **de test**, `RESEND_API_KEY` éventuel.
6. Déclarer les webhooks de test chez chaque prestataire vers le domaine de staging :
   `/api/payments/stripe/webhook`, `/api/payments/flutterwave/webhook`,
   `/api/payments/camerpay/webhook`.
7. Déployer la branche sur ce projet, puis lancer :
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… npm run check:audio
   ```
   Tous les contrôles doivent être ✔ avant de continuer.

## 3. Comptes et données de test

S'inscrire via `/register` (4 comptes), puis ajuster en SQL **sur le staging
uniquement** :

```sql
-- Administrateur
update "User" set role = 'SUPER_ADMIN' where email = 'admin@staging.test';
-- Candidat Student actif avec 3 crédits
update "User" set plan = 'STUDENT', "planExpiresAt" = now() + interval '10 days', credits = 3
 where email = 'student@staging.test';
-- Candidat Premium actif
update "User" set plan = 'PREMIUM', "planExpiresAt" = now() + interval '10 days', credits = 10
 where email = 'premium@staging.test';
-- Candidat sans crédit
update "User" set plan = 'STUDENT', "planExpiresAt" = now() + interval '10 days', credits = 0
 where email = 'zero@staging.test';
```

Générer un examen avec audio depuis `/admin/exams` (ou importer la démo), publier,
et téléverser un vrai fichier audio d'au moins 3 minutes sur un Teil Hören.

## 4. Checklist de tests manuels

Cochez au fur et à mesure ; notez la date, le navigateur et le compte utilisé.

### A. Transcription Hören
- [ ] En tant que candidat, ouvrir un Teil Hören : **Affichage → code source** de la
      page. Rechercher un mot de la transcription et le nom du fichier audio : **aucun
      résultat**. Onglet *Réseau* : aucune requête vers `…/storage/v1/object/public/…`.
- [ ] En admin, le script du Teil est toujours visible et modifiable dans l'éditeur.

### B. Audios privés
- [ ] `npm run check:audio` : tous ✔ (bucket privé, lecture / écriture / liste anonymes refusées).
- [ ] Ouvrir directement l'ancienne URL publique d'un audio dans un navigateur
      déconnecté : **refus** (et non lecture du fichier).
- [ ] Candidat : « Wiedergabe starten » → l'audio se lit **jusqu'au bout** (durée
      complète), y compris en se déplaçant dans la page.
- [ ] Rafraîchir la page en pleine lecture : « Audio bereits abgespielt », pas de relecture.
- [ ] Console navigateur (onglet *Réseau*) : relancer 3 fois l'appel `…/audio/hoeren/teil-1`
      → 200, 200, puis 409.
- [ ] Autre candidat connecté : l'appel sur la session d'un tiers → 404.
- [ ] Déconnecté : 401. Session au test casque (non démarrée) : 409.
- [ ] Attendre l'expiration (ou fixer `AUDIO_URL_TTL_SECONDS=300` sur staging) : l'URL
      signée copiée ne marche plus après son délai.
- [ ] Admin : téléverser un second fichier **de même nom** → les deux existent ; aucun
      n'est écrasé. Régénérer un examen avec audio → nouveaux fichiers, anciens intacts.
- [ ] Admin : aperçu « Anhören » d'un audio fonctionne ; compte non admin → 403.

### C. Crédits, confirmation, remboursement
- [ ] Compte à 0 crédit : après le test casque, la fenêtre de confirmation s'ouvre,
      le démarrage est refusé avec un message clair.
- [ ] Compte à 3 crédits : la fenêtre annonce « 1 Credit… (verfügbar : 3, danach : 2) »;
      « Abbrechen » ne consomme rien ; « Starten… » débite 1 (vérifier le solde).
- [ ] Démarrer dans deux onglets en même temps avec 1 crédit : un seul démarre.
- [ ] Rafraîchir en plein examen : réponses et chrono conservés, **pas** de second débit.
- [ ] Rejouer un examen déjà terminé : la fenêtre annonce « kein Credit », solde inchangé.
- [ ] Couper le réseau en saisissant : « Speicherfehler – neuer Versuch… », puis
      « Gespeichert » au retour du réseau.
- [ ] Remettre la copie ; modifier une réponse ensuite → refus.
- [ ] Admin `/admin/sessions` : rechercher le candidat → rembourser **avec motif** → solde
      +1 ; recliquer → refus « bereits erstattet ». Sans motif → refusé.
- [ ] Étudiant d'un centre : le remboursement recrédite le **pool du centre**.

### D. Student pendant Premium
- [ ] Compte Premium actif, page `/pricing` : la carte Student **explique** le blocage
      et propose « Premium verlängern » (pas de boutons de paiement).
- [ ] Appeler directement l'API Student (console / curl) : 409 `PREMIUM_ACTIVE` sur les 3 prestataires.
- [ ] Compte Student actif : peut acheter Premium (montée en gamme) et Student (prolongation).
- [ ] Compte Premium expiré : Student redevient achetable.

### E. Sièges Centre
- [ ] Compte sans centre : acheter 10 sièges → prix plein (25 000 FCFA ≈ 40 €), 30 jours.
- [ ] Centre avec sièges actifs : l'écran exige le choix *renouveler* / *ajouter* ; sans
      choix, le bouton de paiement est désactivé.
- [ ] *Renouveler* : le prix est plein et la période annoncée **commence à l'échéance** ;
      après paiement, les sièges actuels ne changent pas avant cette date.
- [ ] *Ajouter 10 sièges avec 10 jours restants* : prix annoncé = **8 333 FCFA / 13,33 €**
      (vérifier la formule sur un autre cas) ; après paiement, les nouveaux sièges sont actifs
      maintenant et expirent à la même date que la période.
- [ ] Le montant affiché à l'écran = le montant demandé par le prestataire (page de paiement).
- [ ] Faire adhérer plus d'élèves que de sièges actifs : le dernier est refusé.
- [ ] Faire expirer les sièges (`update "CenterSeatGrant" set "expiresAt" = now()`) : les
      élèves perdent l'accès via le centre.

### F. Paiements (modes **test** uniquement)
- [ ] Student / Premium par chaque prestataire : plan, date de fin et crédits corrects.
- [ ] Rejouer le webhook depuis le tableau de bord : 200, aucun crédit en plus.
- [ ] Flutterwave : provoquer une panne de vérification (clé invalide temporaire) → le webhook
      répond **503** ; vérifier que Flutterwave **relance** ensuite.
- [ ] CamerPay sandbox : paiement Orange Money activé ; relever l'en-tête reçu avec
      `CAMERPAY_WEBHOOK_TRACE=1`, puis **retirer la variable**.

### G. Authentification
- [ ] S'inscrire avec mot de passe sans vérifier l'e-mail, puis « Mit Google » sur cette
      adresse → refus avec explication. Après le lien de vérification → Google fonctionne.
- [ ] Rétrograder un admin en base : `/admin` et les API admin le refusent immédiatement.
- [ ] 6 inscriptions depuis la même IP en une heure → la 6e reçoit 429.

### H. Migration (sur une copie réelle)
- [ ] Les requêtes de contrôle de `SECURITY.md` §1 : noter les Teils « non migrés » et
      les ré-attacher.
- [ ] Les centres existants gardent leurs élèves ; une session en cours à la migration
      peut être terminée et remise.
- [ ] Exécuter les `down.sql` sur une copie jetable : aucune donnée perdue (hors journal
      des remboursements, à exporter avant).

## 5. Critères de passage en production

À valider **par vous** avant toute demande de déploiement :

1. Toutes les cases ci-dessus cochées sur staging, `check:audio` entièrement ✔.
2. Sauvegarde de la base de production réalisée et restaurable.
3. Hypothèses de `SECURITY.md` §4 confirmées (crédits au prorata, reprise des centres).
4. Fenêtre de déploiement hors examens organisés par des centres.
5. Plan de retour arrière lu (`SECURITY.md` §1).
