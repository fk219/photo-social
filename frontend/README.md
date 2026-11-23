# Journal frontend

React and Vite client for Journal, a quiet photo journal and contact sheet. The interface is built from Sass tokens, a serif masthead, and a printed contact-sheet layout.

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
| `/` | Signed-in members see the feed | Contact sheet of recent frames |
| `/u/:username` | Public | Profile and photo portfolio |
| `/login` | Public | Sign in |
| `/register` | Public | Create an account |
| `/create-post` | Signed in | Upload a frame |
| `/privacy` | Public | Privacy notes |
| `/terms` | Public | Terms of use |

## Structure

- `src/features/auth`: session hydration, login, and registration.
- `src/features/posts`: feed, post card, comments, create page, and post context.
- `src/features/users`: public profile page.
- `src/features/legal`: privacy and terms pages.
- `src/features/shared`: navbar, avatar, API clients, image compression, and global styles.

`public/robots.txt` and `public/sitemap.xml` handle crawler discovery. Vercel Analytics is rendered once in `App.jsx` and needs no environment variables.
