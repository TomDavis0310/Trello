// === Mock API ===
// Giả lập backend xác thực, lưu người dùng vào localStorage.
// Các hàm đều mô phỏng async (setTimeout 300ms) để giống network request thật.
// `authStore` gọi các phương thức này để thực hiện login/register/logout.

const STORAGE_KEY = "trello-users";

// Lấy danh sách users từ localStorage
function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Ghi danh sách users vào localStorage
function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// Loại bỏ trường password khỏi object user trước khi lưu session hoặc trả về
function stripPassword(user) {
  const safe = { ...user };
  delete safe.password;
  return safe;
}

// Lưu user hiện tại vào session (localStorage) – dùng để duy trì đăng nhập
function setCurrentUser(user) {
  localStorage.setItem(
    "trello-current-user",
    JSON.stringify(stripPassword(user)),
  );
}

export const api = {
  // === login ===
  // Tìm user trong danh sách theo email + password, nếu khớp thì set session và trả về.
  // Nếu không tìm thấy, ném lỗi "Invalid email or password".
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

  // === register ===
  // Kiểm tra email đã tồn tại chưa; nếu chưa thì tạo user mới, lưu và set session.
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

  // === logout ===
  // Xóa session user khỏi localStorage
  async logout() {
    localStorage.removeItem("trello-current-user");
  },

  // === getCurrentUser ===
  // Lấy user của session hiện tại (nếu có)
  getCurrentUser() {
    const raw = localStorage.getItem("trello-current-user");
    return raw ? JSON.parse(raw) : null;
  },
};
