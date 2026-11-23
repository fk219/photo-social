import { createContext, useEffect, useState } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Restore the cookie session on a fresh page load so the navbar, protected
  // routes and follow buttons do not flash as signed out.
  useEffect(() => {
    let active = true;

    getMe()
      .then((data) => {
        if (active && data?.username) setUser(data);
      })
      .catch(() => {
        // No active session is a normal state for a public profile visitor.
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        setLoading,
        initializing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
