import { authApi } from "../../shared/api/client";

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await authApi.patch("/password", {
    currentPassword,
    newPassword,
  });
  return response.data;
};

export const exportAccount = () =>
  authApi.get("/export", { responseType: "blob" });

export const deleteAccount = async (password) => {
  const response = await authApi.delete("/account", {
    data: { password },
  });
  return response.data;
};
