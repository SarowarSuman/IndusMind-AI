import { GoogleGenAI } from "@google/genai";

interface VercelReq {
  method?: string;
  body?: {
    question?: string;
    context?: unknown;
    history?: Array<{ role?: string; content?: string }>;
  };
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
}

function parseGeminiError(err: unknown): { status: number; code: string; message: string } {
  const rawMsg = err instanceof Error ? err.message : String(err || "Upstream Gemini API error");
  const statusProp =
    typeof (err as { status?: unknown })?.status === "number"
      ? (err as { status: number }).status
      : 502;

  let code = "GEMINI_UPSTREAM_ERROR";
  let cleanMessage = rawMsg;

  try {
    const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed?.error?.status) code = String(parsed.error.status);
      if (parsed?.error?.message) cleanMessage = String(parsed.error.message);
    }
  } catch {
    // retain rawMsg
  }

  const status = [400, 401, 403, 404, 429, 500, 502, 503].includes(statusProp) ? statusProp : 502;

  if (status === 403 || code === "PERMISSION_DENIED") {
    return {
      status: 403,
      code: "PERMISSION_DENIED",
      message:
        "Gemini API free tier is unavailable or billing is required for this project. Please check your GEMINI_API_KEY and billing settings in Vercel Environment Variables or Settings > Secrets.",
    };
  }
  if (status === 400 || code === "API_KEY_INVALID") {
    return {
      status: 400,
      code: "API_KEY_INVALID",
      message:
        "Invalid Gemini API key. Please check GEMINI_API_KEY in Vercel Environment Variables or Settings > Secrets.",
    };
  }
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return {
      status: 429,
      code: "RESOURCE_EXHAUSTED",
      message:
        "Gemini API rate limit or quota exceeded. Please retry shortly or update GEMINI_API_KEY in Vercel Environment Variables or Settings > Secrets.",
    };
  }
  return { status, code, message: cleanMessage };
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  }

  let parsedBody: NonNullable<VercelReq["body"]> = {};
  if (typeof req.body === "string") {
    try {
      parsedBody = JSON.parse(req.body);
    } catch {
      parsedBody = {};
    }
  } else if (req.body && typeof req.body === "object") {
    parsedBody = req.body;
  }

  const { question, context, history } = parsedBody;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(503).json({
      error: "API_KEY_MISSING",
      message:
        "Gemini API key is not configured. Please add GEMINI_API_KEY in Vercel Environment Variables or Settings > Secrets.",
    });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemInstruction = `You are Sphere Copilot, the real-time industrial intelligence assistant inside IndusMindAI.
Rules:
1. Ground every answer directly in the provided live JSON plant telemetry, machine health scores, alerts, production metrics, supply chain, and weather context.
2. Answer in the same language the user writes in (English, Bengali, or Banglish). Be direct, crisp, and actionable.
3. Reference exact machine IDs, temperatures, vibrations, production lines, supplier statuses, and clear preventive actions to stop equipment damage, accidents, and delivery delays.
4. Keep responses concise with structured bullet points and clear next steps.`;

  const recentHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .map(
          (m) =>
            `${m.role === "user" ? "Operator" : "Copilot"}: ${String(m.content || "").slice(0, 400)}`
        )
        .join("\n")
    : "";

  const contents = `Live Plant Context:
${JSON.stringify(context, null, 2)}

${recentHistory ? `Recent Conversation:\n${recentHistory}\n\n` : ""}Operator Question: ${String(question || "").slice(0, 800)}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config: {
          systemInstruction,
        },
      });

      return res.status(200).json({
        mode: "gemini",
        reply: (response.text ?? "").trim(),
      });
    } catch (err) {
      const parsed = parseGeminiError(err);
      const isTransient = parsed.status >= 500 && attempt === 0;
      if (isTransient) {
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      return res.status(parsed.status).json({
        error: parsed.code,
        message: parsed.message,
      });
    }
  }

  return res.status(502).json({
    error: "GEMINI_UPSTREAM_ERROR",
    message: "Unable to reach Gemini API right now. Please try again.",
  });
}
