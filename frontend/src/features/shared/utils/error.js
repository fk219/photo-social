export const getErrorMessage = (error, fallback) => {
  if (error?.code === "ERR_NETWORK") {
    return "PhotoSocial could not be reached. Check your connection and try again.";
  }

  const data = error?.response?.data;
  const message = data?.message || data?.error || error?.message;

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return fallback;
};
