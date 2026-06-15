import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/authController.js";

export async function GET(request) {
  const r = ctrl.getMe(Object.fromEntries(request.headers));
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
