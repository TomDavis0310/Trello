import * as svc from "../services/authService.js";

function ok(data, status = 200) {
  return { data, status };
}
function fail(err) {
  return { error: err.message, status: err.status || 500 };
}

export function login(body) {
  try {
    return ok(svc.login(body?.email, body?.password));
  } catch (e) {
    return fail(e);
  }
}

export function register(body) {
  try {
    return ok(svc.register(body?.email, body?.password), 201);
  } catch (e) {
    return fail(e);
  }
}

export function logout(headers) {
  try {
    const token = headers?.authorization?.replace("Bearer ", "");
    if (token) svc.logout(token);
    return ok({ message: "Logged out" });
  } catch (e) {
    return fail(e);
  }
}

export function getMe(headers) {
  try {
    const token = headers?.authorization?.replace("Bearer ", "");
    const user = svc.getMe(token);
    if (!user) return { error: "Unauthorized", status: 401 };
    return ok(user);
  } catch (e) {
    return fail(e);
  }
}
