@AGENTS.md

# ContentSync

SaaS : l'utilisateur rédige un **Post Maître**, Claude l'adapte pour chaque canal (LinkedIn, X, Blog),
on planifie dans un calendrier drag & drop, un worker BullMQ publie à l'heure.

## Stack
- Next.js 16 (App Router, **Cache Components activé**, TypeScript strict) · Tailwind v4 · daisyUI 5 (thèmes `corporate` / `business` en sombre)
- PostgreSQL + Prisma 7 (adaptateur `@prisma/adapter-pg`, client généré dans `src/generated/prisma`, non versionné)
- Auth.js v5 (Google, connexion uniquement, sessions JWT)
- BullMQ + Redis (worker = process Node séparé) — étape 3
- FullCalendar (`@fullcalendar/react` + `interaction` pour le drag & drop) — étape 4
- `@anthropic-ai/sdk` (modèle via `ANTHROPIC_MODEL`, défaut `claude-opus-5-5`) — étape 2
- Zod 4 (env, entrées, sorties IA) · Vitest

## Commandes
```bash
docker compose up -d                 # Postgres 17 + Redis 7 en local
npm run dev                          # app Next.js (http://localhost:3000)
npm run worker                       # worker BullMQ (à partir de l'étape 3), en parallèle de dev
npm run build && npm start           # prod
npm run lint && npm run typecheck
npm test                             # vitest run
npx prisma migrate dev --name <nom>  # nouvelle migration (dev)
npx prisma generate                  # régénérer le client (Prisma 7 : migrate dev ne le fait PAS ; postinstall le fait)
npx prisma migrate deploy            # appliquer les migrations (prod)
npx prisma studio                    # explorer la BDD
```
Avant de déclarer une tâche terminée : `npm run typecheck && npm run lint && npm test`.

## Environnement
- `.env` (non versionné) ; modèle : `.env.example`. La config Prisma charge les mêmes fichiers via `@next/env`.
- **Ne jamais lire `process.env` ailleurs que dans `src/lib/env.ts`** (validation Zod). Y ajouter chaque nouvelle variable.

## Conventions de code
- TypeScript `strict` + `noUncheckedIndexedAccess`. Pas de `any` : `unknown` puis Zod.
- Fichiers en kebab-case (`post-card.tsx`), composants exportés en PascalCase, hooks `useXxx`.
- Server Components par défaut ; `"use client"` seulement si nécessaire (composer, calendrier).
- Modules serveur (`src/lib/*`, `src/server/*`) commencent par `import "server-only"` (sauf code partagé avec le worker).
- Prisma : importer `db` depuis `@/lib/db`, les types depuis `@/generated/prisma/client`. Jamais de `new PrismaClient()` ailleurs.
- **Auth / accès aux données** :
  - Chaque page protégée appelle `requireUser()` (`@/lib/auth`) **dans un composant sous `<Suspense>`**
    (Cache Components : lire la session hors Suspense = erreur de build). Pas de contrôle d'accès dans les layouts.
    `requireUser()` commence par `await connection()` : ne pas l'enlever (Auth.js appelle crypto avant les cookies).
    Il ne renvoie que `{ id }` : nom et e-mail du jeton sont figés à la connexion, les lire en base.
  - Chaque Server Action : 1) valide l'entrée avec Zod, 2) `requireUser()`, 3) **filtre par `userId`** toute requête Prisma.
- Mutations via Server Actions dans `src/server/`.
- Formulaires client : `useActionState` + appel manuel dans `onSubmit` (`startTransition(() => action(formData))`),
  pas `<form action>` — sinon React vide les champs et le texte saisi est perdu en cas d'erreur.
- Erreurs : attendues → retour `{ ok: false, error }` ; inattendues → `throw`.
  Les connecteurs lèvent `ConnectorError { retryable: boolean }` ; le worker s'en sert pour retry vs échec.
- Dates stockées en UTC, affichées dans le fuseau de l'utilisateur.
- Ne jamais logger de jetons, credentials, clés API.
- **Secrets stockés en base** (clé API utilisateur, jetons OAuth) : toujours chiffrés via `encrypt` / `decrypt` de
  `src/lib/crypto.ts` avec `env.ENCRYPTION_KEY`. Ne jamais renvoyer un secret déchiffré au client (au plus ses 4 derniers caractères).
- Clé Anthropic : celle de l'utilisateur (`User.anthropicApiKey`) si présente, sinon `ANTHROPIC_API_KEY` du serveur.
  Une clé est vérifiée (`verifyApiKey`) avant d'être enregistrée.
- Tests colocalisés (`foo.test.ts`) pour la logique : planification, parsing de sortie IA, connecteurs (HTTP mocké).
- UI : classes daisyUI (`btn`, `card`, `input`, `badge`, `alert`…) sur des éléments HTML natifs, utilitaires Tailwind pour la mise en page.
  Couleurs via les tokens du thème (`primary`, `base-100`, `base-content/70`, `error`…), jamais de couleurs en dur.
  Pas de bibliothèque de composants en plus (pas de shadcn) : thème et couleurs se configurent dans `src/app/globals.css`.

## Règles d'architecture

### Postgres = source de vérité, Redis = simple déclencheur
- Toute (re)planification / annulation passe par `src/server/schedule.ts`, qui met à jour la BDD **et** BullMQ.
  Ne jamais appeler `queue.add` / `job.remove` ailleurs.
- `jobId` BullMQ = `ScheduledTask.id`. Replanifier = annuler l'ancienne tâche (`CANCELLED` + suppression du job) puis en créer une nouvelle.

### `src/lib/social-connectors/` — isolation stricte
- **Seul** endroit qui appelle les API des réseaux sociaux.
- Un fichier par plateforme implémentant `SocialConnector` (`types.ts`), enregistré dans `index.ts`.
- Connecteurs purs : reçoivent des credentials déchiffrés + le contenu, retournent un résultat.
  **Aucun import de Prisma, Next.js ou BullMQ.**
- Ajouter une plateforme = valeur dans l'enum `Platform` + fichier connecteur + entrée de registre.
```ts
interface SocialConnector {
  platform: Platform;
  maxLength: number;
  publish(input: { content: string; credentials: ChannelCredentials }): Promise<{ externalId: string; url?: string }>;
  refresh?(credentials: ChannelCredentials): Promise<ChannelCredentials>;
}
```

### `src/workers/` — workers BullMQ
- Process séparé (pas dans Next.js / serverless). `index.ts` ne fait que brancher queues → processors + arrêt propre (SIGTERM).
- Un processor par fichier (`publish-post.ts`, …). Aucun import depuis `src/app` ni React.
- Processors **idempotents** : relire `ScheduledTask` et `Post` en BDD, sortir si le statut n'est plus `PENDING` / `SCHEDULED`.
- Retries, backoff et concurrence configurés dans `src/lib/queue.ts`, pas dans les processors.
- Redis doit tourner en `maxmemory-policy noeviction` (exigence BullMQ ; déjà le cas dans `docker-compose.yml`).

### Variantes et plateformes
- Un `Post` = une variante d'un `MasterPost` pour une `platform` ; `channelId` (compte connecté) est choisi à la planification.
- Limites de caractères : `src/lib/platforms.ts` (partagé client / serveur / worker), source unique pour l'UI, l'IA et les connecteurs.
- Régénérer ne remplace que les variantes `DRAFT` ; une variante planifiée ou publiée n'est jamais écrasée.

### `src/lib/ai/prompts/` — prompts centralisés et versionnés
- Un fichier par version : `adapt-post.v1.ts` exportant `{ id, version, system, buildUserMessage }`.
- **Ne jamais modifier une version livrée** : créer `v2` et la brancher dans `prompts/index.ts`.
- `Post.promptVersion` enregistre la version utilisée (`adapt-post@v1`).
- Sortie du modèle toujours validée par Zod (`outputSchema` du prompt + `client.beta.messages.parse`) ;
  appels avec `fallbacks: "default"` (repli serveur en cas de refus). Limites vérifiées via `src/lib/platforms.ts`.
- Aucun texte de prompt en dur hors de ce dossier.

## Roadmap MVP
1. ✅ Socle : Next.js, daisyUI, Prisma + migration initiale, Auth.js Google, dashboard protégé.
2. ✅ Éditeur IA : CRUD MasterPost, `lib/ai/adapt.ts` + `adapt-post.v1`, composer avec variantes éditables (Posts `DRAFT`).
   ✅ Paramètres du compte (`/settings`) : nom, clé API Anthropic personnelle chiffrée (`lib/crypto.ts`).
3. Queue & worker : `lib/queue.ts`, `src/workers/`, `server/schedule.ts`, connecteur `webhook` de bout en bout.
4. Calendrier : FullCalendar, `eventDrop` → replanification, couleur par statut, rollback visuel si échec.
5. Connecteurs LinkedIn & X : OAuth maison (jetons chiffrés via `lib/crypto.ts`), page Channels, refresh des jetons, HMAC webhook.
