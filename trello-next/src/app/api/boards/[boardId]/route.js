import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/boardController.js";

export async function GET(_req, { params }) {
  const id = Number((await params).boardId);
  const r = ctrl.getBoard(id);
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}

export async function PUT(request, { params }) {
  const id = Number((await params).boardId);
  const body = await request.json();
  const r = ctrl.updateBoard(id, body);
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}

export async function DELETE(_req, { params }) {
  const id = Number((await params).boardId);
  const r = ctrl.deleteBoard(id);
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
