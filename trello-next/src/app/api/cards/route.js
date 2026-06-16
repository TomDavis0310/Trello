import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/cardController.js";

export async function POST(request) {
  const body = await request.json();

  if (body?._action === "move") {
    const r = ctrl.moveCard(body);
    return apiResponse(r);
  }

  const r = ctrl.createCard(body);
  return apiResponse(r);
}
