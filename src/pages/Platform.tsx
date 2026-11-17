import React from "react";
import { Activity, ArrowRight, Bot, Box, CloudRain, Factory, Truck } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { MarketingNavbar } from "../components/layout/MarketingNavbar";
import { MarketingFooter } from "../components/layout/MarketingFooter";

export const Platform: React.FC = () => {
  const { navigate, startGuidedDemo } = useIndustry();

  const modules = [
    {
      icon: Box,
      title: "Interactive 3D Digital Twin",
      desc: "Spatial command map visualizing every floor zone, machine health beacon, and line dependency in real time.",
      target: "digital-twin" as const,
    },
    {
      icon: Activity,
      title: "Predictive Maintenance Engine",
      desc: "Asset-specific health scores, moving-average drift detection, and transparent contributing factor weights.",
      target: "predictive" as const,
    },
    {
      icon: Factory,
      title: "Production Intelligence",
      desc: "Shift target attainment, bottleneck isolation, and dynamic order impact calculations when machines go offline.",
      target: "production" as const,
    },
    {
      icon: Truck,
      title: "Supply Chain Resilience",
      desc: "End-to-end network visibility from suppliers and raw material buffers to finished goods dispatch.",
      target: "supply-chain" as const,
    },
    {
      icon: CloudRain,
      title: "Weather & Environmental Risk",
      desc: "Open-Meteo regional forecasts linked directly to transport, flood, and thermal operating scenarios.",
      target: "weather" as const,
    },
    {
      icon: Bot,
      title: "Sphere Copilot",
      desc: "Context-grounded industrial AI assistant synthesizing machine risk, alerts, and inventory into clear recommendations.",
      target: "copilot" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex flex-col">
      <MarketingNavbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-14 space-y-12">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold tracking-wider text-[#00E5FF] uppercase">
            Platform Overview
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-50 text-balance">
            One Unified Industrial Intelligence Ecosystem
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            IndusMindAI connects equipment health telemetry, maintenance workflows, shift
            production targets, supplier lead times, and regional weather conditions into one shared
            operational model.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => navigate("dashboard")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#00E5FF] px-5 py-2.5 text-sm font-semibold text-[#070B14] hover:bg-[#33ECFF]"
            >
              Launch Command Center
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={startGuidedDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#0D1422] px-5 py-2.5 text-sm font-semibold text-slate-100 hover:border-[#00E5FF]"
            >
              Interactive Platform Walkthrough
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.title}
                className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <Icon className="h-5 w-5 text-[#00E5FF]" />
                  <h2 className="font-display text-lg font-semibold text-slate-100">{m.title}</h2>
                  <p className="text-xs leading-relaxed text-slate-400">{m.desc}</p>
                </div>
                <button
                  onClick={() => navigate(m.target)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00E5FF] hover:underline"
                >
                  Open Module
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};
