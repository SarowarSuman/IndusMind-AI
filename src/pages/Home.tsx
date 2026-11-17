import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Box,
  CloudRain,
  Cpu,
  Factory,
  Layers,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIndustry } from "../context/IndustryContext";
import { MarketingNavbar } from "../components/layout/MarketingNavbar";
import { MarketingFooter } from "../components/layout/MarketingFooter";
import { FactoryTwin3D } from "../components/three/FactoryTwin3D";
import { HeroControlMode, HeroPredictiveTwin } from "../components/three/HeroPredictiveTwin";

const PROCESS_STEPS = [
  {
    num: "01",
    title: "Zero unexpected equipment damage",
    body: "Continuous vibration, thermal, and torque baselines detect bearing fatigue and drive drift hours before breakdown—stopping costly machine damage before it starts.",
  },
  {
    num: "02",
    title: "Zero product delivery delays",
    body: "Suppliers, port corridors, and regional weather telemetry are fused in real time so production lines rebalance early and every shipment clears on time.",
  },
  {
    num: "03",
    title: "Zero workplace accidents",
    body: "Automated safety interlocks and perimeter alerts flag overheating boilers, pressure spikes, and floor hazards before workers are ever put at risk.",
  },
  {
    num: "04",
    title: "Every industry, all in your control",
    body: "Switch effortlessly across 20+ industrial presets—garments, pharma, steel, power, food, and logistics—inside one unified 3D command sphere.",
  },
];

const HERO_MODES: Array<{
  id: HeroControlMode;
  label: string;
  badge: string;
  headlineNote: string;
}> = [
  {
    id: "all-control",
    label: "All In Your Control",
    badge: "3D Command Shield",
    headlineNote: "Unified 3D visibility over machinery, safety & deliveries",
  },
  {
    id: "prevent-damage",
    label: "Prevent Machine Damage",
    badge: "0 Breakdowns",
    headlineNote: "Early fault isolation protects motors, boilers & CNC cells",
  },
  {
    id: "zero-delay",
    label: "Zero Delivery Delays",
    badge: "On-Time Dispatch",
    headlineNote: "Express route optimization clears supply bottlenecks",
  },
  {
    id: "zero-accident",
    label: "Zero Floor Accidents",
    badge: "Safety Dome",
    headlineNote: "Active thermal & hazard shield protects plant personnel",
  },
];

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function useAnimatedCounter(target: number, durationMs = 1100, decimals = 0): string {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVal(target);
      return;
    }
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return val.toFixed(decimals);
}

export const Home: React.FC = () => {
  const {
    navigate,
    activeFacility,
    selectedMachineId,
    setSelectedMachineId,
    selectedMachine,
    industries,
    switchIndustry,
    startGuidedDemo,
  } = useIndustry();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [scrolledPastHero, setScrolledPastHero] = useState<boolean>(false);
  const [manualStep, setManualStep] = useState<number | null>(null);
  const [heroMode, setHeroMode] = useState<HeroControlMode>("all-control");
  const [loaderPhase, setLoaderPhase] = useState<"visible" | "fading" | "gone">("visible");

  useEffect(() => {
    const t1 = window.setTimeout(() => setLoaderPhase("fading"), 550);
    const t2 = window.setTimeout(() => setLoaderPhase("gone"), 1150);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const trackTop = window.scrollY + rect.top;
      const denom = Math.max(1, track.offsetHeight - window.innerHeight);
      const p = clamp01((window.scrollY - trackTop) / denom);
      setProgress(p);
      setScrolledPastHero(window.scrollY >= trackTop + track.offsetHeight - window.innerHeight * 0.85);
      setManualStep(null);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const h = easeInOutQuad(progress / 0.38);
  const headlineOpacity = 1 - clamp01((progress - 0.14) / 0.18);
  const processVisibility = clamp01((progress - 0.05) / 0.16);
  const scrollCueDrain = 1 - clamp01(progress / 0.14);
  const scrollCueOpacity = 1 - clamp01((progress - 0.05) / 0.1);

  const scrollActiveStep = progress < 0.35 ? 0 : progress < 0.65 ? 1 : progress < 0.85 ? 2 : 3;
  const activeProcessIdx = manualStep !== null ? manualStep : scrollActiveStep;

  const countMachines = useAnimatedCounter(128, 1000, 0);
  const countHealth = useAnimatedCounter(96.4, 1100, 1);
  const countPrevented = useAnimatedCounter(0, 900, 0);
  const countDowntime = useAnimatedCounter(42, 1100, 0);

  const previewChartData = selectedMachine.history.slice(-12).map((item, i) => ({
    idx: `T-${12 - i}h`,
    health: item.healthScore,
    vibration: Number((item.vibration * 10).toFixed(1)),
    temp: item.temperature,
  }));

  return (
    <div className="min-h-screen bg-[#0f1626] text-[#f4f6fa] flex flex-col overflow-x-clip">
      {/* FULL-SCREEN NIGHT LOADER */}
      {loaderPhase !== "gone" && (
        <div
          aria-hidden={loaderPhase === "fading"}
          className={`fixed inset-0 z-50 bg-[#0f1626] flex items-center justify-center transition-opacity duration-[600ms] ${
            loaderPhase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <div
              style={{
                width: "calc(230 * var(--u))",
                height: "calc(102 * var(--u))",
                borderColor: "rgba(255, 255, 255, 0.22)",
              }}
              className="absolute rounded-full border border-dotted pointer-events-none"
            />
            <div
              style={{
                width: "calc(132 * var(--u))",
                height: "calc(132 * var(--u))",
                borderColor: "rgba(255, 255, 255, 0.22)",
              }}
              className="absolute rounded-full border border-dotted pointer-events-none"
            />
            <svg
              viewBox="0 0 80 80"
              style={{ width: "calc(72 * var(--u))", height: "calc(72 * var(--u))" }}
              className="loader-mark-spin"
            >
              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const cx = 40 + Math.cos(rad) * 24;
                const cy = 40 + Math.sin(rad) * 24;
                return (
                  <rect
                    key={deg}
                    x={cx - 3.5}
                    y={cy - 3.5}
                    width="7"
                    height="7"
                    rx="1"
                    fill="#3fd8ff"
                  />
                );
              })}
              <path
                d="M33 34 L40 26 L47 34 M33 45 L40 37 L47 45"
                fill="none"
                stroke="#c6ff2e"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* FIXED 3-COLUMN NAVBAR */}
      <MarketingNavbar overlay scrolledPastHero={scrolledPastHero} />

      {/* ============================================================
          INTERACTIVE 3D NIGHT-CITY PREDICTIVE PLANT HERO (300vh track)
         ============================================================ */}
      <section
        ref={trackRef}
        aria-label="Interactive 3D Predictive Plant Command Hero"
        className="relative h-[300vh] w-full bg-[#0f1626]"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0f1626]">
          {/* Live Interactive Three.js 3D Night-City Predictive Plant */}
          <div className="absolute inset-0">
            <HeroPredictiveTwin mode={heroMode} scrollProgress={progress} />
          </div>

          {/* Readability Vignette Overlays (pointer-events-none so 3D remains 100% draggable) */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(to bottom, rgba(15, 22, 38, 0.72) 0%, rgba(15, 22, 38, 0.15) 38%, rgba(15, 22, 38, 0) 60%),
                linear-gradient(to top, rgba(15, 22, 38, 0.68) 0%, rgba(15, 22, 38, 0) 32%)
              `,
            }}
          />

          {/* Centered Headline + Interactive Control Mode Bar inside 900u perspective */}
          <div
            className="absolute left-0 right-0 flex flex-col items-center text-center px-4 font-tight pointer-events-none"
            style={{
              top: "calc(78 * var(--u))",
              perspective: "calc(900 * var(--u))",
            }}
          >
            <div
              style={{
                opacity: headlineOpacity,
                transformOrigin: "bottom center",
                transform: `translateY(${(-34 * h).toFixed(3)}vh) rotateX(${(62 * h).toFixed(3)}deg) scale(${(1 - 0.12 * h).toFixed(4)})`,
                willChange: "transform, opacity",
              }}
            >
              <h1
                style={{
                  fontSize: "calc(76 * var(--u))",
                  lineHeight: 0.96,
                  letterSpacing: "-0.045em",
                  color: "#f4f6fa",
                }}
                className="font-tight font-semibold tracking-[-0.045em] max-[760px]:!text-[clamp(36px,10.5vw,48px)]"
              >
                Predictive Plant.
                <br />
                All In Your Control.
              </h1>

              <p
                style={{
                  marginTop: "calc(16 * var(--u))",
                  fontSize: "calc(17 * var(--u))",
                  lineHeight: 1.4,
                  color: "rgba(244, 246, 250, 0.78)",
                }}
                className="mx-auto max-w-2xl font-normal max-[760px]:!text-[14px] max-[760px]:max-w-[34ch]"
              >
                Zero machine damage. Zero delivery delays. Zero workplace accidents. Built for every
                industry.
              </p>

              {/* Interactive 3D Hero Control Pills */}
              <div
                style={{ marginTop: "calc(20 * var(--u))" }}
                className="pointer-events-auto inline-flex flex-wrap items-center justify-center gap-2 max-w-3xl"
              >
                {HERO_MODES.map((m) => {
                  const active = heroMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setHeroMode(m.id)}
                      className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all border ${
                        active
                          ? "bg-[#c6ff2e] text-[#0f1626] border-[#c6ff2e]"
                          : "bg-[#0f1626]/85 text-[#f4f6fa]/85 border-white/20 hover:border-[#3fd8ff]"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Four-Step Process List (bottom left) */}
          <div
            className="absolute font-tight max-[760px]:!left-[18px] max-[760px]:!right-[18px] max-[760px]:!bottom-[58px] max-[760px]:!w-auto"
            style={{
              left: "calc(36 * var(--u))",
              bottom: "calc(28 * var(--u))",
              width: "calc(430 * var(--u))",
              opacity: processVisibility,
              transform: `translateY(${(36 * (1 - processVisibility)).toFixed(2)}px)`,
              pointerEvents: processVisibility <= 0.05 ? "none" : "auto",
            }}
          >
            <div className="space-y-[calc(9*var(--u))] max-[760px]:space-y-[6px]">
              {PROCESS_STEPS.map((step, idx) => {
                const isActive = idx === activeProcessIdx;
                return (
                  <div
                    key={step.num}
                    onClick={() => setManualStep(idx)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setManualStep(idx);
                      }
                    }}
                    className={`cursor-pointer select-none ${isActive ? "process-row-active" : ""}`}
                  >
                    <div className="flex items-center gap-[calc(12*var(--u))] max-[760px]:gap-[10px]">
                      <span
                        style={{
                          width: "calc(36 * var(--u))",
                          height: "calc(36 * var(--u))",
                          fontSize: "calc(11.5 * var(--u))",
                          letterSpacing: "0.05em",
                        }}
                        className={`inline-flex items-center justify-center rounded-[calc(8*var(--u))] font-semibold tabular-nums transition-colors duration-300 max-[760px]:w-[28px] max-[760px]:h-[28px] max-[760px]:text-[11px] ${
                          isActive
                            ? "bg-[#f4f6fa] text-[#0f1626]"
                            : "bg-transparent text-[#f4f6fa]/72"
                        }`}
                      >
                        {step.num}
                      </span>

                      <span
                        style={{
                          fontSize: isActive ? "calc(18 * var(--u))" : "calc(12.5 * var(--u))",
                        }}
                        className={`font-medium transition-all duration-300 max-[760px]:!text-[13px] ${
                          isActive ? "text-[#f4f6fa]" : "text-[#f4f6fa]/72 hover:text-[#f4f6fa]"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>

                    <div className="process-body-grid">
                      <div className="process-body-inner">
                        <div
                          style={{
                            marginLeft: "calc(18 * var(--u))",
                            paddingLeft: "calc(28 * var(--u))",
                            marginTop: "calc(6 * var(--u))",
                            marginBottom: "calc(4 * var(--u))",
                            borderLeft: "1px solid rgba(255, 255, 255, 0.22)",
                            fontSize: "calc(13.5 * var(--u))",
                            lineHeight: 1.45,
                            color: "rgba(244, 246, 250, 0.78)",
                          }}
                          className="max-[760px]:ml-[14px] max-[760px]:pl-[16px] max-[760px]:text-[12px]"
                        >
                          {step.body}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom-Right Quick Launch CTA inside Hero */}
          <div className="hidden md:flex absolute right-9 bottom-7 z-10 items-center gap-3">
            <button
              onClick={() => navigate("dashboard")}
              className="inline-flex items-center gap-2 rounded-full bg-[#c6ff2e] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0f1626] hover:brightness-105 transition-all"
            >
              Enter Command Center
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scroll Cue */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none font-tight"
            style={{
              bottom: "calc(28 * var(--u))",
              opacity: scrollCueOpacity,
            }}
          >
            <span
              style={{
                fontSize: "calc(11 * var(--u))",
                letterSpacing: "0.06em",
                color: "#f4f6fa",
              }}
              className="font-medium uppercase whitespace-nowrap max-[760px]:text-[10px]"
            >
              DRAG 3D CITY OR SCROLL TO GLIDE
            </span>
            <div
              style={{
                marginTop: "calc(8 * var(--u))",
                width: "100%",
                height: "1px",
                backgroundColor: "rgba(255, 255, 255, 0.22)",
              }}
              className="relative overflow-hidden"
            >
              <div
                style={{
                  transform: `scaleX(${scrollCueDrain.toFixed(4)})`,
                  transformOrigin: "left center",
                  backgroundColor: "#f4f6fa",
                }}
                className="absolute inset-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 1: INTERACTIVE 3D FACTORY FLOOR & LIVE TELEMETRY
         ============================================================ */}
      <section className="relative border-t border-white/15 bg-[#070B14] industrial-grid-bg">
        <div className="radial-cyan-glow">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 space-y-5">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#3fd8ff] uppercase">
                  Live Machine-Level Digital Twin
                </p>

                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-50 leading-tight text-balance">
                  Inspect Every{" "}
                  <span className="bg-gradient-to-r from-[#3fd8ff] to-[#c6ff2e] bg-clip-text text-transparent">
                    Asset & Production Line
                  </span>{" "}
                  in 3D.
                </h2>

                <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                  Drill down from the plant hub directly into individual motors, boilers, pumps, and
                  robotic cells. Identify early bearing wear before damage or downtime occurs.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => navigate("dashboard")}
                    className="inline-flex items-center gap-2 rounded-full bg-[#c6ff2e] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#0f1626] hover:brightness-105 transition-all whitespace-nowrap shrink-0"
                  >
                    Open Command Center
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <div className="h-[420px] sm:h-[460px] w-full">
                  <FactoryTwin3D
                    machines={activeFacility.machines}
                    selectedMachineId={selectedMachineId}
                    onSelectMachine={(id) => setSelectedMachineId(id)}
                    compact
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#0D1422] px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-semibold text-[#00E5FF]">
                      {selectedMachine.id}
                    </span>
                    <span className="text-slate-200 font-medium truncate">
                      {selectedMachine.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums text-slate-300 shrink-0">
                    <span>Health: {selectedMachine.prediction.healthScore}%</span>
                    <span>Temp: {selectedMachine.temperature.toFixed(1)}°C</span>
                    <span>Vib: {selectedMachine.vibration.toFixed(2)} mm/s</span>
                    <button
                      onClick={() => navigate("predictive")}
                      className="text-[#c6ff2e] font-sans font-semibold hover:underline"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Operational Telemetry Strip */}
            <div className="mt-10 rounded-xl border border-slate-800 bg-[#0D1422]/90 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-slate-800/80">
                <span className="text-xs font-medium text-slate-300">
                  Live Operational Snapshot — {activeFacility.name}
                </span>
                <span className="font-mono text-[11px] text-[#22C55E]">
                  ACTIVE PLANT TELEMETRY · REAL-TIME ENGINE
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                <div>
                  <div className="font-display text-2xl sm:text-3xl font-bold text-slate-50 font-mono tabular-nums">
                    {countMachines}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Connected Industrial Assets</div>
                </div>
                <div>
                  <div className="font-display text-2xl sm:text-3xl font-bold text-[#22C55E] font-mono tabular-nums">
                    {countHealth}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Fleet Health Score</div>
                </div>
                <div>
                  <div className="font-display text-2xl sm:text-3xl font-bold text-[#c6ff2e] font-mono tabular-nums">
                    {countPrevented}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Unplanned Accidents</div>
                </div>
                <div>
                  <div className="font-display text-2xl sm:text-3xl font-bold text-[#3fd8ff] font-mono tabular-nums">
                    {countDowntime}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Downtime Prevented</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION A: UNIFIED PLATFORM MODULES */}
      <section className="border-y border-slate-800/80 bg-[#0D1422] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-semibold tracking-wider text-[#3fd8ff] uppercase">
                Unified Platform
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-50 text-balance">
                From Reactive Breakdowns to Zero-Delay Control.
              </h2>
            </div>
            <button
              onClick={() => navigate("solutions")}
              className="text-xs font-semibold text-[#c6ff2e] hover:underline whitespace-nowrap shrink-0"
            >
              Explore All Modules
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Activity,
                title: "Predictive Maintenance Engine",
                desc: "Asset-specific health scoring, anomaly detection, and contributing sensor attribution.",
                route: "predictive" as const,
              },
              {
                icon: Box,
                title: "3D Factory Digital Twin",
                desc: "Interactive spatial plant map with live machine beacons and line dependency tracing.",
                route: "digital-twin" as const,
              },
              {
                icon: Factory,
                title: "Production Intelligence",
                desc: "Line efficiency tracking, bottleneck detection, and delivery schedule protection.",
                route: "production" as const,
              },
              {
                icon: Truck,
                title: "Supply Chain Resilience",
                desc: "Supplier reliability tracking, inventory runway forecasting, and route rerouting.",
                route: "supply-chain" as const,
              },
              {
                icon: CloudRain,
                title: "Weather Risk Intelligence",
                desc: "Live Open-Meteo regional forecasts connecting rainfall and heat to logistics.",
                route: "weather" as const,
              },
              {
                icon: Bot,
                title: "Real-Time Sphere Copilot",
                desc: "Instant multi-turn assistant grounded in live plant telemetry in English & Banglish.",
                route: "copilot" as const,
              },
            ].map((mod) => {
              const Icon = mod.icon;
              return (
                <button
                  key={mod.title}
                  onClick={() => navigate(mod.route)}
                  className="text-left rounded-xl border border-slate-800 bg-[#111C2D] p-6 hover:border-[#3fd8ff]/50 transition-colors space-y-3"
                >
                  <Icon className="h-5 w-5 text-[#3fd8ff]" />
                  <h3 className="font-display text-base font-semibold text-slate-100">
                    {mod.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-400">{mod.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION B: INDUSTRIES WE EMPOWER */}
      <section className="border-b border-slate-800/80 bg-[#070B14] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-[#3fd8ff] uppercase">
                Universal Industrial Platform
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-50">
                20 Configurable Industry Ecosystems
              </h2>
            </div>
            <button
              onClick={() => navigate("industries")}
              className="text-xs font-semibold text-[#c6ff2e] hover:underline whitespace-nowrap shrink-0"
            >
              View All 20 Industries
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.slice(0, 8).map((ind) => (
              <button
                key={ind.id}
                onClick={() => {
                  switchIndustry(ind.id);
                  navigate("dashboard");
                }}
                className="text-left rounded-xl border border-slate-800 bg-[#111C2D] p-5 hover:border-[#3fd8ff]/50 transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="text-xs font-mono text-slate-400">{ind.defaultLocation}</div>
                  <h3 className="font-display text-sm font-semibold text-slate-100 mt-1">
                    {ind.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{ind.sectorSummary}</p>
                </div>
                <span className="text-xs font-semibold text-[#3fd8ff]">Load Industry Workspace</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION C: INTERACTIVE PRODUCT PREVIEW */}
      <section className="mx-auto max-w-7xl w-full px-6 py-16">
        <div className="rounded-2xl border border-slate-800 bg-[#111C2D] p-6 lg:p-8 grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-semibold tracking-wider text-[#3fd8ff] uppercase">
              Live Telemetry Scoring
            </p>
            <h2 className="font-display text-2xl font-bold text-slate-50">
              Asset Health & Early Fault Attribution
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every machine profile monitors temperature, vibration, power draw, and torque
              simultaneously. Inspect {selectedMachine.name} right now inside Predictive Control.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1 font-mono text-xs tabular-nums">
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Health Score</div>
                <div className="text-lg font-bold text-slate-50 mt-0.5">
                  {selectedMachine.prediction.healthScore}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Risk Level</div>
                <div className="text-lg font-bold text-[#F59E0B] mt-0.5">
                  {selectedMachine.prediction.riskLevel}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate("predictive")}
              className="inline-flex items-center gap-2 rounded-full bg-[#c6ff2e] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0f1626] hover:brightness-105"
            >
              Open Predictive Control
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="lg:col-span-7 h-64 sm:h-72 rounded-xl border border-slate-800 bg-[#0D1422] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={previewChartData}>
                <defs>
                  <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fd8ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3fd8ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="idx" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1422",
                    borderColor: "#334155",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="health"
                  name="Health Score (%)"
                  stroke="#3fd8ff"
                  fill="url(#healthGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="temp"
                  name="Temp (°C)"
                  stroke="#F59E0B"
                  fill="transparent"
                  strokeWidth={1.75}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* SECTION D: WHY INDUSMINDAI & TECH STACK */}
      <section className="border-t border-slate-800/80 bg-[#0D1422] px-6 py-16">
        <div className="mx-auto max-w-7xl grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <h2 className="font-display text-2xl font-bold text-slate-50">
              Why IndusMindAI?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: ShieldCheck,
                  title: "Zero-Trust Cyber & Data Protection",
                  desc: "One-way read-only PLC telemetry, AES-256 encryption, and strict tenant isolation protect machines and trade secrets from hacks or competitor leaks.",
                },
                {
                  icon: Layers,
                  title: "Multi-Industry Compatibility",
                  desc: "20 tailored industry profiles from garments and textiles to pharmaceuticals and cement.",
                },
                {
                  icon: Wrench,
                  title: "BD-Scale Preventive Budgets",
                  desc: "Early fault scoring paired directly with work orders and realistic BDT maintenance cost tracking.",
                },
                {
                  icon: BarChart3,
                  title: "On-Time Delivery Protection",
                  desc: "Connects asset health directly to shift output, supplier buffers, and weather risk.",
                },
                {
                  icon: Cpu,
                  title: "Scalable Gateway Architecture",
                  desc: "Built for MQTT, OPC UA, Modbus read-only diodes, and automated ML diagnostics.",
                },
                {
                  icon: CloudRain,
                  title: "Regional Logistics Context",
                  desc: "Live Dhaka, Gazipur, Chattogram, Savar, and Narayanganj weather & port awareness.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-slate-800 bg-[#111C2D] p-4 space-y-1.5"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                      <Icon className="h-4 w-4 text-[#3fd8ff]" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <h2 className="font-display text-2xl font-bold text-slate-50">
              Platform Architecture
            </h2>
            <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Built on a modular TypeScript prediction core with WebGL 3D digital twin
                visualization, Open-Meteo live weather integration, and industrial gateway contracts.
              </p>
              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono text-slate-300">
                {[
                  "React + TypeScript",
                  "Three.js 3D Engine",
                  "Anomaly Risk Engine",
                  "MQTT / OPC UA Ready",
                  "Modbus TCP Schema",
                  "Open-Meteo Live API",
                  "Role-Based Access",
                  "CSV & Print Reports",
                ].map((tech) => (
                  <div
                    key={tech}
                    className="rounded-lg border border-slate-800 bg-[#0D1422] px-3 py-2"
                  >
                    {tech}
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("technology")}
                className="text-xs font-semibold text-[#c6ff2e] hover:underline"
              >
                Inspect 7-Layer Architecture & Research
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION E: FINAL CTA */}
      <section className="mx-auto max-w-5xl w-full px-6 py-16 text-center space-y-5">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-slate-50 text-balance">
          Your Entire Plant. All In Your Control.
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Prevent machine damage, eliminate delivery delays, and maintain zero-accident operations
          across every facility.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate("dashboard")}
            className="inline-flex items-center gap-2 rounded-full bg-[#c6ff2e] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#0f1626] hover:brightness-105"
          >
            Open Command Center
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};
