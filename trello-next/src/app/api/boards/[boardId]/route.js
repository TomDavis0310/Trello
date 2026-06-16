import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/boardController.js";

export async function GET(_req, { params }) {
  const id = Number((await params).boardId);
  const r = ctrl.getBoard(id);
  return apiResponse(r);
}

export async function PUT(request, { params }) {
  const id = Number((await params).boardId);
  const body = await request.json();
  const r = ctrl.updateBoard(id, body);
  return apiResponse(r);
}

export async function DELETE(_req, { params }) {
  const id = Number((await params).boardId);
  const r = ctrl.deleteBoard(id);
  return apiResponse(r);
}
