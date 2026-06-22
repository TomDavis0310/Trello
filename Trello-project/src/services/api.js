const TOKEN_KEY = "trello-token";
const BASE = "/api";

async function request(method, path, body) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    const isAtAuthPage =
      window.location.pathname.includes("/login") ||
      window.location.pathname.includes("/register");
    if (!isAtAuthPage) {
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  async login(email, password) {
    const data = await request("POST", "/auth/login", { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  async register(email, password) {
    const data = await request("POST", "/auth/register", { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.user;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    return request("GET", "/auth/me");
  },

  async createBoard(name) {
    return request("POST", "/boards", { name });
  },

  async updateBoard(id, data) {
    return request("PUT", `/boards/${id}`, data);
  },

  async deleteBoard(id) {
    return request("DELETE", `/boards/${id}`);
  },

  async getBoards() {
    return request("GET", "/boards");
  },

  async getBoard(id) {
    return request("GET", `/boards/${id}`);
  },

  async createList(boardId, name) {
    return request("POST", "/lists", { boardId, name });
  },

  async updateList(id, data) {
    return request("PUT", `/lists/${id}`, data);
  },

  async deleteList(id) {
    return request("DELETE", `/lists/${id}`);
  },

  async reorderList(id, body) {
    return request("PUT", `/lists/${id}/reorder`, body);
  },

  async createCard(listId, title) {
    return request("POST", "/cards", { listId, title });
  },

  async updateCard(id, data) {
    return request("PUT", `/cards/${id}`, data);
  },

  async deleteCard(id) {
    return request("DELETE", `/cards/${id}`);
  },

  async moveCard(id, body) {
    return request("PUT", `/cards/${id}/move`, body);
  },

  async addComment(cardId, text, author) {
    return request("POST", `/cards/${cardId}/comments`, { text, author });
  },

  async deleteComment(cardId, commentId) {
    return request("DELETE", `/cards/${cardId}/comments/${commentId}`);
  },

  async addLabel(cardId, body) {
    return request("POST", `/cards/${cardId}/labels`, body);
  },

  async removeLabel(cardId, labelId) {
    return request("DELETE", `/cards/${cardId}/labels/${labelId}`);
  },

  async setDueDate(cardId, body) {
    return request("PUT", `/cards/${cardId}/due-date`, body);
  },
};
