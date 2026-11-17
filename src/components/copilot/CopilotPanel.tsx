import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Send, ShieldCheck, Sparkles, User } from "lucide-react";
import { useIndustry } from "../../context/IndustryContext";
import { buildCopilotContextPayload } from "../../services/copilotEngine";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "gemini" | "error";
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  "Which machine needs immediate attention?",
  "How do we prevent delivery delays today?",
  "Check workplace accident & safety risk",
  "Summarize today's factory performance",
  "Which machines have abnormal vibration?",
  "What happens if our main supplier is delayed?",
  "Kon machine kharap hoye jete pare?",
  "Which production line is at risk?",
];

export const CopilotPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    activeFacility,
    activeIndustry,
    weather,
    copilotQueuedPrompt,
    clearQueuedPrompt,
    navigate,
    setSelectedMachineId,
  } = useIndustry();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      mode: "gemini",
      timestamp: new Date().toLocaleTimeString(),
      content: `Sphere Copilot is synced live to ${activeFacility.name} (${activeIndustry.name}). Ask anything in English or Banglish about machine health, accident prevention, delivery delays, or maintenance priorities.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const revealStreamingResponse = async (fullText: string, mode: "gemini" | "error") => {
    const words = fullText.split(" ");
    let built = "";
    const stepSize = Math.max(2, Math.ceil(words.length / 26));
    for (let i = 0; i < words.length; i += stepSize) {
      built += (i === 0 ? "" : " ") + words.slice(i, i + stepSize).join(" ");
      setStreamingContent(built);
      await new Promise((r) => setTimeout(r, 16));
    }
    setStreamingContent(null);
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: fullText,
        mode,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    let replyText = "";
    let mode: "gemini" | "error" = "gemini";

    try {
      const context = buildCopilotContextPayload(activeFacility, weather, activeIndustry.name);
      const res = await fetch("/api/copilot/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          context,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        replyText =
          data?.message ||
          `Gemini API error (${res.status}). Please verify GEMINI_API_KEY and billing in Settings > Secrets.`;
        mode = "error";
      } else if (data?.reply) {
        replyText = data.reply;
        mode = "gemini";
      } else {
        replyText = "Gemini API returned an empty response. Please try again.";
        mode = "error";
      }
    } catch {
      replyText =
        "Network error reaching /api/copilot/analyze. Please verify the server is running and try again.";
      mode = "error";
    }

    setLoading(false);
    if (mode === "error") {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: replyText,
          mode: "error",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      return;
    }
    await revealStreamingResponse(replyText, mode);
  };

  useEffect(() => {
    if (copilotQueuedPrompt) {
      const q = copilotQueuedPrompt;
      clearQueuedPrompt();
      void sendQuestion(q);
    }
  }, [copilotQueuedPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingContent]);

  const topRiskMachine = [...activeFacility.machines].sort(
    (a, b) => b.prediction.riskScore - a.prediction.riskScore
  )[0];

  return (
    <div
      className={`flex flex-col ${
        compact ? "h-full" : "h-[calc(100vh-14rem)] min-h-[520px]"
      } rounded-xl border border-slate-800 bg-[#0D1422]`}
    >
      {/* Live Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="h-4 w-4 text-[#00E5FF] shrink-0" />
          <span className="font-semibold text-slate-100 truncate">Sphere Copilot</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{activeFacility.name}</span>
        </div>
        <span className="font-mono text-[11px] text-[#22C55E] shrink-0">LIVE TELEMETRY SYNC</span>
      </div>

      {/* Suggested prompts */}
      <div className="border-b border-slate-800/80 px-4 py-2.5 overflow-x-auto">
        <div className="flex flex-wrap gap-1.5">
          {(compact ? SUGGESTED_QUESTIONS.slice(0, 4) : SUGGESTED_QUESTIONS).map((q) => (
            <button
              key={q}
              onClick={() => void sendQuestion(q)}
              disabled={loading || streamingContent !== null}
              className="rounded-md border border-slate-700/80 bg-[#111C2D] px-2.5 py-1 text-xs text-slate-300 hover:border-[#00E5FF]/60 hover:text-[#00E5FF] transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Message stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border bg-[#111C2D] ${
                  msg.mode === "error"
                    ? "border-amber-500/40 text-amber-400"
                    : "border-slate-700 text-[#00E5FF]"
                }`}
              >
                {msg.mode === "error" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#1D4ED8] text-white"
                  : msg.mode === "error"
                  ? "border border-amber-500/40 bg-amber-500/10 text-amber-100"
                  : "border border-slate-800 bg-[#111C2D] text-slate-200"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && msg.id !== "welcome" && msg.mode !== "error" && (
                <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                  {topRiskMachine && (
                    <button
                      onClick={() => {
                        setSelectedMachineId(topRiskMachine.id);
                        navigate("predictive");
                      }}
                      className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#0D1422] border border-slate-700 text-[#3fd8ff] hover:border-[#3fd8ff]"
                    >
                      Inspect {topRiskMachine.id}
                    </button>
                  )}
                  <button
                    onClick={() => navigate("maintenance")}
                    className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#0D1422] border border-slate-700 text-[#c6ff2e] hover:border-[#c6ff2e]"
                  >
                    Schedule Repair
                  </button>
                  <button
                    onClick={() => navigate("supply-chain")}
                    className="text-[11px] font-medium px-2.5 py-1 rounded bg-[#0D1422] border border-slate-700 text-slate-300 hover:text-white"
                  >
                    Supply Chain
                  </button>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{msg.timestamp}</span>
                {msg.role === "assistant" && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {msg.mode === "error" ? "Gemini API Notice" : "Gemini Real-Time AI"}
                    </span>
                  </>
                )}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {streamingContent !== null && (
          <div className="flex gap-3 justify-start">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#111C2D] text-[#00E5FF]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap border border-[#00E5FF]/30 bg-[#111C2D] text-slate-200">
              {streamingContent}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
            <Bot className="h-4 w-4 text-[#00E5FF]" />
            <span>Reading live machine telemetry, safety tolerances, and supply routes...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Advisory + Input */}
      <div className="border-t border-slate-800 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
          <ShieldCheck className="h-3.5 w-3.5 text-[#3fd8ff] shrink-0" />
          <span>
            Live plant telemetry synced continuously across machines, lines, suppliers, and weather.
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendQuestion(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Sphere Copilot anything (English or Banglish)..."
            className="flex-1 rounded-lg border border-slate-700 bg-[#070B14] px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-[#00E5FF] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || streamingContent !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#c6ff2e] px-4 py-2.5 text-xs font-bold text-[#0f1626] hover:brightness-105 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
};
