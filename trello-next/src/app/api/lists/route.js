import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/listController.js";

export async function GET() {
  const r = ctrl.getLists();
  return NextResponse.json(r.data, { status: r.status });
}

export async function POST(request) {
  const body = await request.json();
  const r = ctrl.createList(body?.boardId ?? 1, body);
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
