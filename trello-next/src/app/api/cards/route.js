import { NextResponse } from "next/server";
import * as ctrl from "@/lib/controllers/cardController.js";

export async function POST(request) {
  const body = await request.json();

  if (body?._action === "move") {
    const r = ctrl.moveCard(body);
    return NextResponse.json(r.error ? { error: r.error } : r.data, {
      status: r.status,
    });
  }

  const r = ctrl.createCard(body);
  return NextResponse.json(r.error ? { error: r.error } : r.data, {
    status: r.status,
  });
}
