# Mosaic

Image-first conversations for visual creators.

**Live app:** https://insta-clone.furqankhan.dev
**API:** https://insta-clone-backend-n518.onrender.com

**Demo account:** `demo_journal` / `DemoJournal2026!` (shared; the feed also contains older frames)

![Mosaic Following feed](docs/preview.png)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![ImageKit](https://img.shields.io/badge/ImageKit-media-0B0D0E)
![Render](https://img.shields.io/badge/API-Render-46E3B7)
![Vercel](https://img.shields.io/badge/Web-Vercel-000000?logo=vercel&logoColor=white)

## What it is

Instagram is a polished gallery where conversation dies in comments. X is a conversation engine where images are attachments. Mosaic is built for the space between: a frame starts a real thread, and every profile works as a portfolio.

The loop is short. Post one frame and a short take. Followers reply in a thread attached to the image. Explore surfaces frames whose conversations are still moving. Profiles stay public so the work can travel.

The product is Mosaic. The folder, deployment domain and repository name are unchanged.

## Product capabilities

**Following and Explore**
- `GET /api/posts/feed?scope=following` filters frames to accounts the viewer follows, plus the viewer's own frames, using the existing Follow model. The default scope still returns all frames.
- Two feed tabs sit above the roll. Following is home for signed-in members; Explore is the open gallery.
- Signed-out visitors land on Explore, and new registrations start there.
- Explore reads are public. Following reads require the auth cookie.
- Both tabs keep cursor pagination and cache their pages independently while the session is open.
- The right rail computes real signals from the loaded frames: most replies, frame count, reply count and like count. No invented activity.
- The rail also shows the signed-in viewer's real profile summary, bio and portfolio link.

**Conversation-first cards**
- Each card leads with the photograph, then the take as an oversized headline, the author, relative time, like count and reply count.
- The feed aggregation returns the first two replies with author avatars, so the thread appears immediately without extra requests.
- Replies are drawn on a visible cobalt line with avatar nodes. The compact thread expands into the full conversation.
- The full thread loads from the existing comments endpoint with cursor pagination and its own inline composer.
- Replies for your own account add and delete optimistically, with rollback and an inline error if the API rejects the change.
- Likes update optimistically and reconcile with the server count.
- A reply link on the rail opens and scrolls to the matching thread on the page.

**Profiles as portfolios**
- Public `/u/:username` page with avatar, bio, frame count, follower and following counts, follow state and a copy-link action.
- The portfolio grid shows the take, the date, the like count and the reply count when a frame has replies, plus a link to the full photograph.
- Owners can edit their bio inline, post a new frame, copy the profile link and follow the same public URL rules as visitors.
- Signed-out visitors can read profiles and threads, and are asked to sign in before writing.

**Publishing**
- Protected `/create-post` route with drag and drop, local preview and inline errors.
- Browser-side resize to 1600 px and JPEG compression at about 0.82 quality before upload.
- Server accepts JPEG, PNG and WebP only, up to 5 MB, with MIME and file-signature checks.
- The original ImageKit URL is stored. Feed and portfolio thumbnails use an 800 px, quality 80 transformation URL.
- Owners can delete their own frames. Likes and replies are removed with the frame.

**Account settings**
- Protected `/settings` with account summary, password change, JSON export and account deletion.
- Password changes invalidate every session through `tokenVersion`.
- The export covers the account, frames, replies, likes and follow relationships in both directions, without the password hash.
- Account deletion requires the password and a typed `DELETE` confirmation. ImageKit originals remain at their URLs.
- The shared demo account is protected from password changes and deletion.
- Privacy and terms links appear on settings, legal pages and the feed rail.

**Security baseline**
- `helmet` security headers.
- `express-rate-limit`: 10 requests/minute per IP on auth routes, 5/minute on password, export and deletion, 30/minute on posts and comments.
- JWT in an `httpOnly`, `SameSite=Lax`, `Secure` cookie in production; bcrypt password hashing.
- Session JWTs carry a `tokenVersion`. A password change increments it and invalidates older tokens.
- Reply and bio length limits on both client and server.
- CORS restricted to the production app and local development origins.
- `trust proxy` set for Render and Vercel deployments.

**Public pages and discovery**
- `/privacy` and `/terms` describe what Mosaic stores, the processors it uses, account export and deletion, and the rules for the beta service.
- `robots.txt`, `sitemap.xml`, a canonical URL and Open Graph metadata cover search and sharing basics.
- Vercel Analytics runs in the app root and needs no environment variables.

## Design direction

The interface is a gallery after hours: a deep ink room, warm gallery-white frames, cobalt for the conversation line and vermilion for the active voice. Instrument Serif carries the oversized display type; Space Grotesk keeps the body, labels and controls clean and legible.

The signature element is the thread itself. It is attached to the frame with a cobalt connector, runs down the left edge of the replies, and uses avatar nodes instead of generic comment rows.

- Desktop uses a fixed left rail. Mobile uses a top bar and a five-item bottom dock for members.
- Warm cards on dark stock create the same contrast as prints mounted on a gallery wall.
- Every interactive control is at least 44 px tall. Focus rings switch between vermilion on ink and cobalt on paper.
- Type and surfaces are tuned for WCAG AA contrast.
- Motion is limited to card entry, a like pop and the thread line drawing in. All of it is disabled under `prefers-reduced-motion`.
- Empty, loading and error states use real copy, never placeholder activity.

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
  utils/                      feed aggregation, cursor, ImageKit transforms
frontend/
  src/
    app.routes.jsx            Router, app shell, skip link
    features/auth/            session hydration, login, register
    features/posts/           feeds, cards, thread, create page, rail
    features/users/           public portfolio page
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

All routes are prefixed with `/api`. Feed writes, replies, follows and account settings require the auth cookie. The feed read and reply reads also work for signed-out visitors; `scope=following` still requires a session.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create account |
| `POST` | `/auth/login` | Public | Sign in, set cookie |
| `GET` | `/auth/get-me` | Cookie | Current user |
| `POST` | `/auth/logout` | Cookie | Clear the auth cookie |
| `PATCH` | `/auth/password` | Cookie | Change password (`{ currentPassword, newPassword }`) and sign out all sessions |
| `GET` | `/auth/export` | Cookie | Download account, frames, replies, likes and follow relationships as JSON |
| `DELETE` | `/auth/account` | Cookie | Delete account (`{ password }`), its records and current session |
| `GET` | `/posts/feed?scope=all&cursor=&limit=10` | Public | Cursor-paginated feed. Use `scope=following` for followed accounts only |
| `GET` | `/posts/feed?scope=following&cursor=&limit=10` | Cookie | Following feed, including your own frames |
| `POST` | `/posts` | Cookie | Upload a frame (`multipart`, field `image`) |
| `DELETE` | `/posts/:postId` | Cookie | Delete own frame |
| `POST` | `/posts/like/:postId` | Cookie | Like (idempotent) |
| `POST` | `/posts/unlike/:postId` | Cookie | Unlike (idempotent) |
| `GET` | `/posts/:postId/comments?cursor=&limit=20` | Public | Reply thread |
| `POST` | `/posts/:postId/comments` | Cookie | Add reply (`{ text }`) |
| `DELETE` | `/posts/:postId/comments/:commentId` | Cookie | Delete own reply |
| `GET` | `/users/:username?cursor=&limit=12` | Public | Public profile and paginated portfolio |
| `PATCH` | `/users/me` | Cookie | Update `bio` and/or `profile_image` URL |
| `POST` | `/users/follow/:username` | Cookie | Follow |
| `POST` | `/users/unfollow/:username` | Cookie | Unfollow |

Pagination responses include `nextCursor`; pass it back as `cursor` for the next page. A `null` cursor means the end of the view.

Feed responses also include `scope` and, for each frame, `recentComments` with the first two replies (text, author username, avatar and timestamp).

## Data model notes

- `Post`, `User`, `Follow` and `Comment` use Mongoose timestamps. Existing frames without `createdAt` are still returned; they sort after dated frames and render without a time.
- `Post` keeps `likesCount` and `commentsCount` counters, while feed and profile reads compute counts with `$lookup` so older frames stay accurate.
- Feed reads add a `$lookup` for the first two comments and their author avatars. Portfolio reads skip that lookup.
- `Comment` stores `post`, `user` (username), `text` (max 500), and timestamps. The UI calls these replies; the collection and endpoints keep the existing comments name.
- `Follow` stores username pairs and status. Both feed scopes and profile counts ignore rejected follows.
- `User` keeps `tokenVersion` (default `0`). Password changes increment it, so older JWTs are rejected.
- Deleting a frame removes its database record, likes and comments. The ImageKit original stays in place.
- Deleting an account removes its comments, likes, both follow directions, frames, current blacklist entry and user record. ImageKit originals stay in place.

## Deployment notes

- The API runs on Render's free plan, so the first request after idle can take around 50 seconds.
- CORS is restricted to the production app origin plus localhost.
- Uploads require a valid ImageKit private key on the API.
- `frontend/vercel.json` rewrites client routes to `index.html` and proxies `/api` to Render.
- Auth cookies are `Secure`; local development should use the deployed API or serve the local API over HTTPS if you need cookie auth.
- The new feed scope, public Explore reads and inline reply previews require deploying the updated backend. Until then, the frontend can still render the older feed shape with empty thread previews.

## Verification

```bash
# Backend syntax
find . -name "*.js" -not -path "./node_modules/*" -exec node --check {} \;

# Frontend
cd frontend
npm run lint
npm run build
```
