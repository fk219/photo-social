# Insta Clone

A photo journal: a quiet feed of image posts, likes, and a small publishing flow, built as a full-stack app rather than a static gallery.

**Live app:** https://insta-clone.furqankhan.dev
**API:** https://insta-clone-backend-n518.onrender.com

![Insta Clone](docs/preview.png)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![ImageKit](https://img.shields.io/badge/ImageKit-media-0B0D0E)
![Render](https://img.shields.io/badge/API-Render-46E3B7)
![Vercel](https://img.shields.io/badge/Web-Vercel-000000?logo=vercel&logoColor=white)

## What it is

A full-stack photo sharing app with real accounts, real uploads, and a persisted feed. The frontend is styled as a printed contact sheet — frame numbers, date stamps, serif masthead — so the portfolio piece reads as an editorial photo journal instead of another social clone.

## Features

**Journal**
- Contact-sheet feed with frame numbering, white photo cards, and a desktop journal rail.
- Optional `createdAt` date stamps whenever the API supplies them.
- Like/unlike with a small pop animation, `aria-pressed`, and inline error feedback.
- Caption "Read more" toggle for long text.
- Image and avatar fallbacks when a file is missing or broken.
- Feed skeletons, an empty state with a clear call to action, and an error state with retry.
- Responsive down to 360 px with a sticky masthead.

**Publishing**
- Register, log in, and a protected `/create-post` route that sends signed-out visitors to login and back.
- Upload a photo to ImageKit with an instant local preview, write a caption, and publish.
- Loading, disabled, and inline error states for uploads.
- Navbar shows the signed-in user with avatar and name, plus a logout action.

**Backend**
- JWT in an `httpOnly`, `SameSite=None`, `Secure` cookie; bcrypt password hashing.
- Image uploads streamed to ImageKit, only the URL is stored.
- Follow/unfollow endpoints wired at the API level.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, react-router-dom, Sass design tokens |
| Backend | Node.js, Express 5, Mongoose, JWT, bcrypt, multer, ImageKit |
| Hosting | Vercel (web), Render (API), MongoDB Atlas (database) |

## Project structure

```
backend/
  server.js
  src/app.js                 Express app + CORS
  routes/                    auth, posts, users
  controllers/               register, login, me, create, feed, like, follow
  models/                    User, Post
frontend/
  src/
    app.routes.jsx           Router + layout
    features/auth/           auth context, pages, API client
    features/posts/          feed, post card, create page, context
    features/shared/         navbar, avatar, tokens, global styles
```

## Run locally

```bash
# API
cd backend
npm install
cp .env.example .env         # Mongo, JWT and ImageKit keys
npm start                    # http://localhost:3000

# Web
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

### Environment variables

| Key | Purpose |
|---|---|
| `PORT` | API port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs auth cookies |
| `IMAGEKIT_PRIVATE_KEY` | Server-side uploads |

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account |
| `POST` | `/api/auth/login` | — | Sign in, set cookie |
| `GET` | `/api/auth/get-me` | Cookie | Current user |
| `POST` | `/api/posts` | Cookie | Upload a post (multipart) |
| `GET` | `/api/posts/feed` | Cookie | Personal feed |
| `POST` | `/api/posts/like/:postId` | Cookie | Like |
| `POST` | `/api/posts/unlike/:postId` | Cookie | Unlike |
| `POST` | `/api/posts/details/:postId` | Cookie | Single post |
| `POST` | `/api/users/follow/:username` | Cookie | Follow |
| `POST` | `/api/users/unfollow/:username` | Cookie | Unfollow |

## Deployment notes

- The API runs on Render's free plan, so the first request after idle can take ~50 seconds.
- CORS is restricted to the production app URL plus localhost.
- Uploads require a valid ImageKit private key on the API.
- `frontend/vercel.json` rewrites client routes to `index.html`.
