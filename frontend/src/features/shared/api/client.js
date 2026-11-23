import axios from "axios";

// Optional: point a local build at http://localhost:3006. Production keeps
// using the deployed API when the variable is absent.
const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  "https://insta-clone-backend-n518.onrender.com"
).replace(/\/$/, "");

const createClient = (path) =>
  axios.create({
    baseURL: `${API_ORIGIN}${path}`,
    withCredentials: true,
  });

export const authApi = createClient("/api/auth");
export const postApi = createClient("/api/posts");
export const userApi = createClient("/api/users");
