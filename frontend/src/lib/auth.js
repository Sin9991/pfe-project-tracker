import api from "./api";

export async function getCsrfCookie() {
  const response = await api.get("/auth/csrf/");
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get("/auth/me/");
  return response.data;
}

export async function loginUser({ username, password }) {
  await getCsrfCookie();
  const response = await api.post("/auth/login/", { username, password });
  return response.data;
}

export async function logoutUser() {
  const response = await api.post("/auth/logout/");
  return response.data;
}