import React, { useState } from "react";
import { Activity, Plus, Search, Wrench } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { MachineAsset, MachineVisualKind } from "../types/industrial";

export const Machines: React.FC = () => {
  const {
    activeFacility,
    activeIndustry,
    selectedMachineId,
    setSelectedMachineId,
    selectedMachine,
    addCustomMachine,
    navigate,
  } = useIndustry();

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newCategory, setNewCategory] = useState(activeIndustry.machineCategories[0] || "Drive Motors");
  const [newKind, setNewKind] = useState<MachineVisualKind>("motor");
  const [newZone, setNewZone] = useState<MachineAsset["zone"]>("Production Floor");
  const [newTemp, setNewTemp] = useState("58");
  const [newVib, setNewVib] = useState("1.9");
  const [newPower, setNewPower] = useState("24");
  const [newRpm, setNewRpm] = useState("1450");

  const filtered = activeFacility.machines.filter((m) => {
    const matchesQuery =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === "All" || m.prediction.riskLevel === riskFilter;
    return matchesQuery && matchesRisk;
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCustomMachine({
      name: newName.trim(),
      id: newId.trim() || `AST-${activeFacility.machines.length + 1}`,
      category: newCategory,
      visualKind: newKind,
      zone: newZone,
      tempNominal: Number(newTemp) || 55,
      vibrationNominal: Number(newVib) || 1.8,
      powerNominal: Number(newPower) || 22,
      rpmNominal: Number(newRpm) || 1450,
    });
    setNewName("");
    setNewId("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Machine & Asset Intelligence Directory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeFacility.name} · {activeFacility.machines.length} configured industrial assets
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#00E5FF] px-4 py-2 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
        >
          <Plus className="h-4 w-4" />
          Add Custom Machine
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-[#00E5FF]/40 bg-[#111C2D] p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-slate-100">
            Register New Custom Asset ({activeIndustry.name})
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Machine Name (e.g., Extruder Drive-04)"
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100 focus:border-[#00E5FF] focus:outline-none"
            />
            <input
              type="text"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="Asset ID (e.g., M-04)"
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100 focus:border-[#00E5FF] focus:outline-none"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            >
              {activeIndustry.machineCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as MachineVisualKind)}
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            >
              <option value="motor">3D Model: Industrial Motor</option>
              <option value="pump">3D Model: Pump / Compressor</option>
              <option value="robot">3D Model: Robotic / CNC Cell</option>
              <option value="conveyor">3D Model: Conveyor System</option>
              <option value="boiler">3D Model: Boiler / Kiln</option>
              <option value="generator">3D Model: Generator / Power</option>
            </select>
            <select
              value={newZone}
              onChange={(e) => setNewZone(e.target.value as MachineAsset["zone"])}
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            >
              <option value="Production Floor">Production Floor</option>
              <option value="Utilities">Utilities</option>
              <option value="Packaging & Logistics">Packaging & Logistics</option>
              <option value="Thermal & Power">Thermal & Power</option>
            </select>
            <input
              type="number"
              value={newTemp}
              onChange={(e) => setNewTemp(e.target.value)}
              placeholder="Nominal Temp (°C)"
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            />
            <input
              type="number"
              step="0.1"
              value={newVib}
              onChange={(e) => setNewVib(e.target.value)}
              placeholder="Nominal Vib (mm/s)"
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            />
            <input
              type="number"
              value={newPower}
              onChange={(e) => setNewPower(e.target.value)}
              placeholder="Nominal Power (kW)"
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            />
            <input
              type="number"
              value={newRpm}
              onChange={(e) => setNewRpm(e.target.value)}
              placeholder="Nominal RPM"
              className="rounded-lg border border-slate-700 bg-[#0D1422] px-3 py-2 text-xs text-slate-100"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-[#00E5FF] px-3 py-2 text-xs font-semibold text-[#070B14]"
              >
                Save Asset
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, machine name, or category..."
            className="w-full rounded-lg border border-slate-700 bg-[#111C2D] pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-[#00E5FF] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", "Low Risk", "Moderate Risk", "High Risk", "Critical Risk"].map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                riskFilter === r
                  ? "bg-[#00E5FF] text-[#070B14] font-semibold"
                  : "border border-slate-700 bg-[#111C2D] text-slate-300 hover:border-slate-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#111C2D] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No machines match your current search/filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-[#0D1422] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Machine</th>
                    <th className="px-4 py-3 font-medium text-right">Health</th>
                    <th className="px-4 py-3 font-medium text-right">Temp</th>
                    <th className="px-4 py-3 font-medium text-right">Vib</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedMachineId === m.id ? "bg-[#00E5FF]/10" : "hover:bg-[#0D1422]/60"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-[#00E5FF]">{m.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{m.name}</div>
                        <div className="text-[11px] text-slate-400">{m.category}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                        {m.prediction.healthScore}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {m.temperature.toFixed(1)}°C
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {m.vibration.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-medium ${
                            m.prediction.riskLevel === "Critical Risk"
                              ? "text-[#EF4444]"
                              : m.prediction.riskLevel === "Low Risk"
                              ? "text-[#22C55E]"
                              : "text-[#F59E0B]"
                          }`}
                        >
                          {m.prediction.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-[#00E5FF]">{selectedMachine.id}</span>
            <span className="text-xs text-slate-400">{selectedMachine.zone}</span>
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-50">{selectedMachine.name}</h2>
            <p className="text-xs text-slate-400">
              {selectedMachine.manufacturer} · Model {selectedMachine.model} · Installed{" "}
              {selectedMachine.installationDate}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono tabular-nums">
            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-2.5">
              <div className="text-slate-400">Operating Hours</div>
              <div className="text-slate-100 font-semibold mt-0.5">
                {selectedMachine.operatingHours.toLocaleString()} hrs
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-2.5">
              <div className="text-slate-400">Power / RPM</div>
              <div className="text-slate-100 font-semibold mt-0.5">
                {selectedMachine.powerKw.toFixed(1)} kW · {Math.round(selectedMachine.rpm)} RPM
              </div>
            </div>
            {selectedMachine.thresholds.hasPressure && (
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-2.5">
                <div className="text-slate-400">Pressure</div>
                <div className="text-slate-100 font-semibold mt-0.5">
                  {selectedMachine.pressureBar?.toFixed(1)} bar
                </div>
              </div>
            )}
            {selectedMachine.thresholds.hasTorque && (
              <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-2.5">
                <div className="text-slate-400">Shaft Torque</div>
                <div className="text-slate-100 font-semibold mt-0.5">
                  {selectedMachine.torqueNm?.toFixed(1)} Nm
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
              Maintenance History
            </div>
            {selectedMachine.maintenanceHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No historical PM logs recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {selectedMachine.maintenanceHistory.map((mh) => (
                  <div
                    key={mh.id}
                    className="rounded-lg border border-slate-800 bg-[#0D1422] p-2.5 text-xs"
                  >
                    <div className="flex justify-between text-slate-400 font-mono text-[11px]">
                      <span>{mh.date}</span>
                      <span>{mh.technician}</span>
                    </div>
                    <div className="text-slate-200 font-medium mt-0.5">{mh.action}</div>
                    <div className="text-slate-400 mt-0.5">{mh.outcome}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("predictive")}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#00E5FF] px-4 py-2.5 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
          >
            <Activity className="h-4 w-4" />
            Open Predictive Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
