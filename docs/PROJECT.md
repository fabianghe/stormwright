# Gameweft: what we're building and why

## The goal

Gameweft is a calm, beautiful writing app for planning a game's story. It started as a tool for Fabi's own game,
**VIRTUOUS** ("A youth dreams of a heavy storm"; a third-person stealth/adventure game in Unity, repo at
`~/Documents/repos/OUTSIDE`), and might grow into a product for other game writers.

The problem it solves: a quest isn't just dialogue. Writing one means describing **what happens next in the world**:
turn on this GameObject, set that story flag, give an item, trigger an explosion, start the next quest. Ordinary
writing tools (Docs, Notion) have no words for that, and narrative tools (Twine, Ink, Yarn Spinner, articy) are either
code-like or not built around world actions. Gameweft treats those actions as first-class blocks inside a
typewriter-style document.

### What Fabi asked for (in their words, condensed)

- Write story, dialogue and quest plans, **including what should happen next** (turning objects on, events like explosions…).
- A web app with a **beautiful typewriter font**, **light and dark mode**.
- **Simple username + password login** so work is saved per account. Very easy to set up, nothing complicated.
- Feels like the **Claude website**: documents pinned/listed in a sidebar.
- **Free** to run.
- **Cool, calming, creative vibe**. Simplicity, style and colours matter.
- Just Fabi at first, **open to becoming a business** if it works.
- The sidebar lists must be **re-orderable** (drag and drop, works on desktop and mobile), e.g. to put quests in
  chronological order.
- "I don't need to know the tech personally": pick the best, smoothest stack.

## Decisions made with Fabi

| Topic | Decision |
| --- | --- |
| Name | **Gameweft**. The name lives in `lib/brand.ts`. |
| Hosting | Online and free: **Vercel** (app) + **Neon** (Postgres, free tier). Locally it runs with zero setup on an embedded database. |
| Users | Single user for now; the first account is created on first visit, then sign-up closes (`ALLOW_SIGNUP=true` reopens it). |
| Writing model | **Free writing + inserted blocks** (not a rigid form): dialogue lines, player choices, quest stages, scene headings, notes, and **action blocks**. |
| Look | Seven palettes, each with light and dark. The originals: **Paper & Ink** (cream paper, ink, ribbon-red; dark = charcoal with amber lamp glow) and **Storm at Dusk** (rain-washed slate, lavender; dark = midnight slate with violet and a lightning-yellow spark), made first by Claude. Later added: **Ember & Ash**, **Moonlit Pine**, **Terracotta & Sand**, **Aurora** and **Screenplay** (black on white, inverted in dark mode). Plus "match device". |
| Fonts | Courier Prime (body, clean typewriter) + Special Elite (headings, worn typewriter), both free Google Fonts. |
| Ordering | Manual order per sidebar section via drag and drop (dnd-kit): mouse drag after 6 px, touch press-and-hold 250 ms, keyboard Space + arrows. New documents go to the top of their section. |

## Features in v1

- **Accounts**: username + password, sessions in the database, lockout after 8 wrong attempts.
- **Sign-in page** doubles as a short tour: what Gameweft is, live-styled examples of each feature (quest tabs,
  dialogue, choices, mentions, status tracking, actions), a mini quest map, and the palette and sound switch, so
  visitors can pick a look before signing in. The examples use an original story
  (Wren and Tomas) on purpose: don't put VIRTUOUS content on this public page.
- **Sidebar** (Claude-style): New menu, search (⌘K), Home, Quest map, Pinned, sections per kind (Quests, Story,
  Characters, Places, Items, Notes) with drag-to-reorder, Trash, settings (palette, mode, sign out).
- **Game projects**: each account can create, rename (pencil in the project menu) and switch between separate games; existing documents stay in the
  original project.
- **Document kinds** with starter templates: quest (including an Active short description), story, character, place, item, note. Status per document:
  To do → In progress → Ready to implement → Done. On the quest map, Done means implemented in the game.
- **Editor** (type `/` for blocks, `@` to mention):
  - **Dialogue**: speaker (autocompletes characters and previously used names), delivery note, line. Enter starts the
    next line and alternates speakers; Enter on an empty line leaves dialogue; Tab jumps to the speaker.
  - **Quest state tabs**: below the title and the Active short description, a quest is one tab per state (Offer,
    In progress, Ready, Completed, Failed), mirroring the dialogue tabs on Unity's `QuestSO`. Each tab is a full page
    with that state's dialogue and actions; stages live in In progress. Nothing can be written outside the tabs.
    Older quests are sorted into the tabs automatically when opened.
  - **Player choice**: an option label with its own nested branch of content; "+ option" adds a sibling.
  - **Quest stage**: auto-numbered ("Stage 1, 2…"), shown in the outline and the map card.
  - **Scene heading** (screenplay style), **note to self**, headings, lists, to-dos, quotes, dividers.
  - **Game action**: one free-form action description for any game-specific mechanic. Existing structured action
    blocks remain readable, while new actions are mapped to the target game's own architecture during implementation.
  - **Mentions** (`@`) link characters, places, items and quests, and can create a new one on the spot. Links are
    kept up to date when something is renamed, and each document shows "Mentioned in" backlinks.
- **Autosave** (debounced, retries when offline), **version history** (snapshot at most every 10 minutes, 60 kept,
  restore keeps a snapshot of the current text first), **Trash** with restore.
- **Quest map**: quests and story documents as cards, arrows from Start/Complete/Fail/Only-if-quest actions;
  drag to arrange (positions saved), "Tidy up" to auto-layout.
- **Focus mode** (⌘⇧F): hides the chrome, dims everything but the current paragraph, keeps the caret centred.
- **Typewriter sounds** (on by default, synthesised with WebAudio: key clacks and a carriage-return bell). Switch them
  off in the settings menu (next to the palettes), in the document header, or on the sign-in page.
- **Export**: Markdown, structured per-document game JSON, an AI-ready project JSON with all active documents,
  relationships, action vocabulary and architecture-neutral implementation guidance, and Print / Save as PDF.
- Home page with greeting, quick-create cards, recent documents, totals and keyboard tips.

## Ideas for later (not built)
- **Unity importer**: read the AI-ready JSON and create/update VIRTUOUS assets. Mapping to the game's systems:
  stages → `QuestStage`, Set story flag → `StoryFlag`/`StoryFlagAction`, Give/Take item → `GiveItemAction`/
  `RemoveItemAction` with `ItemSO`, Start/Complete quest → `SetQuestStatusAction`/`TurnInQuestAction`,
  Report event → `QuestEvents.Report(QuestVerb, GameTag)`, Turn ON/OFF → `QuestActivator`, dialogue lines →
  `DialogueSO` with `LocalizedText`. (See `OUTSIDE/CLAUDE.md` → "Dialogue & quests".)
- Sharing and collaborators, comments.
- Images and mood boards in documents (needs file storage, e.g. Vercel Blob).
- Dialogue tree view for choices; a version diff view; tags and folders; per-project vocab management.
- Email or OAuth login and password reset, if it becomes a product. **Note:** Vercel's free Hobby plan is for
  non-commercial use; a paid plan is needed once it's a business.
- Offline/PWA mode and live multi-tab sync (today the last save wins).
