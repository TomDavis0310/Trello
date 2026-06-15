import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/listController.js";

export async function GET(_req, { params }) {
  const r = ctrl.getList(Number((await params).listId));
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}

export async function PUT(request, { params }) {
  const id = Number((await params).listId);
  const body = await request.json();

  const r = body?.targetListId
    ? ctrl.reorderList(id, body)
    : ctrl.updateList(id, body);

  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}

export async function DELETE(_req, { params }) {
  const r = ctrl.deleteList(Number((await params).listId));
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
