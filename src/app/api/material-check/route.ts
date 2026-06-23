import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// We create the client lazily inside the handler (not at module load time).
// Reason: if OPENAI_API_KEY is missing, we want to return a clean JSON error
// instead of crashing the whole serverless function at import time.
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  let body: { material?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Couldn't read your request. Please try again." },
      { status: 400 }
    );
  }

  const material = typeof body.material === "string" ? body.material.trim() : "";

  // Empty input case — handled server-side too, not just in the UI,
  // since the API route should never trust the client alone.
  if (!material) {
    return NextResponse.json(
      { error: "Please type a material first (e.g. 'TMT bar' or 'cement')." },
      { status: 400 }
    );
  }

  if (material.length > 80) {
    return NextResponse.json(
      { error: "That's a bit long — try a short material name like 'cement' or 'tiles'." },
      { status: 400 }
    );
  }

  try {
    const client = getClient();

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a practical home-buying assistant for first-time homeowners in Kanpur, India. Be concise and concrete.",
        },
        {
          role: "user",
          content: `List 3 things a first-time homeowner in Kanpur should check before buying ${material}. Reply as a short numbered list (1, 2, 3), one or two sentences each. No preamble, no closing remarks.`,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const text = completion.choices[0]?.message?.content?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "We didn't get a usable response from the AI. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    // API failure case — never let this crash the route or leak raw error
    // details to the client. Log server-side for debugging, return a clean
    // message to the UI.
    console.error("material-check error:", err);

    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      return NextResponse.json(
        { error: "Server isn't configured correctly (missing API key). Please contact the site owner." },
        { status: 500 }
      );
    }

    // openai SDK errors often carry a `status` property
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: unknown }).status) || 502
        : 502;

    if (status === 429) {
      return NextResponse.json(
        { error: "We're getting rate-limited right now. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong talking to the AI service. Please try again in a bit." },
      { status: 502 }
    );
  }
}
