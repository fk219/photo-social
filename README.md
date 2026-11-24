# Mosaic

A full social photo app built on the Insta Clone codebase: feed, stories, direct messages, notifications, search, saved posts, threaded comments, follows and profiles.

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

Mosaic is an Instagram-style social app with the full social loop: share photos and stories, follow people, talk in comment threads, send direct messages, get notifications, search for people and posts, and save what you want to come back to.

The product is Mosaic. The folder, deployment domain and repository name remain `Insta Clone`, `insta-clone.furqankhan.dev` and `Insta-Clone` so existing links keep working.

## Product capabilities

**Feed and stories**
- Following feed for signed-in members, with their own posts plus posts from accounts they follow.
- Public Explore grid for everyone, including signed-out visitors.
- Slim Following and Explore tabs above a centered 500 px column.
- Story rail above the Following feed with your own story, followed accounts, unseen rings and a full-screen story viewer.
- Stories auto-advance, support keyboard navigation and expire after 24 hours.
- Cursor pagination, per-tab page caching and a warmed stale-while-revalidate cache for guest reads.

**Posts**
- Instagram-style card: author, image, like, comment, share and save actions, like count, caption, recent comments and relative time.
- Double tap the photo to like it, with a heart animation.
- Likes update optimistically and reconcile with the server count. The likes count opens the real list of people who liked the post.
- Save posts to a private Saved grid.
- Share a post by copying its link, using the device share sheet, or sending it in a direct message.
- Owners can delete their own posts. Likes, comments, saves and related notifications are removed with the post.
- Post detail routes at `/p/:postId` make shared links work.
- Captions support `@mentions` and `#hashtags` as real links.

**Comments**
- Top-level comments with one level of replies.
- Comment likes with optimistic updates.
- Reply composer with a visible "Replying to" context and cancel action.
- Load earlier comments and load all replies.
- Comment authors can delete their own comments or replies.
- Mentions in comments create notifications.

**Direct messages**
- Two-pane inbox and chat on desktop; single-pane inbox and chat on mobile.
- Conversation list with search, display names, last message, relative time and unread counts.
- Real message bubbles, day dividers, shared post cards, seen state and an accessible composer.
- Enter sends, Shift+Enter adds a new line.
- Polling for new messages only while the tab is visible, with incremental `after` requests.
- Start a conversation from a profile, from the inbox, or from the share sheet.
- Unread message badge in the navigation.

**Notifications**
- Like, comment, reply, follow and mention notifications.
- Grouped by Today, This week and Earlier.
- Unread state, mark one or mark all as read, and an unread badge in the navigation.
- Clicking a notification opens the related post, comment context or profile.
- Notifications are never created for your own activity.

**Search and discovery**
- Search people by username or name, posts by caption, and hashtags.
- Tabs for All, People, Posts and Tags.
- Debounced queries with stale-response protection.
- Recent searches stored locally and trending tags from recent captions.
- Suggested accounts and follow buttons.
- Followers and following lists open from the profile stats.

**Profiles and account**
- Public profile with display name, username, avatar, bio and real counts.
- Posts grid with the shared post modal.
- Follow, Message, Share profile and an account actions menu.
- Edit profile dialog with name, bio and avatar upload.
- Blocking and reporting from profiles.
- Account settings with password change, JSON export, blocked accounts and account deletion.
- The shared demo account is protected from password changes and deletion.

**Safety**
- Block an account to remove both follow directions and prevent following, messaging or seeing each other in feeds and search.
- Report a user, post or comment with a reason and optional details.
- Privacy and terms pages describe the social features, messages, stories, saves and reports.

**Technical baseline**
- `helmet` security headers.
- `express-rate-limit` on auth, account, post, social and media routes.
- JWT in an `httpOnly`, `SameSite=Lax`, `Secure` cookie in production; bcrypt password hashing.
- Session JWTs carry a `tokenVersion`. A password change increments it and invalidates older tokens.
- Input validation and length limits on every write endpoint.
- CORS restricted to the production app and local development origins.
- `trust proxy` set for Render and Vercel deployments.
- Image uploads are MIME-checked and signature-checked, capped at 5 MB, and stored in ImageKit.

## Design direction

A light, familiar social surface: `#fafafa` background, white cards, `#dbdbdb` hairlines, near-black text, `#0095f6` for primary actions and a restrained red for likes and errors. The wordmark is a bold sans; the rest of the interface uses a system font stack.

- Desktop uses one top bar with the wordmark, Home, Explore, Messages, Notifications and Create, then search and an avatar menu.
- The feed is a single centered column. Explore and profiles use the shared three-column grid and post modal.
- Below 760 px the top bar becomes compact and a five-item bottom navigation carries Home, Explore, Create, Messages and Profile.
- The story viewer is the one intentionally dark surface, so photos stay the focus.
- Every interactive control is at least 44 px tall, with visible focus states.
- Type and surfaces are tuned for WCAG AA contrast.
- Motion is limited to card entry, a like pop, heart burst and modal transitions. All of it is disabled under `prefers-reduced-motion`.
- Empty, loading and error states use real copy, never placeholder activity. Skeletons cover the feed, Explore grid, profile, search and messages.

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
  routes/                     auth, posts, users, messages, notifications, search, stories
  controllers/                auth, posts, comments, users, messages, notifications, search, stories
  models/                     User, Post, Comment, Like, CommentLike, Follow, Save, Story,
                              Conversation, Message, Notification, Block, Report, Blacklist
  middleware/                 JWT auth, rate limits, uploads, error handling
  utils/                      feed aggregation, cursor, feed cache, notifications, ImageKit
frontend/
  src/
    app.routes.jsx            Router, app shell, skip link
    features/auth/            session hydration, login, register
    features/posts/           feeds, cards, grid, modal, comments, likes, share, post detail
    features/messages/        inbox, chat, new message, conversation hook
    features/notifications/   activity page
    features/search/          people, posts and tags
    features/saved/           saved posts
    features/stories/         story rail, viewer and composer
    features/users/           public profile, edit profile, follow lists, profile menu
    features/settings/        account settings, export, blocked accounts, deletion
    features/social/          unread badge context and hooks
    features/legal/           privacy and terms pages
    features/shared/          navigation, dialogs, avatar, rich text, API clients
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
| `CORS_ORIGINS` | No | Comma-separated allowed origins; production and localhost defaults |

## API

All routes are prefixed with `/api`. Post writes, comments, messages, notifications, saves, stories, follows and account settings require the auth cookie. Feed, post detail, profile and comment reads also work for signed-out visitors; `scope=following` and social features still require a session.

### Auth and account

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create account (`name` optional) |
| `POST` | `/auth/login` | Public | Sign in, set cookie |
| `GET` | `/auth/get-me` | Cookie | Current user |
| `POST` | `/auth/logout` | Cookie | Clear the auth cookie |
| `PATCH` | `/auth/password` | Cookie | Change password and sign out all sessions |
| `GET` | `/auth/export` | Cookie | Download account, social and media records as JSON |
| `DELETE` | `/auth/account` | Cookie | Delete the account and all related records |

### Posts, comments and saves

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/posts/feed?scope=all&cursor=&limit=10` | Public | Cursor-paginated feed |
| `GET` | `/posts/feed?scope=following&cursor=&limit=10` | Cookie | Following feed |
| `POST` | `/posts` | Cookie | Upload a post (`multipart`, field `image`) |
| `GET` | `/posts/saved?cursor=&limit=12` | Cookie | Saved posts |
| `GET` | `/posts/:postId` | Optional | Full post detail |
| `DELETE` | `/posts/:postId` | Cookie | Delete own post |
| `POST` | `/posts/:postId/save` | Cookie | Save a post |
| `DELETE` | `/posts/:postId/save` | Cookie | Remove a saved post |
| `GET` | `/posts/:postId/likes` | Optional | People who liked the post |
| `POST` | `/posts/like/:postId` | Cookie | Like a post |
| `POST` | `/posts/unlike/:postId` | Cookie | Unlike a post |
| `GET` | `/posts/:postId/comments` | Public | Top-level comments with reply previews |
| `POST` | `/posts/:postId/comments` | Cookie | Add a comment or reply (`parentId` optional) |
| `DELETE` | `/posts/:postId/comments/:commentId` | Cookie | Delete own comment or reply |
| `GET` | `/posts/:postId/comments/:commentId/replies` | Public | Paginated replies |
| `POST` | `/posts/:postId/comments/:commentId/like` | Cookie | Like a comment |
| `DELETE` | `/posts/:postId/comments/:commentId/like` | Cookie | Unlike a comment |

### Direct messages and notifications

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/messages/conversations` | Cookie | Conversation list with unread counts |
| `POST` | `/messages/conversations` | Cookie | Get or start a conversation (`username`) |
| `GET` | `/messages/conversations/:id` | Cookie | Messages, supports `after` polling |
| `POST` | `/messages/conversations/:id/messages` | Cookie | Send text or a shared post |
| `POST` | `/messages/conversations/:id/read` | Cookie | Mark the conversation read |
| `GET` | `/messages/unread-count` | Cookie | Unread message badge count |
| `GET` | `/notifications` | Cookie | Paginated notifications |
| `POST` | `/notifications/read-all` | Cookie | Mark every notification read |
| `POST` | `/notifications/:id/read` | Cookie | Mark one notification read |
| `GET` | `/notifications/unread-count` | Cookie | Unread notification badge count |

### Users, follows, blocks and reports

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/users/:username` | Optional | Profile and posts |
| `PATCH` | `/users/me` | Cookie | Update name, bio or profile image URL |
| `POST` | `/users/me/avatar` | Cookie | Upload an avatar (`multipart`, field `image`) |
| `GET` | `/users/:username/followers` | Optional | Followers |
| `GET` | `/users/:username/following` | Optional | Following |
| `GET` | `/users/suggested` | Cookie | Suggested accounts |
| `GET` | `/users/blocked` | Cookie | Blocked accounts |
| `POST` | `/users/follow/:username` | Cookie | Follow |
| `POST` | `/users/unfollow/:username` | Cookie | Unfollow |
| `POST` | `/users/:username/block` | Cookie | Block an account |
| `DELETE` | `/users/:username/block` | Cookie | Unblock an account |
| `POST` | `/users/:username/report` | Cookie | Report an account |

### Search and stories

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/search?q=&type=all` | Optional | People, posts and tags |
| `GET` | `/search/trending` | Public | Trending hashtags |
| `GET` | `/stories/feed` | Cookie | Story groups for the rail |
| `GET` | `/stories/:username` | Cookie | One account's stories |
| `POST` | `/stories` | Cookie | Upload a story (`multipart`, field `image`) |
| `POST` | `/stories/:id/seen` | Cookie | Mark a story seen |
| `DELETE` | `/stories/:id` | Cookie | Delete own story |

Pagination responses include `nextCursor`; pass it back as `cursor` for the next page. A `null` cursor means the end of the view.

Feed and post responses include `isSaved`, `isLiked`, recent top-level comments and the author's follow state. Message responses include `readBy` and `isMine`.

## Data model notes

- `User` keeps `name`, `bio`, `profile_image`, `tokenVersion` and timestamps.
- `Post` keeps `likesCount` and `commentsCount` counters; feed, saved and profile reads compute counts with `$lookup` so older posts stay accurate.
- `Comment` stores `post`, `user`, `text`, optional `parent`, `likesCount` and timestamps. Only one reply level is allowed.
- `CommentLike` stores one record per member and comment.
- `Like`, `Follow`, `Save` and `Block` use unique indexes to prevent duplicates.
- `Conversation` stores two participants, a unique `pairKey`, last message metadata and per-member unread counts.
- `Message` stores sender, text or shared post, `readBy` and timestamps.
- `Notification` stores recipient, actor, type, related post or comment, and read state.
- `Story` stores an image, caption, `seenBy`, `expiresAt` and a TTL index that removes expired rows.
- `Report` stores the reporter, target type, target id and reason.
- Deleting a post removes its database record, likes, comments, saves and related notifications. The ImageKit original stays in place.
- Deleting an account removes its messages, conversations, notifications, saves, stories, blocks, reports, comment likes, comments, posts, likes and follows. ImageKit originals stay in place.

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
