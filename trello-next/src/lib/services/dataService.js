import * as db from "../data/mockData.js";

export function getFullData(userId) {
  if (!userId) return null;
  return db.getUserData(userId);
}
