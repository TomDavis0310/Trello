import { NextResponse } from "next/server";
import * as db from "@/lib/data/mockData.js";

export async function GET(request) {
  const headers = Object.fromEntries(request.headers);
  const token = headers?.authorization?.replace("Bearer ", "");
  const user = db.getUserByToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = db.getUserData(user.id);
  return NextResponse.json(data);
}
