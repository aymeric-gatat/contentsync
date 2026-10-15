# ContentSync

> Rédigez une fois, publiez partout.

ContentSync est un SaaS pour les équipes marketing : vous rédigez un **Post Maître**, Claude (Anthropic) l'adapte automatiquement au format, au ton et aux limites de chaque réseau (LinkedIn, X, Blog), puis vous planifiez les publications depuis un calendrier.

| Fonctionnalité | Statut |
| --- | --- |
| Connexion Google | ✅ Disponible |
| Éditeur de Post Maître + génération IA des variantes | ✅ Disponible |
| Édition des variantes avec compteur de caractères par réseau | ✅ Disponible |
| Paramètres du compte : profil et clé API Anthropic personnelle (chiffrée) | ✅ Disponible |
| File d'attente et publication planifiée (BullMQ + Redis) | 🚧 Étape 3 |
| Calendrier drag & drop | 🚧 Étape 4 |
| Connexion des comptes LinkedIn / X et publication réelle | 🚧 Étape 5 |

---

## Sommaire

1. [Stack technique](#stack-technique)
2. [Prérequis](#prérequis)
3. [Installation pas à pas](#installation-pas-à-pas)
4. [Premier lancement](#premier-lancement)
5. [Utilisation](#utilisation)
6. [Commandes utiles](#commandes-utiles)
7. [Variables d'environnement](#variables-denvironnement)
8. [Structure du projet](#structure-du-projet)
9. [Dépannage](#dépannage)
10. [Déploiement](#déploiement)
11. [Contribuer](#contribuer)

---

## Stack technique

| Domaine | Choix |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components, TypeScript strict) |
| UI | [Tailwind CSS v4](https://tailwindcss.com) + [daisyUI 5](https://daisyui.com) (thèmes `corporate` / `business`) |
| Base de données | PostgreSQL 17 + [Prisma 7](https://www.prisma.io) |
| Authentification | [Auth.js v5](https://authjs.dev) (Google, sessions JWT) |
| IA | [`@anthropic-ai/sdk`](https://github.com/anthropics/anthropic-sdk-typescript) — modèle `claude-opus-5-5` par défaut |
| File d'attente | Redis 7 + BullMQ *(étape 3)* |
| Validation / tests | Zod 4 · Vitest |

---

## Prérequis

Installez ces outils avant de commencer :

| Outil | Version | Vérification |
| --- | --- | --- |
| [Node.js](https://nodejs.org) | 22 ou plus | `node -v` |
| npm | 10 ou plus (fourni avec Node) | `npm -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | récent, **démarré** | `docker compose version` |
| [Git](https://git-scm.com) | récent | `git --version` |

Vous aurez aussi besoin de :

- un **compte Google** (pour créer les identifiants OAuth de connexion) ;
- un **compte Anthropic** avec des crédits (pour la génération IA).

---

## Installation pas à pas

### 1. Cloner le projet et installer les dépendances

```bash
git clone https://github.com/aymeric-gatat/contentsync.git
cd contentsync
npm install
```

`npm install` génère aussi le client Prisma (script `postinstall`).

### 2. Créer le fichier `.env`

Copiez le modèle :

```bash
cp .env.example .env
```

> Sous PowerShell : `Copy-Item .env.example .env`

Le fichier `.env` contient vos secrets : il est ignoré par git. **Ne mettez jamais de vraie clé dans `.env.example`**, qui lui est versionné.

### 3. Générer les secrets locaux

Lancez cette commande **deux fois** et collez chaque résultat dans `.env` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- le premier résultat dans `AUTH_SECRET` (signature des sessions) ;
- le second dans `ENCRYPTION_KEY` (chiffrement des clés API des utilisateurs et des jetons des réseaux sociaux).

> ⚠️ Ne changez plus `ENCRYPTION_KEY` une fois l'application utilisée : les clés déjà enregistrées deviendraient illisibles et chaque utilisateur devrait ressaisir la sienne.

### 4. Configurer la connexion Google

1. Ouvrez la [Google Cloud Console](https://console.cloud.google.com/) et créez un projet (par exemple « ContentSync dev »).
2. Dans **API et services → Écran de consentement OAuth** (ou **Google Auth Platform**) :
   - type d'utilisateur : **Externe** ;
   - renseignez le nom de l'application et votre e-mail ;
   - dans **Utilisateurs test**, ajoutez les adresses Gmail qui pourront se connecter.
3. Dans **API et services → Identifiants → Créer des identifiants → ID client OAuth** :
   - type d'application : **Application Web** ;
   - origine JavaScript autorisée : `http://localhost:3000` ;
   - URI de redirection autorisée : `http://localhost:3000/api/auth/callback/google`.
4. Copiez l'**ID client** et le **code secret** dans `.env` :

```env
AUTH_GOOGLE_ID="xxxxxxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxxxxxx"
```

### 5. Configurer l'IA (Anthropic)

1. Connectez-vous sur [platform.claude.com](https://platform.claude.com).
2. Dans **Billing**, ajoutez des crédits (les appels échouent sans crédit).
3. Dans **API Keys** ([lien direct](https://platform.claude.com/settings/keys)), cliquez sur **Create Key**.
4. Collez la clé dans `.env` :

```env
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-opus-5-5"
```

> Coût indicatif : une génération pour 3 réseaux consomme quelques milliers de tokens, soit environ 1 à 5 centimes avec Claude Opus 5.5. Pour réduire le coût, utilisez `ANTHROPIC_MODEL="claude-sonnet-5-5"`.

### 6. Démarrer PostgreSQL et Redis

Docker Desktop doit être lancé.

```bash
docker compose up -d
```

Vérifiez que les deux conteneurs sont `Up` :

```bash
docker compose ps
```

### 7. Créer les tables de la base de données

```bash
npx prisma migrate dev
```

---

## Premier lancement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) : vous êtes redirigé vers la page de connexion. Cliquez sur **Se connecter avec Google** avec une adresse ajoutée aux utilisateurs test.

✅ **Check-list si tout fonctionne :**

- [ ] la page d'accueil affiche « Bonjour *votre nom* » ;
- [ ] **Nouveau post** ouvre l'éditeur ;
- [ ] la génération produit une variante par réseau coché.

En cas de problème, consultez la section [Dépannage](#dépannage).

---

## Utilisation

### Créer un post

1. Cliquez sur **Nouveau post**.
2. Donnez un **titre interne** (facultatif, visible uniquement par vous).
3. Rédigez votre **Post Maître** : le message de fond, sans vous soucier du format.
4. Cochez les **plateformes** cibles : LinkedIn, X, Blog.
5. Cliquez sur **Enregistrer et générer les variantes**. La génération prend de quelques secondes à une trentaine de secondes.

Le Post Maître est **toujours enregistré avant l'appel à l'IA** : si la génération échoue, votre texte n'est pas perdu et vous pouvez relancer.

### Retoucher les variantes

Chaque variante est éditable dans sa carte :

| Réseau | Limite | Format généré |
| --- | --- | --- |
| LinkedIn | 3 000 caractères | accroche, paragraphes courts, 3 à 5 hashtags |
| X | 280 caractères | message percutant, 1 à 2 hashtags |
| Blog | aucune | article Markdown structuré (titres, intro, conclusion) |

- le compteur passe au **rouge** au-delà de la limite et l'enregistrement est bloqué ;
- le badge indique le statut : **Brouillon**, **Planifié**, **Publié**, **Échec** ;
- une variante publiée n'est plus modifiable.

### Régénérer

Modifiez le Post Maître puis cliquez à nouveau sur **Enregistrer et générer les variantes**. Seuls les **brouillons** des réseaux cochés sont remplacés : une variante planifiée ou publiée n'est jamais écrasée.

### Gérer son compte

Cliquez sur **Paramètres** dans la barre de navigation.

- **Profil** : modifiez le nom affiché. L'e-mail est celui de votre compte Google et n'est pas modifiable.
- **Clé API Anthropic** : chaque utilisateur peut enregistrer **sa propre clé**, utilisée pour ses générations à la place de celle du serveur.
  1. collez une clé `sk-ant-...` puis cliquez sur **Vérifier et enregistrer** ;
  2. la clé est vérifiée auprès d'Anthropic avant d'être enregistrée (une clé refusée n'est jamais stockée) ;
  3. elle est stockée **chiffrée** (AES-256-GCM) et n'est jamais renvoyée au navigateur : seuls ses 4 derniers caractères sont affichés ;
  4. **Supprimer ma clé** revient à la clé du serveur (`ANTHROPIC_API_KEY`), si elle est configurée.
- **Session** : bouton **Se déconnecter**.

### Personnaliser le comportement de l'IA

| Je veux… | Où agir |
| --- | --- |
| changer de modèle | `ANTHROPIC_MODEL` dans `.env` (redémarrer `npm run dev`) |
| une génération plus rapide ou plus soignée | `effort` dans [`src/lib/ai/adapt.ts`](src/lib/ai/adapt.ts) : `low`, `medium`, `high` |
| modifier le ton ou les consignes par réseau | créer `src/lib/ai/prompts/adapt-post.v2.ts` (copie de la v1), puis changer l'import dans [`prompts/index.ts`](src/lib/ai/prompts/index.ts) |
| changer une limite de caractères | [`src/lib/platforms.ts`](src/lib/platforms.ts) |

> Une version de prompt déjà utilisée ne doit jamais être modifiée : chaque variante enregistre la version qui l'a produite (`adapt-post@v1`).

### Changer le thème visuel

Dans [`src/app/globals.css`](src/app/globals.css), remplacez les noms de thèmes daisyUI (liste sur [daisyui.com/docs/themes](https://daisyui.com/docs/themes/)) :

```css
@plugin "daisyui" {
  themes: corporate --default, business --prefersdark;
}
```

---

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement sur <http://localhost:3000> |
| `npm run build` | build de production |
| `npm start` | lance le build de production |
| `npm run lint` | analyse ESLint |
| `npm run typecheck` | vérification TypeScript |
| `npm test` | tests unitaires (Vitest) |
| `docker compose up -d` | démarre PostgreSQL et Redis |
| `docker compose down` | arrête les conteneurs (les données sont conservées) |
| `npx prisma migrate dev --name <nom>` | crée et applique une migration après modification de `prisma/schema.prisma` |
| `npx prisma generate` | régénère le client Prisma |
| `npx prisma studio` | interface web pour explorer la base de données |

---

## Variables d'environnement

Toutes les variables sont validées au démarrage dans [`src/lib/env.ts`](src/lib/env.ts) : une variable manquante ou invalide arrête l'application avec un message explicite.

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `DATABASE_URL` | oui | connexion PostgreSQL (la valeur de `.env.example` correspond à Docker) |
| `REDIS_URL` | étape 3 | connexion Redis |
| `AUTH_SECRET` | oui | secret de signature des sessions (32 octets aléatoires en base64) |
| `AUTH_GOOGLE_ID` | oui | ID client OAuth Google |
| `AUTH_GOOGLE_SECRET` | oui | code secret OAuth Google |
| `AUTH_URL` | en production | URL publique de l'application, par exemple `https://app.exemple.com` |
| `ANTHROPIC_API_KEY` | non | clé API Anthropic du serveur, utilisée pour les utilisateurs sans clé personnelle |
| `ANTHROPIC_MODEL` | non | modèle Claude (défaut : `claude-opus-5-5`) |
| `ENCRYPTION_KEY` | oui | clé de chiffrement des clés API utilisateurs et des jetons des réseaux (32 octets en base64, ne plus la changer ensuite) |

---

## Structure du projet

```
contentsync/
├── prisma/
│   ├── schema.prisma          # modèle de données
│   └── migrations/            # historique des migrations SQL
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # page de connexion
│   │   ├── (dashboard)/       # pages protégées : accueil, éditeur, paramètres
│   │   └── api/auth/          # routes Auth.js
│   ├── components/
│   │   ├── composer/          # formulaire du Post Maître, cartes de variantes
│   │   └── account/           # formulaires de profil et de clé API
│   ├── lib/
│   │   ├── ai/                # appel à Claude et prompts versionnés
│   │   ├── auth.ts            # configuration Auth.js + requireUser()
│   │   ├── crypto.ts          # chiffrement AES-256-GCM des secrets stockés
│   │   ├── db.ts              # client Prisma
│   │   ├── env.ts             # validation des variables d'environnement
│   │   └── platforms.ts       # réseaux et limites de caractères
│   ├── server/                # Server Actions (posts, compte)
│   └── generated/prisma/      # client Prisma généré (non versionné)
├── docker-compose.yml         # PostgreSQL + Redis
├── CLAUDE.md                  # conventions et règles d'architecture détaillées
└── .env.example               # modèle de configuration
```

### Modèle de données

```
User ──< MasterPost ──< Post (une variante par plateforme) ──< ScheduledTask
  └──< Channel (compte réseau connecté) ──< Post
```

- **MasterPost** : le contenu source rédigé par l'utilisateur.
- **Post** : la variante adaptée pour une plateforme, avec son statut (`DRAFT` → `SCHEDULED` → `PUBLISHED`).
- **Channel** : un compte LinkedIn, X ou un webhook de blog, choisi au moment de planifier.
- **ScheduledTask** : une tentative de publication (un job BullMQ), avec l'historique des erreurs.

Les règles d'architecture (isolation des connecteurs, workers idempotents, prompts versionnés) sont détaillées dans [`CLAUDE.md`](CLAUDE.md).

---

## Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `ZodError` au démarrage mentionnant une variable | variable manquante dans `.env` | complétez `.env` (voir [Variables d'environnement](#variables-denvironnement)) puis relancez `npm run dev` |
| `Can't reach database server at localhost:5432` | conteneurs arrêtés | lancez Docker Desktop puis `docker compose up -d` |
| `port is already allocated` au `docker compose up` | un autre PostgreSQL ou Redis tourne déjà | arrêtez le service local, ou changez le port dans `docker-compose.yml` **et** dans `.env` |
| `Cannot find module '@/generated/prisma/client'` | client Prisma non généré | `npx prisma generate` |
| Google : `redirect_uri_mismatch` | URI de redirection incorrecte | ajoutez exactement `http://localhost:3000/api/auth/callback/google` dans la console Google |
| Google : « Accès bloqué » / `access_denied` | adresse absente des utilisateurs test | ajoutez-la dans l'écran de consentement OAuth |
| « Clé API Anthropic invalide ou manquante » | aucune clé valide (ni personnelle, ni serveur) | ajoutez votre clé dans **Paramètres**, ou `ANTHROPIC_API_KEY` dans `.env` puis redémarrez `npm run dev` |
| « Clé refusée par Anthropic » dans Paramètres | clé révoquée, mal copiée ou d'un autre compte | recopiez la clé depuis platform.claude.com → API Keys |
| « Votre clé API est illisible » | `ENCRYPTION_KEY` a changé depuis l'enregistrement | enregistrez à nouveau votre clé dans **Paramètres** |
| `ENCRYPTION_KEY doit faire 32 octets` au démarrage | valeur absente ou mal générée | régénérez-la avec la commande de l'[étape 3](#3-générer-les-secrets-locaux) |
| « Le service IA est indisponible ou mal configuré » | pas de crédit, panne ou configuration | vérifiez vos crédits sur platform.claude.com ; le détail s'affiche dans le terminal de `npm run dev` |
| `UntrustedHost` avec `npm start` | `AUTH_URL` non définie en production | définissez `AUTH_URL` (ou `AUTH_TRUST_HOST=true` derrière un proxy de confiance) |
| Les modifications de `.env` ne sont pas prises en compte | variables lues au démarrage uniquement | arrêtez puis relancez `npm run dev` |

---

## Déploiement

L'application Next.js se déploie sur toute plateforme Node.js (Vercel, Railway, Render, VPS…).

1. Provisionnez une base **PostgreSQL** et un **Redis** (Redis configuré en `maxmemory-policy noeviction`, exigé par BullMQ).
2. Définissez toutes les variables d'environnement, dont `AUTH_URL` avec votre domaine.
3. Ajoutez l'URI de redirection de production dans la console Google : `https://votre-domaine.com/api/auth/callback/google`.
4. Appliquez les migrations puis construisez :

```bash
npx prisma migrate deploy
npm run build
npm start
```

> À partir de l'étape 3, le **worker de publication** est un process Node séparé qui doit tourner en permanence : il ne peut pas être hébergé sur une plateforme serverless.

---

## Contribuer

1. Créez une branche depuis `main` : `git switch -c feat/ma-fonctionnalite`.
2. Respectez les conventions de [`CLAUDE.md`](CLAUDE.md).
3. Avant chaque commit, vérifiez que tout passe :

```bash
npm run typecheck && npm run lint && npm test
```

1. Ne commitez jamais `.env` ni de secret, y compris dans `.env.example`.
2. Ouvrez une pull request vers `main`.
