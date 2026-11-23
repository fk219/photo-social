import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, register } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  const { user, setUser, loading, setLoading } = context;

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
      const response = await register(username, email, password);
      setUser(response.user);
      return response;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  return {
    user,
    loading,
    handleLogin,
    handleRegister,
    handleLogout,
  };
};
