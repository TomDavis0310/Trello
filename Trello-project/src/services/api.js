const TOKEN_KEY = "trello-token";
const BASE = "/api";

async function request(method, path, body) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json" };

  // Gửi duy nhất 1 chuẩn quốc tế Bearer Token lên Backend
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 🚀 XỬ LÝ LỖI 401 THÔNG MINH: Tránh vòng lặp vô tận và mất token khi kéo thả
  if (res.status === 401) {
    const isAuthRequest = path.includes("/auth/me") || path.includes("/data");

    if (isAuthRequest) {
      // Chỉ xóa token rác khi thực sự lỗi phiên đăng nhập gốc
      localStorage.removeItem(TOKEN_KEY);

      const isAtAuthPage =
        window.location.pathname.includes("/login") ||
        window.location.pathname.includes("/register");

      if (!isAtAuthPage) {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    } else {
      // Nếu dính 401 ở các request kéo thả/thao tác, báo lỗi ra console/alert để sửa Backend, KHÔNG xóa token.
      console.error(
        `🚨 Endpoint Backend [${method} ${path}] chưa cấu hình bóc tách Bearer Token nên trả về 401!`,
      );
      throw new Error(
        `Unauthorized action at: ${path}. Check backend route authentication.`,
      );
    }
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

  async logout() {
    try {
      await request("POST", "/auth/logout");
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  getCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    return request("GET", "/auth/me");
  },

  async getData() {
    return request("GET", "/data");
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

  async reorderList(listId, targetListId) {
    return request("PUT", `/lists/${listId}`, { targetListId });
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

  async moveCard(cardId, targetListId) {
    return request("POST", "/cards", { _action: "move", cardId, targetListId });
  },

  async addComment(cardId, text, author) {
    return request("PUT", `/cards/${cardId}`, {
      _action: "comment",
      text,
      author,
    });
  },

  async deleteComment(cardId, commentId) {
    return request("PUT", `/cards/${cardId}`, {
      _action: "deleteComment",
      commentId,
    });
  },

  async addLabel(cardId, color, text) {
    return request("PUT", `/cards/${cardId}`, {
      _action: "label",
      color,
      text,
    });
  },

  async removeLabel(cardId, labelId) {
    return request("PUT", `/cards/${cardId}`, {
      _action: "removeLabel",
      labelId,
    });
  },

  async setDueDate(cardId, dueDate) {
    return request("PUT", `/cards/${cardId}`, { _action: "dueDate", dueDate });
  },
};
