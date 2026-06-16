import { NextResponse } from "next/server";

export function apiResponse(result) {
  return NextResponse.json(
    result.error ? { error: result.error } : result.data,
    { status: result.status },
  );
}
