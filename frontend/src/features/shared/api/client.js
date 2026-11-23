import axios from "axios";

// Optional: point a local build at http://localhost:3006. Production calls
// /api on its own origin, which Vercel rewrites to the Render service.
const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  ""
).replace(/\/$/, "");

const createClient = (path) =>
  axios.create({
    baseURL: `${API_ORIGIN}${path}`,
    withCredentials: true,
  });

export const authApi = createClient("/api/auth");
export const postApi = createClient("/api/posts");
export const userApi = createClient("/api/users");
