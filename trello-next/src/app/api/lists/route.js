import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/listController.js";

export async function GET() {
  const r = ctrl.getLists();
  return apiResponse(r);
}

export async function POST(request) {
  const body = await request.json();
  const r = ctrl.createList(body?.boardId ?? 1, body);
  return apiResponse(r);
}
