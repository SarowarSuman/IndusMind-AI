import React from "react";
import { Activity, AlertTriangle, Bot, Package, Wrench } from "lucide-react";
import { CopilotPanel } from "../components/copilot/CopilotPanel";
import { useIndustry } from "../context/IndustryContext";
import { generateRecommendations } from "../services/recommendationEngine";

export const Copilot: React.FC = () => {
  const { activeFacility, activeIndustry, weather, navigate, setSelectedMachineId } = useIndustry();

  const sortedRiskMachines = [...activeFacility.machines].sort(
    (a, b) => b.prediction.riskScore - a.prediction.riskScore
  );
  const topRisk = sortedRiskMachines[0];
  const bottleneckLine = activeFacility.lines.reduce((acc, l) =>
    l.efficiencyPct < acc.efficiencyPct ? l : acc
  );
  const lowestMaterial = [...activeFacility.materials].sort(
    (a, b) =>
      a.currentInventory / Math.max(1, a.dailyConsumption) -
      b.currentInventory / Math.max(1, b.dailyConsumption)
  )[0];

  const recommendations = generateRecommendations(activeFacility, weather);
  const openAlerts = activeFacility.alerts.filter((a) => !a.resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Decision Intelligence Assistant
          </p>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Bot className="w-6 h-6 text-cyan-400" />
            Sphere Copilot
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Context-aware operational advisor grounded in {activeFacility.name} ({activeIndustry.name}) live telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0D1422] border border-[#1E293B] text-slate-300">
          <span>Active Facility:</span>
          <span className="text-cyan-300">{activeFacility.name}</span>
          <span className="text-slate-600">|</span>
          <span>Open Alerts:</span>
          <span className={openAlerts > 0 ? "text-amber-300" : "text-emerald-300"}>
            {openAlerts}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation Panel */}
        <div className="lg:col-span-2">
          <CopilotPanel />
        </div>

        {/* Live Context Snapshot Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
              Live Telemetry Grounding Context
            </h2>

            <div className="space-y-3">
              {topRisk && (
                <div className="p-3 rounded-lg bg-[#111C2D] border border-[#1E293B]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Highest Risk Machine
                    </span>
                    <span className="font-mono text-rose-300 tabular-nums">
                      Risk {topRisk.prediction.riskScore}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100 mt-1">{topRisk.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {topRisk.temperature}°C · {topRisk.vibration} mm/s · {topRisk.prediction.predictedFailureCategory}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMachineId(topRisk.id);
                      navigate("predictive");
                    }}
                    className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    Inspect machine diagnostics →
                  </button>
                </div>
              )}

              {bottleneckLine && (
                <div className="p-3 rounded-lg bg-[#111C2D] border border-[#1E293B]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-400" />
                      Line Efficiency Watch
                    </span>
                    <span className="font-mono text-amber-300 tabular-nums">
                      {bottleneckLine.efficiencyPct}%
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100 mt-1">
                    {bottleneckLine.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {bottleneckLine.actualUnits.toLocaleString()} /{" "}
                    {bottleneckLine.targetUnits.toLocaleString()} {activeIndustry.productionUnit} ({bottleneckLine.status})
                  </div>
                </div>
              )}

              {lowestMaterial && (
                <div className="p-3 rounded-lg bg-[#111C2D] border border-[#1E293B]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                      Tightest Material Runway
                    </span>
                    <span className="font-mono text-cyan-300 tabular-nums">
                      {(
                        lowestMaterial.currentInventory /
                        Math.max(1, lowestMaterial.dailyConsumption)
                      ).toFixed(1)}{" "}
                      days
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100 mt-1">
                    {lowestMaterial.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {lowestMaterial.currentInventory.toLocaleString()} {lowestMaterial.unit} on hand
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              Top Action Priorities
            </h2>
            <div className="space-y-2.5">
              {recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-lg bg-[#111C2D] border border-[#1E293B] text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">{rec.issue}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                      {rec.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{rec.recommendedAction}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
