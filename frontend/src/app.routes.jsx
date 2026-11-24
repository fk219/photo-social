import { lazy, Suspense, useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Feed from "./features/posts/pages/Feed";
import Profile from "./features/users/pages/Profile";
import Privacy from "./features/legal/pages/Privacy";
import Terms from "./features/legal/pages/Terms";
import Navbar from "./features/shared/components/Navbar";
import ProtectedRoute from "./features/shared/components/ProtectedRoute";

const CreatePost = lazy(() => import("./features/posts/pages/CreatePost"));
const PostDetail = lazy(() => import("./features/posts/pages/PostDetail"));
const Messages = lazy(() => import("./features/messages/pages/Messages"));
const Notifications = lazy(
  () => import("./features/notifications/pages/Notifications")
);
const Search = lazy(() => import("./features/search/pages/Search"));
const Saved = lazy(() => import("./features/saved/pages/Saved"));
const Settings = lazy(() => import("./features/settings/pages/Settings"));

const RouteFallback = () => (
  <main className="route-loading" role="status">
    <span className="spinner" aria-hidden="true" />
    <span>Opening Mosaic...</span>
  </main>
);

const Layout = () => {
  const location = useLocation();
  const bare = location.pathname === "/login" || location.pathname === "/register";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!bare && <Navbar />}
      <div className={`app-body${bare ? " app-body--bare" : ""}`}>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
    </>
  );
};

export const routes = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Feed scope="following" /> },
      { path: "/explore", element: <Feed scope="explore" /> },
      { path: "/search", element: <Search /> },
      { path: "/p/:postId", element: <PostDetail /> },
      { path: "/u/:username", element: <Profile /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
      {
        path: "/messages",
        element: (
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        ),
      },
      {
        path: "/messages/:conversationId",
        element: (
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        ),
      },
      {
        path: "/notifications",
        element: (
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        ),
      },
      {
        path: "/saved",
        element: (
          <ProtectedRoute>
            <Saved />
          </ProtectedRoute>
        ),
      },
      {
        path: "/create-post",
        element: (
          <ProtectedRoute>
            <CreatePost />
          </ProtectedRoute>
        ),
      },
      {
        path: "/settings",
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
