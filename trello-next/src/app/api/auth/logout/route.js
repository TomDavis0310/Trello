import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/authController.js";

export async function POST(request) {
  const r = ctrl.logout(Object.fromEntries(request.headers));
  return apiResponse(r);
}
