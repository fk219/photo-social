# Mosaic

A clean, light photo sharing app built on the Insta Clone codebase.

**Live app:** https://insta-clone.furqankhan.dev
**API:** https://insta-clone-backend-n518.onrender.com

**Demo account:** `demo_mosaic` / `DemoMosaic2026!` (shared; demo data is clearly labeled)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![ImageKit](https://img.shields.io/badge/ImageKit-media-0B0D0E)
![Render](https://img.shields.io/badge/API-Render-46E3B7)
![Vercel](https://img.shields.io/badge/Web-Vercel-000000?logo=vercel&logoColor=white)

## What it is

Mosaic is an Instagram-style social app: a centered photo feed, an Explore grid, public profiles, likes and comments. It keeps the familiar social loop and drops the extra layers.

The product is Mosaic. The folder, deployment domain and repository name remain `Insta Clone`, `insta-clone.furqankhan.dev` and `Insta-Clone` so existing links keep working.

## Product capabilities

**Feeds**
- Following feed for signed-in members, with their own posts plus posts from accounts they follow.
- Public Explore feed for everyone, including signed-out visitors.
- Slim Following and Explore tabs above a centered 500 px column.
- Cursor pagination, per-tab page caching and a warmed stale-while-revalidate cache for guest reads.

**Posts**
- Instagram-style card: author, image, like and comment actions, like count, caption, recent comments and relative time.
- Likes update optimistically and reconcile with the server count.
- Comments load from the existing comments endpoint with cursor pagination and an inline composer.
- Comments from your own account add and delete optimistically, with rollback and an inline error if the API rejects the change.
- Owners can delete their own posts. Likes and comments are removed with the post.

**Explore and profiles**
- Three-column Explore grid with hover and keyboard focus states. Selecting a tile opens a post modal with the full card and comments.
- Public `/u/:username` profile with avatar, bio, post count, follower and following counts, follow state and a copy-link action.
- Profile grid opens the same post modal, so browsing and commenting work without leaving the page.
- Owners can edit their bio inline and publish a new post.
- Signed-out visitors can read posts, comments and profiles, and are asked to sign in before writing.

**Publishing**
- Protected `/create-post` route with drag and drop, local preview and inline errors.
- Browser-side resize to 1600 px and JPEG compression at about 0.82 quality before upload.
- Server accepts JPEG, PNG and WebP only, up to 5 MB, with MIME and file-signature checks.
- The original ImageKit URL is stored. Feed and grid thumbnails use an 800 px, quality 80 transformation URL.

**Account settings**
- Protected `/settings` with account summary, password change, JSON export and account deletion.
- Password changes invalidate every session through `tokenVersion`.
- The export covers the account, posts, comments, likes and follow relationships in both directions, without the password hash.
- Account deletion requires the password and a typed `DELETE` confirmation. ImageKit originals remain at their URLs.
- The shared demo account is protected from password changes and deletion.
- Privacy and terms links appear in the footer and on the legal pages.

**Security baseline**
- `helmet` security headers.
- `express-rate-limit`: 10 requests/minute per IP on auth routes, 5/minute on password, export and deletion, 30/minute on posts and comments.
- JWT in an `httpOnly`, `SameSite=Lax`, `Secure` cookie in production; bcrypt password hashing.
- Session JWTs carry a `tokenVersion`. A password change increments it and invalidates older tokens.
- Comment and bio length limits on both client and server.
- CORS restricted to the production app and local development origins.
- `trust proxy` set for Render and Vercel deployments.

**Public pages and discovery**
- `/privacy` and `/terms` describe what Mosaic stores, the processors it uses, account export and deletion, and the rules for the beta service.
- `robots.txt`, `sitemap.xml`, a canonical URL and Open Graph metadata cover search and sharing basics.
- Vercel Analytics runs in the app root and needs no environment variables.

## Design direction

A light, familiar social surface: `#fafafa` background, white cards, `#dbdbdb` hairlines, near-black text, `#0095f6` for primary actions and a restrained red for likes and errors. The wordmark is a bold sans; the rest of the interface uses a system font stack.

- Desktop uses one top bar with Mosaic, Home, Explore, Create, Profile, Settings and Sign out.
- The feed is a single centered column. No side rails, hero panels or decorative stats.
- Below 760 px the top bar becomes compact and a four-item bottom navigation carries Home, Explore, Create and Profile.
- Explore and profile share the same grid and post modal.
- Every interactive control is at least 44 px tall, with visible focus states.
- Type and surfaces are tuned for WCAG AA contrast.
- Motion is limited to card entry, a like pop and modal transitions. All of it is disabled under `prefers-reduced-motion`.
- Empty, loading and error states use real copy, never placeholder activity. Skeletons cover the feed, Explore grid and profile.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, react-router-dom, Sass design tokens, Vercel Analytics |
| Backend | Node.js, Express 5, Mongoose, JWT, bcrypt, multer, ImageKit, helmet, express-rate-limit |
| Hosting | Vercel (web), Render (API), MongoDB Atlas (database) |

## Project structure

```
backend/
  server.js
  src/app.js                  Express app, CORS, security middleware
  routes/                     auth, posts (incl. comments), users
  controllers/                auth, posts, comments, users
  models/                     User, Post, Like, Follow, Comment
  middleware/                 JWT auth, rate limits, error handling
  utils/                      feed aggregation, cursor, feed cache, ImageKit transforms
frontend/
  src/
    app.routes.jsx            Router, app shell, skip link
    features/auth/            session hydration, login, register
    features/posts/           feeds, card, grid, modal, comments, create page
    features/users/           public profile page
    features/settings/        account settings, export and deletion
    features/legal/           privacy and terms pages
    features/shared/          navigation, avatar, API clients, image compression
```

## Run locally

```bash
# API
cd backend
npm install
cp .env.example .env         # Mongo, JWT and ImageKit keys
npm start                    # http://localhost:3006

# Web
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

The frontend talks to the deployed API by default. To use a local API, create `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:3006
```

### Environment variables

| Key | Required | Purpose |
|---|---|---|
| `PORT` | No | API port (defaults to `3006`) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Signs auth cookies |
| `IMAGEKIT_PRIVATE_KEY` | Yes | Server-side ImageKit uploads |
| `VITE_API_URL` | No | Frontend API origin; defaults to the deployed API |

## API

All routes are prefixed with `/api`. Post writes, comments, follows and account settings require the auth cookie. Feed and comment reads also work for signed-out visitors; `scope=following` still requires a session.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create account |
| `POST` | `/auth/login` | Public | Sign in, set cookie |
| `GET` | `/auth/get-me` | Cookie | Current user |
| `POST` | `/auth/logout` | Cookie | Clear the auth cookie |
| `PATCH` | `/auth/password` | Cookie | Change password (`{ currentPassword, newPassword }`) and sign out all sessions |
| `GET` | `/auth/export` | Cookie | Download account, posts, comments, likes and follow relationships as JSON |
| `DELETE` | `/auth/account` | Cookie | Delete account (`{ password }`), its records and current session |
| `GET` | `/posts/feed?scope=all&cursor=&limit=10` | Public | Cursor-paginated feed. Use `scope=following` for followed accounts only |
| `GET` | `/posts/feed?scope=following&cursor=&limit=10` | Cookie | Following feed, including your own posts |
| `POST` | `/posts` | Cookie | Upload a post (`multipart`, field `image`) |
| `DELETE` | `/posts/:postId` | Cookie | Delete own post |
| `POST` | `/posts/like/:postId` | Cookie | Like (idempotent) |
| `POST` | `/posts/unlike/:postId` | Cookie | Unlike (idempotent) |
| `GET` | `/posts/:postId/comments?cursor=&limit=20` | Public | Comment list |
| `POST` | `/posts/:postId/comments` | Cookie | Add comment (`{ text }`) |
| `DELETE` | `/posts/:postId/comments/:commentId` | Cookie | Delete own comment |
| `GET` | `/users/:username?cursor=&limit=12` | Public | Public profile and paginated post grid |
| `PATCH` | `/users/me` | Cookie | Update `bio` and/or `profile_image` URL |
| `POST` | `/users/follow/:username` | Cookie | Follow |
| `POST` | `/users/unfollow/:username` | Cookie | Unfollow |

Pagination responses include `nextCursor`; pass it back as `cursor` for the next page. A `null` cursor means the end of the view.

Feed responses also include `scope` and, for each post, `recentComments` with the first two comments (text, author username, avatar and timestamp).

## Data model notes

- `Post`, `User`, `Follow` and `Comment` use Mongoose timestamps. Existing posts without `createdAt` are still returned; they sort after dated posts and render without a time.
- `Post` keeps `likesCount` and `commentsCount` counters, while feed and profile reads compute counts with `$lookup` so older posts stay accurate.
- Feed reads add a `$lookup` for the first two comments and their author avatars. Profile reads skip that lookup.
- `Comment` stores `post`, `user` (username), `text` (max 500), and timestamps.
- `Follow` stores username pairs and status. Both feed scopes and profile counts ignore rejected follows.
- `User` keeps `tokenVersion` (default `0`). Password changes increment it, so older JWTs are rejected.
- Deleting a post removes its database record, likes and comments. The ImageKit original stays in place.
- Deleting an account removes its comments, likes, both follow directions, posts, current blacklist entry and user record. ImageKit originals stay in place.

## Deployment notes

- The API runs on Render's free plan, so the first request after idle can take around 50 seconds.
- CORS is restricted to the production app origin plus localhost.
- Uploads require a valid ImageKit private key on the API.
- `frontend/vercel.json` rewrites client routes to `index.html` and proxies `/api` to Render.
- Auth cookies are `Secure`; local development should use the deployed API or serve the local API over HTTPS if you need cookie auth.

## Verification

```bash
# Backend syntax
find . -name "*.js" -not -path "./node_modules/*" -exec node --check {} \;

# Frontend
cd frontend
npm run lint
npm run build
```
