import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/boardController.js";

export async function GET(request) {
  const r = ctrl.getBoards(Object.fromEntries(request.headers));
  return apiResponse(r);
}

export async function POST(request) {
  const body = await request.json();
  const r = ctrl.createBoard(body, Object.fromEntries(request.headers));
  return apiResponse(r);
}
