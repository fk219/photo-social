# Mosaic frontend

React and Vite client for Mosaic, image-first conversations for visual creators. The interface is built from Sass tokens, a gallery-after-hours palette, Instrument Serif display type and a Space Grotesk body.

## Scripts

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint
npm run build
npm run preview
```

The client talks to the deployed API by default. To point it at a local API, create `.env.local` with `VITE_API_URL=http://localhost:3006`.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Signed in | Following feed. Signed-out visitors are sent to Explore |
| `/explore` | Public | All frames with their open threads |
| `/u/:username` | Public | Portfolio, bio, stats and follow state |
| `/login` | Public | Sign in, with the shared demo account |
| `/register` | Public | Create an account |
| `/create-post` | Signed in | Publish a frame and its take |
| `/settings` | Signed in | Account, password, export and deletion |
| `/privacy` | Public | Privacy notes |
| `/terms` | Public | Terms of use |

## Structure

- `src/features/auth`: session hydration, login, registration and the auth stage.
- `src/features/posts`: per-scope feed cache, cards, thread view, create page, tabs and the conversation rail.
- `src/features/users`: public portfolio page.
- `src/features/legal`: privacy and terms pages.
- `src/features/settings`: account settings, export and deletion.
- `src/features/shared`: navigation, avatar, API clients, formatting, image compression and the design tokens.

## Design notes

- The signature element is the reply line. Preview replies and the full thread share the same node and spine treatment in `posts/style/feed.scss` and `posts/style/comments.scss`.
- Following and Explore keep separate cached pages in `posts/hooks/usePost.js`, so switching tabs does not restart pagination.
- The right rail only reports what is loaded in the current view. It never fills gaps with invented people or numbers.
- Every standalone control is at least 44 px tall. `prefers-reduced-motion` disables the card entry, like pop and thread draw animations.
- `public/robots.txt` and `public/sitemap.xml` handle crawler discovery. Vercel Analytics is rendered once in `App.jsx` and needs no environment variables.
