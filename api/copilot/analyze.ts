import { GoogleGenAI } from "@google/genai";
import mcpHandler from "../mcp.ts";

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

async function getAvailableGroqModels(groqKey: string): Promise<string[]> {
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${groqKey}` },
    });
    if (!resp.ok) return [];
    const data = await resp.json().catch(() => ({}));
    const list: Array<{ id?: string; active?: boolean }> = Array.isArray(data?.data) ? data.data : [];
    const excluded = /(whisper|guard|tts|orpheus|playai|prompt-guard|safeguard|embed)/i;
    const preferredOrder = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3-32b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
    ];
    const validIds = list
      .filter((m) => m.id && m.active !== false && !excluded.test(m.id))
      .map((m) => String(m.id));
    const sorted = [
      ...preferredOrder.filter((id) => validIds.includes(id)),
      ...validIds.filter((id) => !preferredOrder.includes(id)),
    ];
    return sorted.slice(0, 4);
  } catch {
    return [];
  }
}

async function callGroq(
  groqKey: string,
  systemInstruction: string,
  contents: string
): Promise<{ ok: true; reply: string; model: string } | { ok: false; status: number; code: string; message: string }> {
  const trySingleModel = async (model: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          max_tokens: 700,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: contents },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errMsg =
          payload?.error?.message || `Groq API returned HTTP ${resp.status}. Please check GROQ_API_KEY.`;
        return {
          ok: false as const,
          status: resp.status,
          code: resp.status === 401 ? "API_KEY_INVALID" : "GROQ_UPSTREAM_ERROR",
          message: errMsg,
        };
      }

      const reply = String(payload?.choices?.[0]?.message?.content || "").trim();
      if (!reply) {
        return {
          ok: false as const,
          status: 502,
          code: "GROQ_EMPTY_RESPONSE",
          message: "Groq API returned an empty response. Please try again.",
        };
      }
      return { ok: true as const, reply, model };
    } catch (err) {
      clearTimeout(timer);
      return {
        ok: false as const,
        status: 502,
        code: "GROQ_UPSTREAM_ERROR",
        message: err instanceof Error ? err.message : "Unable to reach Groq API right now.",
      };
    }
  };

  const firstAttempt = await trySingleModel("llama-3.3-70b-versatile");
  if (firstAttempt.ok) return firstAttempt;

  if (firstAttempt.status === 404 || /does not exist|not have access|model/i.test(firstAttempt.message)) {
    const dynamicModels = await getAvailableGroqModels(groqKey);
    const candidates =
      dynamicModels.length > 0
        ? dynamicModels
        : ["llama-3.1-8b-instant", "openai/gpt-oss-120b", "qwen/qwen3-32b"];

    let lastFailure: typeof firstAttempt = firstAttempt;
    for (const candidate of candidates) {
      if (candidate === "llama-3.3-70b-versatile") continue;
      const attempt = await trySingleModel(candidate);
      if (attempt.ok) return attempt;
      lastFailure = attempt;
    }
    return lastFailure;
  }

  return firstAttempt;
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
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const hasGemini = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY");
  const hasGroq = Boolean(groqKey && groqKey !== "MY_GROQ_API_KEY");

  if (!hasGemini && !hasGroq) {
    return res.status(503).json({
      error: "API_KEY_MISSING",
      message:
        "No live AI key is configured yet. Add free GROQ_API_KEY (from console.groq.com, no credit card needed) or GEMINI_API_KEY in Vercel Environment Variables and redeploy.",
    });
  }

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

  let mcpSafetyPolicy = "Read-Only Plant Cyber Shield";
  try {
    let policyPayload: { result?: { contents?: Array<{ text?: string }> } } | undefined;
    const mockRes = {
      status: () => mockRes,
      json: (b: unknown) => {
        policyPayload = b as { result?: { contents?: Array<{ text?: string }> } };
      },
    };
    await mcpHandler(
      {
        method: "POST",
        body: {
          jsonrpc: "2.0",
          id: "copilot-mcp-policy",
          method: "resources/read",
          params: { uri: "indusmind://plant/cyber-shield-policy" },
        },
      },
      mockRes
    );
    const txt = policyPayload?.result?.contents?.[0]?.text;
    if (txt) mcpSafetyPolicy = txt;
  } catch {
    // non-blocking fallback
  }

  const contents = `Live Plant Context:
${JSON.stringify(context, null, 2)}

Active MCP Security Policy (indusmind-plant-mcp):
${mcpSafetyPolicy}

${recentHistory ? `Recent Conversation:\n${recentHistory}\n\n` : ""}Operator Question: ${String(question || "").slice(0, 800)}`;

  let geminiFailure: { status: number; code: string; message: string } | null = null;

  if (hasGemini && geminiKey) {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

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
          provider: "Gemini Real-Time AI",
          reply: (response.text ?? "").trim(),
        });
      } catch (err) {
        const parsed = parseGeminiError(err);
        const isTransient = parsed.status >= 500 && attempt === 0;
        if (isTransient) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        geminiFailure = parsed;
        break;
      }
    }
  }

  if (hasGroq && groqKey) {
    const groqResult = await callGroq(groqKey, systemInstruction, contents);
    if (groqResult.ok === true) {
      return res.status(200).json({
        mode: "groq",
        provider: "Groq Llama 3.3 AI",
        reply: groqResult.reply,
      });
    }
    return res.status(groqResult.status).json({
      error: groqResult.code,
      message: groqResult.message,
    });
  }

  if (geminiFailure) {
    return res.status(geminiFailure.status).json({
      error: geminiFailure.code,
      message: geminiFailure.message,
    });
  }

  return res.status(502).json({
    error: "AI_UPSTREAM_ERROR",
    message: "Unable to reach AI provider right now. Please try again.",
  });
}
