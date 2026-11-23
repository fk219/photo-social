import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <main className="route-loading" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>Opening your journal…</span>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
