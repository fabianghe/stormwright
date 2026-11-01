# CLAUDE.md

**Gameweft**: a typewriter-styled web app for writing a game's story, dialogue and quests, including the world
actions that happen in them. Read `docs/PROJECT.md` first: it holds the vision, the decisions made with the owner
(Fabi) and the roadmap.

@AGENTS.md
@docs/PROJECT.md

## Working with Fabi

- Fabi makes games (Unity) and doesn't want to learn this web stack. Explain in plain words, decide technical
  details yourself, and ask only about things that change what they get (look, behaviour, cost).
- Calm, simple and stylish matters as much as features. Keep both palettes × light/dark looking right.
- Don't write code comments. Keep diffs focused on the request; mention other issues instead of bundling fixes.
- After changes run `npm run typecheck`, `npm run lint` and `npm run build`. For UI changes, look at it in a browser.

## Commands

```bash
npm run dev          # http://localhost:3000, local embedded database in .data/ (no setup)
npm run build        # runs DB migrations when DATABASE_URL is set, then next build
npm run typecheck    # next typegen + tsc
npm run lint
npm run db:generate  # after editing lib/db/schema.ts: writes a new SQL migration into drizzle/
npm run db:migrate   # apply migrations to DATABASE_URL (the local DB migrates itself on start)
```

Delete `.data/` to reset the local database.

## Stack (versions matter: these are newer than most training data)

- **Next.js 16.4** App Router, React 19.3, TypeScript, Tailwind CSS 4 (CSS-first config in `app/globals.css`).
  Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs. **`cacheComponents` is deliberately off**:
  the app is private and per-user, so pages render dynamically. `params` and `cookies()` are async.
- **Tiptap 3** (ProseMirror) editor. `@tiptap/extensions` holds Placeholder/Focus/CharacterCount,
  `@tiptap/extension-list` holds TaskList/TaskItem, menus come from `@tiptap/react/menus`, and suggestion popups use
  `props.mount(element)` for positioning.
- **Drizzle ORM** on Postgres: **Neon** over HTTP in production (`DATABASE_URL`), **PGlite** (embedded Postgres,
  WASM) locally when `DATABASE_URL` is empty. One schema and one set of migrations serve both. The neon-http driver
  has no transactions, so don't use `db.transaction`.
- **@xyflow/react** (quest map), **@dnd-kit** (sidebar reordering), **lucide-react** icons (check names exist:
  some old names like `Trash2` and `History` are gone or moved in v1).
- The React Compiler ESLint rules are on (`react-hooks/*`): no setState directly in effects, no ref reads during
  render, no mutating hook values. Fix the pattern instead of disabling the rule.

## Layout

```
app/
  layout.tsx              fonts + theme attributes from the sw_theme cookie (no flash)
  globals.css             palettes (light-dark() vars), UI primitives (.sw-btn, .sw-menu…), editor styles
  login/                  first run creates the account, later it's a sign-in form
  (app)/                  authenticated area: layout loads user + document list into AppShell
    page.tsx              home   · d/[id]  document · map  quest map · trash
  api/                    route handlers: auth/*, documents (+ [id], restore, versions), vocab, search
lib/
  model.ts                document kinds, statuses, ACTION_KINDS (labels, groups, link types), shared types
  content.ts              walks Tiptap JSON: extractMeta (links, vocab, stats, search text), toMarkdown, toStructured
  documents.ts            data access (all queries scoped by userId), version snapshots
  auth.ts / api.ts        scrypt passwords, DB sessions (sha256 of the cookie token), JSON + same-origin checks
  db/                     schema.ts, index.ts (Neon or PGlite), migrations live in /drizzle
  theme.ts, brand.ts, templates.ts, typewriter-sound.ts, client-api.ts, time.ts
components/
  app-shell, sidebar, command-palette, documents-store (client cache of summaries + create/update/reorder/trash),
  preferences (theme, sounds cookie, focus mode, sidebar), document-view (header, autosave, outline, export),
  history-panel, quest-map, home-view, trash-view, auth-form, menu, icons
  editor/
    story-editor.tsx      builds the editor, sounds, mention clicks, typewriter scrolling, bubble menu
    combo.tsx             autocomplete input used inside node views
    extensions/           dialogue, choice, action (React node views), blocks (stage, scene, note),
                          slash (/ menu), mention (@), helpers (insert, exit, focus)
```

## How things work

- **Saving**: `DocumentView` queues title/content changes and PATCHes after 800 ms (serialized, retried on failure,
  flushed with `keepalive` when the tab hides). The server recomputes `links`, `vocab`, `stats` and `searchText` from
  the content on every save (`extractMeta`), so the sidebar, map, search and autocomplete never parse documents on
  the client.
- **Links** between documents come from mentions, dialogue `speakerId` and action `targetId`. Their type comes from
  `ACTION_KINDS[kind].link` (starts / completes / fails / requires / mentions). The quest map draws them, and
  backlinks use them.
- **Vocab**: action targets without a linked document are stored per target label (e.g. every "GameObject" name),
  so Turn ON and Turn OFF share suggestions, as do Set flag and Only if flag.
- **Node views and focus**: inputs inside node views are ignored by ProseMirror (Tiptap's `stopEvent`). To hand focus
  back to the text use `focusEditorAt` (synchronous); `editor.commands.focus()` waits a frame and fast typing lands in
  the wrong place. New blocks ask for their first field to be focused via `requestFieldFocus(pos)`. In `Combo`,
  Enter keeps the typed text, while Tab or ↓ accepts a suggestion.
- **Ordering**: `documents.position` (double). New documents get `min - 1` in their kind. A drag sets the midpoint
  between neighbours, or renumbers the section when positions collide.
- **Themes**: `<html data-palette="paper|storm" data-mode="light|dark|system">`. Every colour is a CSS variable
  defined with `light-dark()`, and `color-scheme` follows the mode, so "system" needs no JS. Tailwind colour names
  map to them (`bg-surface`, `text-ink-soft`, `border-line`, `text-accent`…). Use these, never raw colours.
- **Security**: every query is scoped by `userId`. Mutating routes require JSON and a same-origin `Origin`. Sign-up
  is only open for the first account unless `ALLOW_SIGNUP=true`.

## Adding things

- **New action kind**: add it to `ACTION_KINDS` in `lib/model.ts` and an icon in `components/icons.ts`. The slash
  menu, kind picker, export and vocab pick it up automatically.
- **New block**: a Tiptap node in `components/editor/extensions/`, register it in `story-editor.tsx`, add a slash
  command, and handle it in `lib/content.ts` (search text, Markdown, JSON export).
- **Schema change**: edit `lib/db/schema.ts`, run `npm run db:generate`, and commit the new file in `drizzle/`.

## Deployment

Vercel + Neon, step by step in `README.md`. The build runs `scripts/migrate.mjs`, which migrates Neon when
`DATABASE_URL` is set.
