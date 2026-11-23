import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, logout, register } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  const { user, setUser, loading, setLoading, initializing } = context;

  const handleLogin = async (username, password) => {
    setLoading(true);

    try {
      const response = await login(username, password);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email, username, password) => {
    setLoading(true);

    try {
      const response = await register(email, username, password);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Clear the interface immediately; the cookie revocation can settle in
    // the background so a cold API never traps the user in a signed-in state.
    setUser(null);
    logout().catch(() => {
      // The local session is already cleared; a refresh will re-check the API.
    });
  };

  const updateUser = (updates) => {
    setUser((current) =>
      current ? { ...current, ...updates } : current
    );
  };

  return {
    user,
    initializing,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
    updateUser,
  };
};
