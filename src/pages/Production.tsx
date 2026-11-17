import React, { useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Factory } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIndustry } from "../context/IndustryContext";

export const Production: React.FC = () => {
  const { activeFacility, activeIndustry, navigate, createMaintenanceTask } = useIndustry();

  const [orderTarget, setOrderTarget] = useState(10000);
  const [windowHours, setWindowHours] = useState(16);
  const [offlineMachineId, setOfflineMachineId] = useState<string>(
    activeFacility.machines.find((m) => m.prediction.riskLevel !== "Low Risk")?.id ||
      activeFacility.machines[1]?.id ||
      activeFacility.machines[0].id
  );
  const [simulateOutage, setSimulateOutage] = useState(true);

  const totalActual = activeFacility.lines.reduce((s, l) => s + l.actualUnits, 0);
  const totalTarget = activeFacility.lines.reduce((s, l) => s + l.targetUnits, 0);
  const overallEff = Math.round((totalActual / Math.max(1, totalTarget)) * 100);

  // Bottleneck detection
  const bottleneckLine = [...activeFacility.lines].sort((a, b) => a.efficiencyPct - b.efficiencyPct)[0];
  const bottleneckMachine = [...activeFacility.machines].sort(
    (a, b) => a.prediction.healthScore - b.prediction.healthScore
  )[0];

  // Interactive Production Scenario Calculation
  const hourlyPlantCapacity = activeFacility.lines.reduce((s, l) => s + l.unitCapacityPerHour, 0);
  const affectedLine = activeFacility.lines.find((l) => l.machineIds.includes(offlineMachineId));
  const capacityLossRatio = simulateOutage && affectedLine ? 0.38 : 0;
  const effectiveHourlyRate = Math.max(1, Math.round(hourlyPlantCapacity * (1 - capacityLossRatio)));
  const projectedOutput = effectiveHourlyRate * windowHours;
  const shortfallUnits = Math.max(0, orderTarget - projectedOutput);
  const estimatedDelayHrs =
    shortfallUnits > 0 ? Number((shortfallUnits / effectiveHourlyRate).toFixed(1)) : 0;

  const altMachines = activeFacility.machines.filter(
    (m) => m.id !== offlineMachineId && m.prediction.riskLevel === "Low Risk"
  );

  const chartData = activeFacility.lines.map((l) => ({
    name: l.id,
    Target: l.targetUnits,
    Actual: l.actualUnits,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Production Intelligence & Bottleneck Optimization
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeFacility.name} · Measuring output in {activeIndustry.productionUnit} · Live Shift
            Telemetry
          </p>
        </div>
        <div className="font-mono text-xs text-slate-300 tabular-nums">
          Shift Attainment: {totalActual.toLocaleString()} / {totalTarget.toLocaleString()}{" "}
          {activeIndustry.productionUnit} ({overallEff}%)
        </div>
      </div>

      {/* Line Status Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {activeFacility.lines.map((line) => (
          <div key={line.id} className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-mono text-[#00E5FF]">{line.id}</div>
                <h2 className="font-display text-base font-semibold text-slate-100">{line.name}</h2>
              </div>
              <span
                className={`text-xs font-semibold font-mono ${
                  line.status === "Bottleneck"
                    ? "text-[#EF4444]"
                    : line.status === "Degraded"
                    ? "text-[#F59E0B]"
                    : "text-[#22C55E]"
                }`}
              >
                {line.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Actual</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {line.actualUnits.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Target</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {line.targetUnits.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Efficiency</div>
                <div className="text-sm font-bold text-[#00E5FF] mt-0.5">{line.efficiencyPct}%</div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              {line.shift} · Assets: {line.machineIds.join(", ")} · Capacity:{" "}
              {line.unitCapacityPerHour.toLocaleString()} {activeIndustry.productionUnit}/hr
            </div>
          </div>
        ))}
      </div>

      {/* Bottleneck Analysis + Chart */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-100">
            Line Target vs. Actual Output
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1422", borderColor: "#334155", fontSize: "12px" }}
                />
                <Bar dataKey="Target" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-100">
            AI Bottleneck & Schedule Conflict Detection
          </h2>
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#F59E0B]">
                <AlertCircle className="h-4 w-4" />
                <span>Slowest Line: {bottleneckLine.name} ({bottleneckLine.efficiencyPct}%)</span>
              </div>
              <p className="text-slate-400">
                Lowest-health contributing asset is {bottleneckMachine.name} ({bottleneckMachine.id}) at{" "}
                {bottleneckMachine.prediction.healthScore}% health.
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Factory className="h-4 w-4 text-[#00E5FF]" />
                <span>Supply Chain Coupling</span>
              </div>
              <p className="text-slate-400">
                {activeFacility.supplyDisruption.supplierDelayDays > 0
                  ? `Active +${activeFacility.supplyDisruption.supplierDelayDays}d inbound delay is reducing line pacing.`
                  : "No inbound supply delay penalty active on production scheduling."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 10,000-Unit Production Disruption Scenario */}
      <div className="rounded-xl border border-[#00E5FF]/30 bg-[#111C2D] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-50">
              Interactive Order Disruption Scenario Calculator
            </h2>
            <p className="text-xs text-slate-400">
              Model what happens to an export delivery target when a critical machine becomes
              unavailable.
            </p>
          </div>
          <span className="font-mono text-xs text-[#00E5FF]">LIVE CAPACITY MODEL</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-300 mb-1">
              Order Target ({activeIndustry.productionUnit})
            </label>
            <input
              type="number"
              value={orderTarget}
              onChange={(e) => setOrderTarget(Math.max(500, Number(e.target.value)))}
              className="w-full rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs font-mono text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Available Shift Window (hrs)</label>
            <input
              type="number"
              min={4}
              max={48}
              value={windowHours}
              onChange={(e) => setWindowHours(Math.max(4, Number(e.target.value)))}
              className="w-full rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs font-mono text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">Affected Machine</label>
            <select
              value={offlineMachineId}
              onChange={(e) => setOfflineMachineId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            >
              {activeFacility.machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setSimulateOutage((v) => !v)}
              className={`w-full rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                simulateOutage
                  ? "bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/50"
                  : "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50"
              }`}
            >
              {simulateOutage ? "Testing Machine Offline Impact" : "Machine Operating Normally"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 font-mono tabular-nums">
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
            <div className="text-xs text-slate-400">Projected Output</div>
            <div className="text-xl font-bold text-slate-100 mt-1">
              {projectedOutput.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
            <div className="text-xs text-slate-400">Estimated Shortfall</div>
            <div
              className={`text-xl font-bold mt-1 ${
                shortfallUnits > 0 ? "text-[#EF4444]" : "text-[#22C55E]"
              }`}
            >
              {shortfallUnits.toLocaleString()} {activeIndustry.productionUnit}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
            <div className="text-xs text-slate-400">Estimated Delivery Delay</div>
            <div className="text-xl font-bold text-[#F59E0B] mt-1">{estimatedDelayHrs} hrs</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4">
            <div className="text-xs text-slate-400">Healthy Standby Assets</div>
            <div className="text-xl font-bold text-[#00E5FF] mt-1">{altMachines.length} ready</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-100">
              <CheckCircle2 className="h-4 w-4 text-[#00E5FF]" />
              <span>Recommended Alternative Production & Maintenance Plan</span>
            </div>
            <p className="text-slate-400">
              Route priority batches via{" "}
              {altMachines
                .slice(0, 2)
                .map((m) => m.id)
                .join(" & ") || "secondary line"}
              , extend shift window by {Math.ceil(estimatedDelayHrs)}h if shortfall &gt; 0, and
              schedule preventive repair for {offlineMachineId} during non-peak changeover.
            </p>
          </div>
          <button
            onClick={() => {
              createMaintenanceTask({
                machineId: offlineMachineId,
                machineName:
                  activeFacility.machines.find((m) => m.id === offlineMachineId)?.name ||
                  offlineMachineId,
                title: `Changeover-window PM for ${offlineMachineId} to protect ${orderTarget.toLocaleString()} order`,
                priority: "High",
                assignedTechnician: "Eng. Tanvir Ahmed",
                dueDate: new Date().toISOString().slice(0, 10),
                estimatedDurationHrs: 2,
                notes: "Scheduled from Production Intelligence disruption model.",
              });
              navigate("maintenance");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E5FF] px-3.5 py-2 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF] shrink-0"
          >
            Apply Maintenance Window
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
