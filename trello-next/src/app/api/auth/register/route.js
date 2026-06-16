import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/authController.js";

export async function POST(request) {
  const body = await request.json();
  const r = ctrl.register(body);
  return apiResponse(r);
}
