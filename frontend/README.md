# Mosaic frontend

React and Vite client for Mosaic, a light photo sharing app. The interface uses a small Sass token set, white surfaces, hairline borders, a single blue action accent and a bold Mosaic wordmark.

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
| `/explore` | Public | Three-column post grid with the shared post modal |
| `/u/:username` | Public | Profile header, post grid and follow state |
| `/login` | Public | Sign in, with the shared demo account |
| `/register` | Public | Create an account |
| `/create-post` | Signed in | Publish a photo and caption |
| `/settings` | Signed in | Account, password, export and deletion |
| `/privacy` | Public | Privacy notes |
| `/terms` | Public | Terms of use |

## Structure

- `src/features/auth`: session hydration, login and registration.
- `src/features/posts`: feed cache, post card, shared grid and modal, comments, create page and feed tabs.
- `src/features/users`: public profile page.
- `src/features/legal`: privacy and terms pages.
- `src/features/settings`: account settings, export and deletion.
- `src/features/shared`: navigation, avatar, API clients, formatting, image compression and design tokens.

## Design notes

- The visual shell is a light Instagram-style layout: `#fafafa` background, white cards, `#dbdbdb` hairlines, near-black text and `#0095f6` for primary actions.
- The desktop top bar carries the wordmark and primary links. Below 760 px it becomes a compact top bar with a four-item bottom navigation.
- Explore and profile share `PostGrid` and `PostModal`. The modal closes with Escape, the scrim or its close button, traps focus while open and returns focus to the tile.
- Following and Explore keep separate cached pages in `posts/hooks/usePost.js`, so switching tabs does not restart pagination.
- Counts and states are honest. There are no generated statistics or sample accounts.
- Every standalone control is at least 44 px tall. `prefers-reduced-motion` disables card entry, like pop and shimmer animations.
- `public/robots.txt` and `public/sitemap.xml` handle crawler discovery. Vercel Analytics is rendered once in `App.jsx` and needs no environment variables.
