import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");
  return new Groq({ apiKey });
}

// Groq free tier is very generous (30 RPM, 14,400 RPD for Llama 3).
// Still adding retry backoff just in case.
async function generateWithRetry(
  client: Groq,
  material: string,
  retries = 3
): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant", 
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
      if (!text) throw new Error("EMPTY_RESPONSE");
      return text;
    } catch (err: unknown) {
      const isLastAttempt = attempt === retries - 1;

      const is429 =
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        (err as { status?: unknown }).status === 429;

      if (is429 && !isLastAttempt) {
        const delay = 2 ** attempt * 1000; // 1s → 2s → 4s
        console.warn(
          `[material-check] 429 from Groq, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }

  throw new Error("Unreachable");
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

  const material =
    typeof body.material === "string" ? body.material.trim() : "";

  if (!material) {
    return NextResponse.json(
      { error: "Please type a material first (e.g. 'TMT bar' or 'cement')." },
      { status: 400 }
    );
  }

  if (material.length > 80) {
    return NextResponse.json(
      {
        error:
          "That's a bit long — try a short material name like 'cement' or 'tiles'.",
      },
      { status: 400 }
    );
  }

  try {
    const client = getClient();
    const text = await generateWithRetry(client, material);
    return NextResponse.json({ result: text });
  } catch (err: unknown) {
    console.error("material-check error:", err);

    if (err instanceof Error && err.message === "MISSING_API_KEY") {
      return NextResponse.json(
        {
          error:
            "Server isn't configured correctly (missing API key). Please contact the site owner.",
        },
        { status: 500 }
      );
    }

    if (err instanceof Error && err.message === "EMPTY_RESPONSE") {
      return NextResponse.json(
        {
          error: "We didn't get a usable response from the AI. Please try again.",
        },
        { status: 502 }
      );
    }

    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status?: unknown }).status) || 502
        : 502;

    if (status === 429) {
      return NextResponse.json(
        {
          error:
            "We're getting rate-limited right now. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong talking to the AI service. Please try again in a bit.",
      },
      { status: 502 }
    );
  }
}