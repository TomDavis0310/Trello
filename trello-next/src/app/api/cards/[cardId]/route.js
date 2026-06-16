import { apiResponse } from "@/lib/apiResponse.js";
import * as ctrl from "@/lib/controllers/cardController.js";

export async function GET(_req, { params }) {
  const id = Number((await params).cardId);
  const r = ctrl.getCard(id);
  return apiResponse(r);
}

export async function PUT(request, { params }) {
  const id = Number((await params).cardId);
  const body = await request.json();

  const actions = {
    comment: () => ctrl.addComment(id, body),
    deleteComment: () => ctrl.deleteComment(id, body.commentId),
    label: () => ctrl.addLabel(id, body),
    removeLabel: () => ctrl.removeLabel(id, body.labelId),
    dueDate: () => ctrl.setDueDate(id, body),
  };

  const r = actions[body?._action]
    ? actions[body._action]()
    : ctrl.updateCard(id, body);

  return apiResponse(r);
}

export async function DELETE(_req, { params }) {
  const id = Number((await params).cardId);
  const r = ctrl.deleteCard(id);
  return apiResponse(r);
}
