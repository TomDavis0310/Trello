import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/authController.js";

export async function POST(request) {
  const body = await request.json();
  const r = ctrl.register(body);
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
