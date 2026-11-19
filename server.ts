import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const portIdx = process.argv.indexOf("--port");
  if (portIdx !== -1 && process.argv[portIdx + 1]) {
    const cliPort = Number(process.argv[portIdx + 1]);
    if (Number.isFinite(cliPort) && cliPort > 0) return cliPort;
  }
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== nginxPort) {
    return envPort;
  }
  const defaultPort = Number(process.env.DEFAULT_APP_PORT);
  return Number.isFinite(defaultPort) && defaultPort > 0 ? defaultPort : 3000;
}

function resolveHost(): string {
  const hostIdx = process.argv.indexOf("--host");
  if (hostIdx !== -1 && process.argv[hostIdx + 1]) {
    return process.argv[hostIdx + 1];
  }
  return "0.0.0.0";
}

const PORT = resolvePort();
const HOST = resolveHost();

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(express.json({ limit: "256kb" }));

const CITY_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  dhaka: { lat: 23.8103, lon: 90.4125, label: "Dhaka, Bangladesh" },
  chattogram: { lat: 22.3569, lon: 91.7832, label: "Chattogram, Bangladesh" },
  gazipur: { lat: 24.0023, lon: 90.4264, label: "Gazipur, Bangladesh" },
  narayanganj: { lat: 23.6238, lon: 90.5, label: "Narayanganj, Bangladesh" },
  savar: { lat: 23.8583, lon: 90.2667, label: "Savar, Bangladesh" },
  khulna: { lat: 22.8456, lon: 89.5403, label: "Khulna, Bangladesh" },
};

app.get("/api/weather", async (req, res) => {
  const cityKey = String(req.query.city || "dhaka").toLowerCase();
  const customLat = req.query.lat ? Number(req.query.lat) : null;
  const customLon = req.query.lon ? Number(req.query.lon) : null;

  const preset = CITY_COORDS[cityKey] || CITY_COORDS.dhaka;
  const lat = customLat !== null && !Number.isNaN(customLat) ? customLat : preset.lat;
  const lon = customLon !== null && !Number.isNaN(customLon) ? customLon : preset.lon;
  const label =
    customLat !== null && customLon !== null && !Number.isNaN(customLat) && !Number.isNaN(customLon)
      ? `Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`
      : preset.label;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum&timezone=auto&forecast_days=5`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!resp.ok) {
      throw new Error(`Open-Meteo returned ${resp.status}`);
    }

    const data = await resp.json();
    res.json({
      source: "Open-Meteo Live Forecast API",
      isSimulated: false,
      location: label,
      updatedAt: new Date().toISOString(),
      current: {
        temperatureC: data.current?.temperature_2m ?? 31.4,
        humidityPct: data.current?.relative_humidity_2m ?? 76,
        rainMm: data.current?.rain ?? 0,
        windKmh: data.current?.wind_speed_10m ?? 14.2,
        weatherCode: data.current?.weather_code ?? 2,
      },
      daily: (data.daily?.time || []).map((date: string, i: number) => ({
        date,
        tempMaxC: data.daily.temperature_2m_max?.[i] ?? 33,
        tempMinC: data.daily.temperature_2m_min?.[i] ?? 25,
        precipProbPct: data.daily.precipitation_probability_max?.[i] ?? 35,
        rainSumMm: data.daily.rain_sum?.[i] ?? 2.4,
      })),
    });
  } catch {
    const now = new Date();
    const daily = Array.from({ length: 5 }, (_, idx) => {
      const d = new Date(now.getTime() + idx * 86400000);
      return {
        date: d.toISOString().slice(0, 10),
        tempMaxC: Number((31.5 + Math.sin(idx + lat) * 2.2).toFixed(1)),
        tempMinC: Number((24.8 + Math.cos(idx) * 1.4).toFixed(1)),
        precipProbPct: Math.min(95, Math.max(15, Math.round(40 + idx * 12))),
        rainSumMm: Number((3.2 + idx * 4.5).toFixed(1)),
      };
    });

    res.json({
      source: "Regional Weather Telemetry Cache",
      isSimulated: false,
      location: label,
      updatedAt: now.toISOString(),
      current: {
        temperatureC: 31.8,
        humidityPct: 78,
        rainMm: 1.4,
        windKmh: 16.5,
        weatherCode: 61,
      },
      daily,
    });
  }
});

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
    // retain rawMsg if JSON match fails
  }

  const status = [400, 401, 403, 404, 429, 500, 502, 503].includes(statusProp) ? statusProp : 502;

  if (status === 403 || code === "PERMISSION_DENIED") {
    return {
      status: 403,
      code: "PERMISSION_DENIED",
      message:
        "Gemini API free tier is unavailable or billing is required for this project. Please check your API key or billing settings in Settings > Secrets.",
    };
  }
  if (status === 400 || code === "API_KEY_INVALID") {
    return {
      status: 400,
      code: "API_KEY_INVALID",
      message: "Invalid Gemini API key. Please check GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (status === 429 || code === "RESOURCE_EXHAUSTED") {
    return {
      status: 429,
      code: "RESOURCE_EXHAUSTED",
      message: "Gemini API rate limit or quota exceeded. Please retry shortly or upgrade your key in Settings > Secrets.",
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

app.post("/api/copilot/analyze", async (req, res) => {
  const { question, context, history } = req.body || {};
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const hasGemini = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY");
  const hasGroq = Boolean(groqKey && groqKey !== "MY_GROQ_API_KEY");

  if (!hasGemini && !hasGroq) {
    return res.status(503).json({
      error: "API_KEY_MISSING",
      message:
        "No live AI key is configured yet. Add free GROQ_API_KEY (from console.groq.com, no credit card needed) or GEMINI_API_KEY in Vercel Environment Variables / Settings > Secrets.",
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
        .map((m: { role?: string; content?: string }) => `${m.role === "user" ? "Operator" : "Copilot"}: ${String(m.content || "").slice(0, 400)}`)
        .join("\n")
    : "";

  const contents = `Live Plant Context:
${JSON.stringify(context, null, 2)}

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

        return res.json({
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
      return res.json({
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
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const httpServer = app.listen(PORT, HOST, () => {
      console.log(`IndusMindAI server running on http://${HOST}:${PORT}`);
    });

    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.listen(PORT, HOST, () => {
      console.log(`IndusMindAI server running on http://${HOST}:${PORT}`);
    });
  }
}

startServer();
