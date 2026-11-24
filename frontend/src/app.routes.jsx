import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import CreatePost from "./features/posts/pages/CreatePost";
import Feed from "./features/posts/pages/Feed";
import Profile from "./features/users/pages/Profile";
import Privacy from "./features/legal/pages/Privacy";
import Terms from "./features/legal/pages/Terms";
import Settings from "./features/settings/pages/Settings";
import Navbar from "./features/shared/components/Navbar";
import ProtectedRoute from "./features/shared/components/ProtectedRoute";

const Layout = () => (
  <>
    <a className="skip-link" href="#main-content">
      Skip to content
    </a>
    <Navbar />
    <div className="app-body">
      <Outlet />
    </div>
  </>
);

export const routes = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Feed scope="following" /> },
      { path: "/explore", element: <Feed scope="explore" /> },
      { path: "/u/:username", element: <Profile /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
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
