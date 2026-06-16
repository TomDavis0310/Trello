import { apiResponse } from "@/lib/apiResponse.js";
import * as db from "@/lib/data/mockData.js";

export async function GET(request) {
  const headers = Object.fromEntries(request.headers);
  const token = headers?.authorization?.replace("Bearer ", "");
  const user = db.getUserByToken(token);
  if (!user) {
    return apiResponse({ error: "Unauthorized", status: 401 });
  }
  const data = db.getUserData(user.id);
  return apiResponse({ data, status: 200 });
}
