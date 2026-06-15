import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/boardController.js";

export async function GET(request) {
  const r = ctrl.getBoards(Object.fromEntries(request.headers));
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}

export async function POST(request) {
  const body = await request.json();
  const r = ctrl.createBoard(body, Object.fromEntries(request.headers));
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
