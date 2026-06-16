import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/listController.js";

export async function GET(_req, { params }) {
  const r = ctrl.getList(Number((await params).listId));
  return apiResponse(r);
}

export async function PUT(request, { params }) {
  const id = Number((await params).listId);
  const body = await request.json();

  const r = body?.targetListId
    ? ctrl.reorderList(id, body)
    : ctrl.updateList(id, body);

  return apiResponse(r);
}

export async function DELETE(_req, { params }) {
  const r = ctrl.deleteList(Number((await params).listId));
  return apiResponse(r);
}
