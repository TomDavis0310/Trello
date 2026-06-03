// Mock API nhẹ lưu users vào localStorage.
// File này giả lập các gọi bất đồng bộ (như network) và cung cấp
// các hàm auth tối thiểu để `authStore` sử dụng.
const STORAGE_KEY = "trello-users";

function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function stripPassword(user) {
  const safe = { ...user };
  delete safe.password;
  return safe;
}

function setCurrentUser(user) {
  // store a safe user object for session usage
  localStorage.setItem(
    "trello-current-user",
    JSON.stringify(stripPassword(user)),
  );
}

export const api = {
  // Giả lập login: trả về user (không có password) hoặc ném lỗi.
  async login(email, password) {
    await new Promise((r) => setTimeout(r, 300));
    const users = getUsers();
    const user = users.find(
      (u) => u.email === email && u.password === password,
    );
    if (!user) throw new Error("Invalid email or password");
    setCurrentUser(user);
    return stripPassword(user);
  },

  // Giả lập đăng ký và lưu credentials cục bộ.
  async register(email, password) {
    await new Promise((r) => setTimeout(r, 300));
    const users = getUsers();
    if (users.find((u) => u.email === email)) {
      throw new Error("Email already registered");
    }
    const user = { id: Date.now(), email, password, name: email.split("@")[0] };
    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    return stripPassword(user);
  },

  async logout() {
    localStorage.removeItem("trello-current-user");
  },

  // Trả về user của session hiện tại (hoặc null).
  getCurrentUser() {
    const raw = localStorage.getItem("trello-current-user");
    return raw ? JSON.parse(raw) : null;
  },
};
