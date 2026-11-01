# Gameweft

*A quiet place to write your game's story.*

Write quests, dialogue and lore on a typewriter page, and plan what happens in the world as you go: turn things on,
set story flags, give items, set off explosions, start the next quest. Everything is saved to your account.

- `/` opens the block menu: dialogue, player choices, quest stages, scene headings, notes and 24 kinds of actions
- `@` mentions a character, place, item or quest, or creates one on the spot
- ⌘K searches everything · ⌘⇧F is focus mode · ⌘\ hides the sidebar
- Drag documents in the sidebar to put them in your own order (on a phone: press and hold, then drag)
- Two palettes (Paper & Ink, Storm at Dusk), each light or dark, plus optional typewriter sounds
- Version history, trash, a quest map, and export to Markdown, JSON or PDF

## Run it on your computer

You need [Node.js](https://nodejs.org) 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and create your account. Locally your writing is stored in the `.data/` folder (not
committed to git).

## Put it online for free (Vercel + Neon)

About 10 minutes, all through the browser:

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, click **Add New → Project** and import the repository.
   Leave every setting as it is and click **Deploy**. The first deploy works, but the site can't save anything
   yet.
3. In the Vercel project open **Storage → Create Database → Neon** (free plan), create it and connect it to the
   project. This adds `DATABASE_URL` for you.
4. Open **Deployments**, click the **…** next to the latest one and choose **Redeploy**. The build sets up the
   database tables by itself.
5. Open your site and create your account. You're the only one who can sign up; after the first account,
   sign-up closes.

Every push to GitHub redeploys automatically.

**Optional:** to let other people create accounts, add an environment variable `ALLOW_SIGNUP` = `true` in Vercel
(Settings → Environment Variables) and redeploy.

Vercel's free plan is meant for personal, non-commercial projects. If Gameweft becomes a business, move to a paid plan.

## Renaming

The app's name and tagline live in `lib/brand.ts`.
