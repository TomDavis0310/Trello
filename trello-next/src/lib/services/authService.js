import * as db from "../data/mockData.js";

export function login(email, password) {
  const user = db.findUserByEmail(email);
  if (!user || user.password !== password) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }
  const token = db.createSession(user.id);
  const { password: _, ...safe } = user;
  return { user: safe, token };
}

export function register(email, password) {
  if (db.findUserByEmail(email)) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }
  const user = db.createUser(email, password);
  const token = db.createSession(user.id);
  return { user, token };
}

export function logout(token) {
  db.deleteSession(token);
}

export function getMe(token) {
  const user = db.getUserByToken(token);
  if (!user) return null;
  const { password: _, ...safe } = user;
  return safe;
}
