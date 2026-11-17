import React, { useMemo, useState } from "react";
import { Bot, Box, CalendarPlus, RotateCcw, Sliders } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIndustry } from "../context/IndustryContext";

type TimeFilter = "1h" | "6h" | "24h" | "7d" | "30d";

export const PredictiveMaintenance: React.FC = () => {
  const {
    activeFacility,
    selectedMachineId,
    setSelectedMachineId,
    selectedMachine,
    updateMachineSensors,
    createMaintenanceTask,
    askCopilot,
    navigate,
  } = useIndustry();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");

  // Build dynamic chart series scaled cleanly to selected time window
  const chartSeries = useMemo(() => {
    const raw = selectedMachine.history;
    if (timeFilter === "1h") {
      return raw.slice(-4).map((h, i) => ({
        label: `-${(3 - i) * 15}m`,
        temp: h.temperature,
        vib: h.vibration,
        power: h.powerKw,
        health: h.healthScore,
      }));
    }
    if (timeFilter === "6h") {
      return raw.slice(-6).map((h, i) => ({
        label: `-${5 - i}h`,
        temp: h.temperature,
        vib: h.vibration,
        power: h.powerKw,
        health: h.healthScore,
      }));
    }
    if (timeFilter === "24h") {
      return raw.slice(-16).map((h, i, arr) => ({
        label: `-${arr.length - 1 - i}h`,
        temp: h.temperature,
        vib: h.vibration,
        power: h.powerKw,
        health: h.healthScore,
      }));
    }
    if (timeFilter === "7d") {
      return Array.from({ length: 7 }, (_, i) => {
        const idx = Math.min(raw.length - 1, Math.floor((i / 6) * (raw.length - 1)));
        const h = raw[idx];
        return {
          label: `Day ${i + 1}`,
          temp: h.temperature,
          vib: h.vibration,
          power: h.powerKw,
          health: h.healthScore,
        };
      });
    }
    return Array.from({ length: 10 }, (_, i) => {
      const idx = Math.min(raw.length - 1, Math.floor((i / 9) * (raw.length - 1)));
      const h = raw[idx];
      return {
        label: `D-${(9 - i) * 3}`,
        temp: h.temperature,
        vib: h.vibration,
        power: h.powerKw,
        health: h.healthScore,
      };
    });
  }, [selectedMachine.history, timeFilter]);

  const pred = selectedMachine.prediction;
  const t = selectedMachine.thresholds;

  const restoreMachineBaseline = () => {
    updateMachineSensors(selectedMachine.id, {
      temperature: t.tempNominal,
      vibration: t.vibrationNominal,
      powerKw: t.powerNominal,
      rpm: t.rpmNominal,
      pressureBar: t.pressureNominal,
      torqueNm: t.torqueNominal,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Predictive Maintenance & Sensor Diagnostics Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent deterministic anomaly scoring · Adjust sensor sliders below to test live
            health recalculation, alerts, and 3D Digital Twin status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Select Machine to Inspect"
            value={selectedMachineId}
            onChange={(e) => setSelectedMachineId(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-2 text-xs font-medium text-slate-100 focus:border-[#00E5FF] focus:outline-none"
          >
            {activeFacility.machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id} — {m.name} ({m.prediction.healthScore}%)
              </option>
            ))}
          </select>
          <button
            onClick={restoreMachineBaseline}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-2 text-xs font-medium text-slate-200 hover:border-[#00E5FF]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Nominal
          </button>
        </div>
      </div>

      {/* Top Prediction Summary + Interactive Sliders */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Interactive Sensor Sliders */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#00E5FF]" />
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Interactive Sensor Stress-Test ({selectedMachine.id})
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-400">Live Shared State</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono tabular-nums">
                <label htmlFor="slider-temp" className="text-slate-300">
                  Temperature (°C) · Max {t.tempMax}°C
                </label>
                <span className="font-semibold text-slate-100">
                  {selectedMachine.temperature.toFixed(1)} °C
                </span>
              </div>
              <input
                id="slider-temp"
                type="range"
                min={Math.round(t.tempNominal * 0.6)}
                max={Math.round(t.tempMax * 1.25)}
                step={0.5}
                value={selectedMachine.temperature}
                onChange={(e) =>
                  updateMachineSensors(selectedMachine.id, { temperature: Number(e.target.value) })
                }
                className="w-full accent-[#00E5FF]"
              />
            </div>

            {/* Vibration */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono tabular-nums">
                <label htmlFor="slider-vib" className="text-slate-300">
                  Vibration (mm/s) · Max {t.vibrationMax} mm/s
                </label>
                <span className="font-semibold text-slate-100">
                  {selectedMachine.vibration.toFixed(2)} mm/s
                </span>
              </div>
              <input
                id="slider-vib"
                type="range"
                min={0.5}
                max={Number((t.vibrationMax * 1.35).toFixed(1))}
                step={0.1}
                value={selectedMachine.vibration}
                onChange={(e) =>
                  updateMachineSensors(selectedMachine.id, { vibration: Number(e.target.value) })
                }
                className="w-full accent-[#00E5FF]"
              />
            </div>

            {/* Power */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono tabular-nums">
                <label htmlFor="slider-power" className="text-slate-300">
                  Power Consumption (kW) · Max {t.powerMax} kW
                </label>
                <span className="font-semibold text-slate-100">
                  {selectedMachine.powerKw.toFixed(1)} kW
                </span>
              </div>
              <input
                id="slider-power"
                type="range"
                min={Math.max(4, Math.round(t.powerNominal * 0.5))}
                max={Math.round(t.powerMax * 1.3)}
                step={0.5}
                value={selectedMachine.powerKw}
                onChange={(e) =>
                  updateMachineSensors(selectedMachine.id, { powerKw: Number(e.target.value) })
                }
                className="w-full accent-[#00E5FF]"
              />
            </div>

            {/* RPM */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono tabular-nums">
                <label htmlFor="slider-rpm" className="text-slate-300">
                  Rotational Speed (RPM) · Rated {t.rpmNominal}
                </label>
                <span className="font-semibold text-slate-100">
                  {Math.round(selectedMachine.rpm)} RPM
                </span>
              </div>
              <input
                id="slider-rpm"
                type="range"
                min={Math.round(t.rpmNominal * 0.65)}
                max={Math.round(t.rpmNominal * 1.25)}
                step={10}
                value={selectedMachine.rpm}
                onChange={(e) =>
                  updateMachineSensors(selectedMachine.id, { rpm: Number(e.target.value) })
                }
                className="w-full accent-[#00E5FF]"
              />
            </div>

            {/* Operating Hours */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono tabular-nums">
                <label htmlFor="slider-hours" className="text-slate-300">
                  Cumulative Operating Hours
                </label>
                <span className="font-semibold text-slate-100">
                  {selectedMachine.operatingHours.toLocaleString()} hrs
                </span>
              </div>
              <input
                id="slider-hours"
                type="range"
                min={500}
                max={16000}
                step={100}
                value={selectedMachine.operatingHours}
                onChange={(e) =>
                  updateMachineSensors(selectedMachine.id, {
                    operatingHours: Number(e.target.value),
                  })
                }
                className="w-full accent-[#00E5FF]"
              />
            </div>
          </div>
        </div>

        {/* AI Failure Prediction & Assessment */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111C2D] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-50">
                  {selectedMachine.name}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedMachine.category} · {selectedMachine.manufacturer} · {selectedMachine.model}
                </p>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-xs text-slate-400">Asset Health Score</div>
                <div
                  className={`text-2xl font-bold ${
                    pred.healthScore < 50
                      ? "text-[#EF4444]"
                      : pred.healthScore < 75
                      ? "text-[#F59E0B]"
                      : "text-[#22C55E]"
                  }`}
                >
                  {pred.healthScore}% ({pred.healthBand})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Risk Classification</div>
                <div
                  className={`font-semibold text-sm mt-1 ${
                    pred.riskLevel === "Critical Risk"
                      ? "text-[#EF4444]"
                      : pred.riskLevel === "Low Risk"
                      ? "text-[#22C55E]"
                      : "text-[#F59E0B]"
                  }`}
                >
                  {pred.riskLevel} ({pred.riskScore}/100)
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3 sm:col-span-2">
                <div className="text-slate-400">Predicted Failure Category</div>
                <div className="font-semibold text-sm text-slate-100 mt-1">
                  {pred.predictedFailureCategory}
                </div>
              </div>
            </div>

            {/* Contributing Factors */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                Weighted Anomaly Attribution
              </div>
              <div className="space-y-2">
                {pred.contributingFactors.slice(0, 4).map((f) => (
                  <div
                    key={f.metric}
                    className="rounded-lg border border-slate-800 bg-[#0D1422] px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                  >
                    <span className="text-slate-200">
                      <span className="font-semibold text-[#00E5FF]">{f.metric}</span> ({f.weight}%
                      weight): {f.summary}
                    </span>
                    <span className="font-mono tabular-nums text-slate-400 shrink-0">
                      {f.deltaPct >= 0 ? "+" : ""}
                      {f.deltaPct}% vs nominal
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5 space-y-1.5 text-xs">
              <div className="font-semibold text-[#00E5FF]">
                Recommended Action · {pred.recommendedInspectionWindow}
              </div>
              <p className="text-slate-200">{pred.recommendedAction}</p>
              <p className="text-slate-400">
                Potential Consequence: {pred.operationalConsequence}
              </p>
              <p className="text-[11px] text-slate-500 pt-1">{pred.confidenceNote}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => {
                createMaintenanceTask({
                  machineId: selectedMachine.id,
                  machineName: selectedMachine.name,
                  title: pred.recommendedAction.slice(0, 64),
                  priority: pred.riskLevel === "Critical Risk" ? "Critical" : "High",
                  assignedTechnician: "Eng. Tanvir Ahmed",
                  dueDate: new Date().toISOString().slice(0, 10),
                  estimatedDurationHrs: 3,
                  notes: `Created from Predictive Maintenance (${pred.predictedFailureCategory}).`,
                });
                navigate("maintenance");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E5FF] px-4 py-2 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
            >
              <CalendarPlus className="h-4 w-4" />
              Schedule Maintenance
            </button>
            <button
              onClick={() => askCopilot(`Why is ${selectedMachine.id} at ${pred.riskLevel}?`)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0D1422] px-4 py-2 text-xs font-semibold text-[#00E5FF] hover:border-[#00E5FF]"
            >
              <Bot className="h-4 w-4" />
              Explain with Sphere Copilot
            </button>
            <button
              onClick={() => navigate("digital-twin")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <Box className="h-4 w-4" />
              Locate in 3D Twin
            </button>
          </div>
        </div>
      </div>

      {/* Live Multi-Sensor Telemetry Charts */}
      <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">
              Historical & Live Sensor Telemetry ({selectedMachine.id})
            </h2>
            <p className="text-xs text-slate-400">
              Updates dynamically as you adjust thresholds or run live sensor streaming
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-[#0D1422] p-1">
            {(
              [
                ["1h", "Last 1 hour"],
                ["6h", "Last 6 hours"],
                ["24h", "Last 24 hours"],
                ["7d", "Last 7 days"],
                ["30d", "Last 30 days"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTimeFilter(val)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  timeFilter === val
                    ? "bg-[#00E5FF] text-[#070B14] font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="h-64 rounded-lg border border-slate-800 bg-[#0D1422] p-3">
            <div className="text-xs font-medium text-slate-300 mb-2">
              Temperature (°C) & Health Score (%)
            </div>
            <ResponsiveContainer width="100%" height="88%">
              <AreaChart data={chartSeries}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#070B14", borderColor: "#334155", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="temp" name="Temp (°C)" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.14} strokeWidth={2} />
                <Area type="monotone" dataKey="health" name="Health (%)" stroke="#22C55E" fill="#22C55E" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64 rounded-lg border border-slate-800 bg-[#0D1422] p-3">
            <div className="text-xs font-medium text-slate-300 mb-2">
              Vibration (mm/s) & Power Draw (kW)
            </div>
            <ResponsiveContainer width="100%" height="88%">
              <AreaChart data={chartSeries}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#070B14", borderColor: "#334155", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="vib" name="Vibration (mm/s)" stroke="#EF4444" fill="#EF4444" fillOpacity={0.14} strokeWidth={2} />
                <Area type="monotone" dataKey="power" name="Power (kW)" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
