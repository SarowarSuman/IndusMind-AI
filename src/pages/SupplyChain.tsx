import React from "react";
import { AlertTriangle, ArrowRight, Package, Truck } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";

export const SupplyChain: React.FC = () => {
  const { activeFacility, updateSupplyDisruption, activeIndustry } = useIndustry();
  const dis = activeFacility.supplyDisruption;

  const networkStages = [
    {
      stage: "Suppliers",
      status: dis.supplierDelayDays > 0 ? `Delayed (+${dis.supplierDelayDays}d)` : "On Schedule",
      risk: dis.supplierDelayDays > 0,
    },
    {
      stage: "Raw Materials",
      status: `${activeFacility.materials.length} Active SKUs`,
      risk: activeFacility.materials.some((m) => m.currentInventory <= m.reorderThreshold),
    },
    {
      stage: "Warehouse",
      status: dis.inventoryShortagePct > 0 ? `-${dis.inventoryShortagePct}% Buffer` : "Buffer Adequate",
      risk: dis.inventoryShortagePct > 15,
    },
    {
      stage: "Production",
      status: activeFacility.lines[0]?.status || "Running",
      risk: activeFacility.lines.some((l) => l.status !== "Running"),
    },
    {
      stage: "Finished Goods",
      status: `${activeIndustry.dailyTarget.toLocaleString()} ${activeIndustry.productionUnit}/d target`,
      risk: dis.portCongestion,
    },
    {
      stage: "Customer Delivery",
      status: dis.roadDisruption || dis.weatherDisruption ? "Transit Friction" : "Corridor Clear",
      risk: dis.roadDisruption || dis.weatherDisruption || dis.portCongestion,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-50">
          Supply Chain & Inventory Resilience
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {activeFacility.name} · Live supplier profiles, logistics corridors & inventory runway
        </p>
      </div>

      {/* Interactive Supply Chain Network Diagram */}
      <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-100">
            End-to-End Supply & Disruption Propagation Network
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Live Connected State</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {networkStages.map((node, idx) => (
            <div key={node.stage} className="flex items-center gap-2">
              <div
                className={`flex-1 rounded-xl border p-3.5 space-y-1 ${
                  node.risk
                    ? "border-[#F59E0B]/60 bg-[#F59E0B]/10"
                    : "border-slate-800 bg-[#0D1422]"
                }`}
              >
                <div className="text-xs font-semibold text-slate-100">{node.stage}</div>
                <div
                  className={`text-[11px] font-mono ${
                    node.risk ? "text-[#F59E0B]" : "text-[#22C55E]"
                  }`}
                >
                  {node.status}
                </div>
              </div>
              {idx < networkStages.length - 1 && (
                <ArrowRight className="hidden lg:block h-4 w-4 text-slate-600 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Disruption Stress-Test Controls */}
      <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-100">
          Corridor Delay & Disruption Controls
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5 space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300">Supplier Delay (Days)</span>
              <span className="text-[#00E5FF] font-semibold">+{dis.supplierDelayDays}d</span>
            </div>
            <input
              type="range"
              min={0}
              max={7}
              step={1}
              value={dis.supplierDelayDays}
              onChange={(e) => updateSupplyDisruption({ supplierDelayDays: Number(e.target.value) })}
              className="w-full accent-[#00E5FF]"
            />
          </div>

          <button
            onClick={() => updateSupplyDisruption({ portCongestion: !dis.portCongestion })}
            className={`rounded-lg border p-3.5 text-left transition-colors ${
              dis.portCongestion
                ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-slate-800 bg-[#0D1422] text-slate-300"
            }`}
          >
            <div className="font-semibold">Port Congestion</div>
            <div className="text-[11px] mt-1">
              {dis.portCongestion ? "Active (Chattogram / ICD lag)" : "Click to activate"}
            </div>
          </button>

          <button
            onClick={() => updateSupplyDisruption({ roadDisruption: !dis.roadDisruption })}
            className={`rounded-lg border p-3.5 text-left transition-colors ${
              dis.roadDisruption
                ? "border-[#F59E0B] bg-[#F59E0B]/10 text-[#F59E0B]"
                : "border-slate-800 bg-[#0D1422] text-slate-300"
            }`}
          >
            <div className="font-semibold">Road / Highway Disruption</div>
            <div className="text-[11px] mt-1">
              {dis.roadDisruption ? "Active (Corridor slowdown)" : "Click to activate"}
            </div>
          </button>

          <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5 space-y-2">
            <div className="flex justify-between font-mono">
              <span className="text-slate-300">Inventory Shortage Stress</span>
              <span className="text-[#EF4444] font-semibold">-{dis.inventoryShortagePct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={10}
              value={dis.inventoryShortagePct}
              onChange={(e) =>
                updateSupplyDisruption({ inventoryShortagePct: Number(e.target.value) })
              }
              className="w-full accent-[#EF4444]"
            />
          </div>
        </div>
      </div>

      {/* Suppliers & Raw Material Inventory */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#00E5FF]" />
            <h2 className="font-display text-base font-semibold text-slate-100">
              Active Supplier Profiles
            </h2>
          </div>
          <div className="space-y-3">
            {activeFacility.suppliers.map((sup) => (
              <div
                key={sup.id}
                className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 space-y-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">
                    {sup.id} · {sup.name}
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      sup.shipmentStatus === "Delayed"
                        ? "text-[#EF4444]"
                        : sup.shipmentStatus === "At Risk"
                        ? "text-[#F59E0B]"
                        : "text-[#22C55E]"
                    }`}
                  >
                    {sup.shipmentStatus}
                  </span>
                </div>
                <div className="text-slate-400">{sup.material}</div>
                <div className="flex flex-wrap gap-4 pt-1 font-mono text-[11px] text-slate-300 tabular-nums">
                  <span>Lead: {sup.leadTimeDays + dis.supplierDelayDays}d</span>
                  <span>Reliability: {sup.reliabilityScore}%</span>
                  <span>Dependency: {sup.dependencyLevel}</span>
                  <span>ETA: {sup.expectedDeliveryDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#00E5FF]" />
            <h2 className="font-display text-base font-semibold text-slate-100">
              Raw Material Runway Monitor
            </h2>
          </div>
          <div className="space-y-3">
            {activeFacility.materials.map((mat) => {
              const effectiveStock = Math.round(
                mat.currentInventory * (1 - dis.inventoryShortagePct / 100)
              );
              const daysLeft = effectiveStock / Math.max(1, mat.dailyConsumption);
              const low = effectiveStock <= mat.reorderThreshold || daysLeft < 4;
              return (
                <div
                  key={mat.id}
                  className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-100">{mat.name}</span>
                    <span
                      className={`font-mono font-semibold ${
                        daysLeft < 2.5
                          ? "text-[#EF4444]"
                          : low
                          ? "text-[#F59E0B]"
                          : "text-[#22C55E]"
                      }`}
                    >
                      {daysLeft.toFixed(1)} days remaining
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-300 tabular-nums">
                    <div>
                      Stock: {effectiveStock.toLocaleString()} {mat.unit}
                    </div>
                    <div>Reorder: {mat.reorderThreshold.toLocaleString()}</div>
                    <div>
                      Incoming: +{mat.incomingStock.toLocaleString()} ({mat.incomingEtaDays + dis.supplierDelayDays}d)
                    </div>
                  </div>
                  {low && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#F59E0B]">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Recommendation: Place expedited reorder and prioritize high-priority orders.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
