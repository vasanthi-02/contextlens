import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { repo, question } = await req.json();

    if (!repo || typeof repo !== "string") {
      return NextResponse.json({ error: "Missing 'repo' text." }, { status: 400 });
    }
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing 'question'." }, { status: 400 });
    }

    const result = await runAgent(repo, question);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
