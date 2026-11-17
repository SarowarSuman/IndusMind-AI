import React, { useState } from "react";
import { Bot, CalendarPlus, Compass, Focus, Layers, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { FactoryTwin3D, TwinCameraPreset } from "../components/three/FactoryTwin3D";

export const DigitalTwin: React.FC = () => {
  const {
    activeFacility,
    selectedMachineId,
    setSelectedMachineId,
    selectedMachine,
    navigate,
    askCopilot,
    createMaintenanceTask,
  } = useIndustry();

  const [cameraPreset, setCameraPreset] = useState<TwinCameraPreset>("overview");
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [zoomDelta, setZoomDelta] = useState(0);
  const [zoomTrigger, setZoomTrigger] = useState(0);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  const triggerPreset = (preset: TwinCameraPreset) => {
    setCameraPreset(preset);
    setPresetTrigger((n) => n + 1);
  };

  const triggerZoom = (delta: number) => {
    setZoomDelta(delta);
    setZoomTrigger((n) => n + 1);
  };

  const connectedMachines = activeFacility.machines.filter((m) =>
    selectedMachine.connectedTo.includes(m.id)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Interactive 3D Factory Digital Twin
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeFacility.name} · Hover to inspect telemetry, click any asset to trace line
            dependencies
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-700 bg-[#0D1422] p-0.5">
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === "3d" ? "bg-[#00E5FF] text-[#070B14] font-semibold" : "text-slate-300"
              }`}
            >
              3D Spatial
            </button>
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === "2d" ? "bg-[#00E5FF] text-[#070B14] font-semibold" : "text-slate-300"
              }`}
            >
              2D Zone Map
            </button>
          </div>

          <button
            onClick={() => triggerPreset("isometric")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs text-slate-200 hover:border-[#00E5FF]"
          >
            <Compass className="h-3.5 w-3.5" />
            Isometric
          </button>
          <button
            onClick={() => triggerPreset("topdown")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs text-slate-200 hover:border-[#00E5FF]"
          >
            <Layers className="h-3.5 w-3.5" />
            Top-Down
          </button>
          <button
            onClick={() => triggerPreset("critical")}
            className="inline-flex items-center gap-1 rounded-lg border border-[#EF4444]/50 bg-[#EF4444]/10 px-2.5 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/20"
          >
            <Focus className="h-3.5 w-3.5" />
            Focus Critical
          </button>
          <button
            onClick={() => triggerZoom(1)}
            aria-label="Zoom in"
            className="rounded-lg border border-slate-700 bg-[#111C2D] p-1.5 text-slate-200 hover:border-[#00E5FF]"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => triggerZoom(-1)}
            aria-label="Zoom out"
            className="rounded-lg border border-slate-700 bg-[#111C2D] p-1.5 text-slate-200 hover:border-[#00E5FF]"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => triggerPreset("overview")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {viewMode === "3d" ? (
            <div className="h-[340px] sm:h-[440px] lg:h-[520px] w-full">
              <FactoryTwin3D
                machines={activeFacility.machines}
                selectedMachineId={selectedMachineId}
                onSelectMachine={(id) => setSelectedMachineId(id)}
                cameraPreset={cameraPreset}
                presetTrigger={presetTrigger}
                zoomDelta={zoomDelta}
                zoomTrigger={zoomTrigger}
                showZones
              />
            </div>
          ) : (
            <div className="min-h-[380px] lg:min-h-[520px] rounded-xl border border-slate-800 bg-[#0D1422] p-4 sm:p-5 flex flex-col justify-between gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>2D Plant Zone Layout & Connected Line Topology</span>
                <span className="font-mono">Zones: Production · Utilities · Packaging · Power</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-auto">
                {activeFacility.machines.map((m) => {
                  const isCrit = m.prediction.riskLevel === "Critical Risk";
                  const isWarn =
                    m.prediction.riskLevel === "High Risk" || m.prediction.riskLevel === "Moderate Risk";
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`text-left rounded-xl border p-4 transition-colors ${
                        selectedMachineId === m.id
                          ? "border-[#00E5FF] bg-[#111C2D]"
                          : "border-slate-800 bg-[#070B14] hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#00E5FF]">{m.id}</span>
                        <span
                          className={`font-mono font-semibold ${
                            isCrit ? "text-[#EF4444]" : isWarn ? "text-[#F59E0B]" : "text-[#22C55E]"
                          }`}
                        >
                          {m.prediction.healthScore}% · {m.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 mt-1.5 truncate">{m.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.zone}</p>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-300 tabular-nums">
                        {m.temperature.toFixed(1)}°C · {m.vibration.toFixed(2)} mm/s · Feeds:{" "}
                        {m.connectedTo.join(", ")}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-slate-400">
                Green: Nominal · Amber: Warning/Moderate-High Risk · Red: Critical Risk
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#111C2D] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-[#00E5FF]">
                {selectedMachine.id} · {selectedMachine.zone}
              </span>
              <span
                className={`font-mono text-xs font-semibold ${
                  selectedMachine.status === "Critical"
                    ? "text-[#EF4444]"
                    : selectedMachine.status === "Warning"
                    ? "text-[#F59E0B]"
                    : "text-[#22C55E]"
                }`}
              >
                {selectedMachine.status}
              </span>
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-slate-50">{selectedMachine.name}</h2>
              <p className="text-xs text-slate-400">
                {selectedMachine.manufacturer} · {selectedMachine.model}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs tabular-nums">
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Health Score</div>
                <div className="text-lg font-bold text-slate-50 mt-0.5">
                  {selectedMachine.prediction.healthScore}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Risk Score</div>
                <div className="text-lg font-bold text-[#F59E0B] mt-0.5">
                  {selectedMachine.prediction.riskScore}/100
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Temperature</div>
                <div className="text-sm font-semibold text-slate-100 mt-0.5">
                  {selectedMachine.temperature.toFixed(1)} °C
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3">
                <div className="text-slate-400">Vibration</div>
                <div className="text-sm font-semibold text-slate-100 mt-0.5">
                  {selectedMachine.vibration.toFixed(2)} mm/s
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3 space-y-1.5">
              <div className="text-xs font-semibold text-slate-200">
                Predicted Pattern: {selectedMachine.prediction.predictedFailureCategory}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedMachine.prediction.recommendedAction}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">
                Connected Downstream Assets
              </div>
              <div className="flex flex-wrap gap-2">
                {connectedMachines.map((cm) => (
                  <button
                    key={cm.id}
                    onClick={() => setSelectedMachineId(cm.id)}
                    className="rounded-md border border-slate-700 bg-[#0D1422] px-2.5 py-1 text-xs font-mono text-slate-200 hover:border-[#00E5FF]"
                  >
                    {cm.id} ({cm.prediction.healthScore}%)
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => navigate("predictive")}
              className="rounded-lg bg-[#00E5FF] px-3 py-2 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
            >
              Inspect Sensors
            </button>
            <button
              onClick={() => askCopilot(`Why is ${selectedMachine.id} at ${selectedMachine.prediction.riskLevel}?`)}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-[#00E5FF]"
            >
              <Bot className="h-3.5 w-3.5 text-[#00E5FF]" />
              Ask Copilot
            </button>
            <button
              onClick={() => {
                createMaintenanceTask({
                  machineId: selectedMachine.id,
                  machineName: selectedMachine.name,
                  title: selectedMachine.prediction.recommendedAction.slice(0, 64),
                  priority:
                    selectedMachine.prediction.riskLevel === "Critical Risk" ? "Critical" : "High",
                  assignedTechnician: "Eng. Tanvir Ahmed",
                  dueDate: new Date().toISOString().slice(0, 10),
                  estimatedDurationHrs: 2.5,
                  notes: `Scheduled from Digital Twin inspector.`,
                });
                navigate("maintenance");
              }}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Schedule Maintenance Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
