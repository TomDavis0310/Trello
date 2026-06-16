import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/authController.js";

export async function GET(request) {
  const r = ctrl.getMe(Object.fromEntries(request.headers));
  return apiResponse(r);
}
