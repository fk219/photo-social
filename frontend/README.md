# PhotoSocial frontend

React and Vite client for PhotoSocial, a light photo sharing and messaging app. The interface uses a small Sass token set, white surfaces, hairline borders, a single blue action accent and a bold PhotoSocial wordmark.

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
| `/` | Signed in | Following feed with the story rail. Signed-out visitors are sent to Explore |
| `/explore` | Public | Three-column post grid with the shared post modal |
| `/search` | Public | People, posts and hashtag search |
| `/p/:postId` | Public | Full post detail with comments |
| `/u/:username` | Public | Profile header, post grid and follow state |
| `/messages` | Signed in | Inbox |
| `/messages/:conversationId` | Signed in | Conversation |
| `/notifications` | Signed in | Activity feed |
| `/saved` | Signed in | Saved posts |
| `/login` | Public | Sign in, with the shared demo account |
| `/register` | Public | Create an account |
| `/create-post` | Signed in | Publish a photo and caption |
| `/settings` | Signed in | Account, password, export, blocked accounts and deletion |
| `/privacy` | Public | Privacy notes |
| `/terms` | Public | Terms of use |

## Structure

- `src/features/auth`: session hydration, login and registration.
- `src/features/posts`: feed cache, post card, grid, modal, comments, likes, share sheet, likes list, post detail and create page.
- `src/features/messages`: inbox, chat, new message dialog and conversation navigation.
- `src/features/notifications`: activity page.
- `src/features/search`: people, post and tag search.
- `src/features/saved`: saved posts grid.
- `src/features/stories`: story rail, viewer and composer.
- `src/features/users`: profile page, edit profile, follow lists and profile actions.
- `src/features/social`: unread badge context and refresh events.
- `src/features/legal`: privacy and terms pages.
- `src/features/settings`: account settings, export, blocked accounts and deletion.
- `src/features/shared`: navigation, dialogs, avatar, rich text, API clients, formatting, image compression and design tokens.

## Design notes

- The visual shell is a light Instagram-style layout: `#fafafa` background, white cards, `#dbdbdb` hairlines, near-black text and `#0095f6` for primary actions.
- The desktop top bar carries the wordmark, primary links, search and an avatar menu. Below 760 px it becomes a compact top bar with a five-item bottom navigation.
- Messages uses a two-pane layout on desktop and one pane at a time on mobile.
- Explore and profile share `PostGrid` and `PostModal`. The modal closes with Escape, the scrim or its close button, traps focus while open and returns focus to the tile.
- The story viewer is the one dark surface. It supports auto-advance, previous/next, Escape, focus return and seen state.
- Following and Explore keep separate cached pages in `posts/hooks/usePost.js`, so switching tabs does not restart pagination.
- Counts and states are honest. There are no generated statistics or sample accounts.
- Every standalone control is at least 44 px tall. `prefers-reduced-motion` disables card entry, like pop, heart burst and shimmer animations.
- `public/robots.txt` and `public/sitemap.xml` handle crawler discovery. Vercel Analytics is rendered once in `App.jsx` and needs no environment variables.
