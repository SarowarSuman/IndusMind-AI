import React, { useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { MarketingNavbar } from "../components/layout/MarketingNavbar";
import { MarketingFooter } from "../components/layout/MarketingFooter";

export const Industries: React.FC = () => {
  const { industries, switchIndustry, addCustomIndustry, navigate } = useIndustry();
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customLoc, setCustomLoc] = useState("Dhaka");
  const [customUnit, setCustomUnit] = useState("units");
  const [customTarget, setCustomTarget] = useState("5000");

  const filtered = industries.filter(
    (ind) =>
      ind.name.toLowerCase().includes(query.toLowerCase()) ||
      ind.sectorSummary.toLowerCase().includes(query.toLowerCase()) ||
      ind.machineCategories.some((c) => c.toLowerCase().includes(query.toLowerCase()))
  );

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    addCustomIndustry(customName.trim(), customLoc.trim(), customUnit.trim(), Number(customTarget) || 5000);
    navigate("dashboard");
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex flex-col">
      <MarketingNavbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-14 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#00E5FF] uppercase">
              Universal Multi-Industry Architecture
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-50">
              20 Configurable Industrial Sectors
            </h1>
            <p className="text-sm text-slate-300">
              Select any sector to dynamically load its tailored machinery, asset-specific sensor
              thresholds, production KPIs, and supply-chain ecosystem into the workspace.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search industry or asset..."
              className="w-full rounded-lg border border-slate-700 bg-[#0D1422] pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-[#00E5FF] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ind, idx) => (
            <div
              key={ind.id}
              className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>{String(idx + 1).padStart(2, "0")}.</span>
                  <span>
                    {ind.defaultLocation} · Target {ind.dailyTarget.toLocaleString()} {ind.productionUnit}/day
                  </span>
                </div>
                <h2 className="font-display text-base font-semibold text-slate-100">{ind.name}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{ind.sectorSummary}</p>
                <div className="pt-1 text-[11px] text-slate-300">
                  <span className="text-slate-500">Assets: </span>
                  {ind.machineCategories.join(" · ")}
                </div>
              </div>
              <button
                onClick={() => {
                  switchIndustry(ind.id);
                  navigate("dashboard");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-3 py-2 text-xs font-semibold text-[#00E5FF] hover:bg-[#00E5FF]/20 transition-colors"
              >
                Load Industry Workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Custom Industry Builder */}
        <section className="rounded-xl border border-slate-800 bg-[#0D1422] p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-100">
              Configure a Custom Industry Facility
            </h2>
            <p className="text-xs text-slate-400">
              Create your own industrial sector preset and launch it immediately in the command center.
            </p>
          </div>
          <form onSubmit={handleCreateCustom} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Industry Name (e.g., Ceramic Tiles)"
              className="rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-[#00E5FF] focus:outline-none"
            />
            <input
              type="text"
              value={customLoc}
              onChange={(e) => setCustomLoc(e.target.value)}
              placeholder="Location (e.g., Gazipur)"
              className="rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-2 text-xs text-slate-100 focus:border-[#00E5FF] focus:outline-none"
            />
            <input
              type="text"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="Unit (e.g., sq.m)"
              className="rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-2 text-xs text-slate-100 focus:border-[#00E5FF] focus:outline-none"
            />
            <input
              type="number"
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              placeholder="Daily Target"
              className="rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-2 text-xs text-slate-100 focus:border-[#00E5FF] focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00E5FF] px-4 py-2 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
            >
              <Plus className="h-4 w-4" />
              Create & Launch
            </button>
          </form>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
};
