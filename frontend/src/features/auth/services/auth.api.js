import { authApi } from "../../shared/api/client";

export const login = async (username, password) => {
  const response = await authApi.post("/login", {
    username,
    password,
  });
  return response.data;
};

export const register = async (email, username, password) => {
  const response = await authApi.post("/register", {
    email,
    username,
    password,
  });
  return response.data;
};

export const getMe = async () => {
  const response = await authApi.get("/get-me");
  return response.data;
};

export const logout = async () => {
  const response = await authApi.post("/logout");
  return response.data;
};
