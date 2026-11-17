import React, { useMemo, useState } from "react";
import { Calendar, CheckCircle2, Clock, ListChecks, Plus, Wrench } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { AlertPriority, MaintenanceStatus } from "../types/industrial";

const STATUS_FILTERS: Array<"All" | MaintenanceStatus> = [
  "All",
  "Scheduled",
  "In Progress",
  "Overdue",
  "Completed",
  "Cancelled",
];

const STATUS_BADGE: Record<MaintenanceStatus, string> = {
  Scheduled: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  "In Progress": "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Overdue: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Cancelled: "bg-slate-700/40 text-slate-400 border-slate-600/40",
};

export const MaintenancePlanner: React.FC = () => {
  const {
    activeFacility,
    createMaintenanceTask,
    updateMaintenanceStatus,
    setSelectedMachineId,
    navigate,
  } = useIndustry();

  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [statusFilter, setStatusFilter] = useState<"All" | MaintenanceStatus>("All");
  const [showForm, setShowForm] = useState(false);

  const [machineId, setMachineId] = useState(activeFacility.machines[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<AlertPriority>("High");
  const [technician, setTechnician] = useState("Tariqul Hasan (Lead Mech)");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [durationHrs, setDurationHrs] = useState(2);
  const [notes, setNotes] = useState("");

  const effectiveMachineId =
    activeFacility.machines.find((m) => m.id === machineId)?.id ??
    activeFacility.machines[0]?.id ??
    "";

  const filteredTasks = useMemo(() => {
    if (statusFilter === "All") return activeFacility.maintenanceTasks;
    return activeFacility.maintenanceTasks.filter((t) => t.status === statusFilter);
  }, [activeFacility.maintenanceTasks, statusFilter]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, typeof activeFacility.maintenanceTasks> = {};
    filteredTasks.forEach((t) => {
      const key = t.dueDate || "Unscheduled";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTasks]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const machine = activeFacility.machines.find((m) => m.id === effectiveMachineId);
    if (!machine || !title.trim()) return;

    createMaintenanceTask({
      machineId: machine.id,
      machineName: machine.name,
      title: title.trim(),
      priority,
      assignedTechnician: technician.trim() || "Maintenance Crew",
      dueDate,
      estimatedDurationHrs: Math.max(0.5, Number(durationHrs) || 2),
      notes: notes.trim() || "Scheduled via Maintenance Planner.",
    });

    setTitle("");
    setNotes("");
    setShowForm(false);
  };

  const counts = {
    open: activeFacility.maintenanceTasks.filter(
      (t) => t.status === "Scheduled" || t.status === "In Progress" || t.status === "Overdue"
    ).length,
    inProgress: activeFacility.maintenanceTasks.filter((t) => t.status === "In Progress").length,
    overdue: activeFacility.maintenanceTasks.filter((t) => t.status === "Overdue").length,
    completed: activeFacility.maintenanceTasks.filter((t) => t.status === "Completed").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Work Order Execution
          </p>
          <h1 className="text-2xl font-bold text-slate-100">Maintenance Planner</h1>
          <p className="text-sm text-slate-400 mt-1">
            Schedule inspections, assign engineers, and restore machine health upon task completion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#0D1422] border border-[#1E293B] p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Schedule
            </button>
          </div>

          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Work Orders", value: counts.open, tone: "text-cyan-300" },
          { label: "In Progress", value: counts.inProgress, tone: "text-amber-300" },
          { label: "Overdue Tasks", value: counts.overdue, tone: "text-rose-400" },
          { label: "Completed Repairs", value: counts.completed, tone: "text-emerald-300" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
            <div className="text-xs text-slate-400">{kpi.label}</div>
            <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Create Task Drawer/Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl bg-[#0D1422] border border-cyan-500/30 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Create Preventive Maintenance Work Order
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Machine</label>
              <select
                value={effectiveMachineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-2 text-xs text-slate-200"
              >
                {activeFacility.machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.prediction.riskLevel})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Work Order Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Bearing inspection, laser alignment & grease replacement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AlertPriority)}
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-2 text-xs text-slate-200"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Assigned Technician</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-2 text-xs text-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-2.5 py-2 text-xs font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Est. Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={durationHrs}
                  onChange={(e) => setDurationHrs(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-2.5 py-2 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Execution Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Parts required, isolation steps, or sensor anomaly reference..."
              className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg bg-[#111C2D] border border-[#1E293B] text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400"
            >
              Save Maintenance Task
            </button>
          </div>
        </form>
      )}

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === st
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                : "bg-[#0D1422] border-[#1E293B] text-slate-400 hover:text-slate-200"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Task List or Calendar Timeline View */}
      {viewMode === "list" ? (
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-8 text-center text-sm text-slate-400">
              No maintenance tasks match the selected filter.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-slate-500">{task.id}</span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                        STATUS_BADGE[task.status]
                      }`}
                    >
                      {task.status}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#111C2D] text-slate-300">
                      {task.priority} Priority
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{task.title}</div>
                  <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedMachineId(task.machineId);
                        navigate("predictive");
                      }}
                      className="text-cyan-400 hover:underline font-medium"
                    >
                      {task.machineName}
                    </button>
                    <span>Technician: {task.assignedTechnician}</span>
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due {task.dueDate} ({task.estimatedDurationHrs}h)
                    </span>
                  </div>
                  {task.notes && <p className="text-xs text-slate-500 pt-1">{task.notes}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateMaintenanceStatus(task.id, e.target.value as MaintenanceStatus)
                    }
                    className="rounded-lg bg-[#111C2D] border border-[#1E293B] px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {task.status !== "Completed" && (
                    <button
                      onClick={() => updateMaintenanceStatus(task.id, "Completed")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complete & Restore Asset
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasksByDate.map(([dateKey, items]) => (
            <div key={dateKey} className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 mb-3">
                <span className="text-xs font-mono font-semibold text-cyan-300">{dateKey}</span>
                <span className="text-[11px] text-slate-400">{items.length} task(s)</span>
              </div>
              <div className="space-y-2.5">
                {items.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-[#111C2D] border border-[#1E293B]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">{t.machineName}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          STATUS_BADGE[t.status]
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{t.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {t.assignedTechnician} · {t.estimatedDurationHrs}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Machine-wise Maintenance History */}
      <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
        <h2 className="text-sm font-semibold text-slate-100 mb-3">
          Recent Machine Maintenance Log ({activeFacility.name})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E293B] text-slate-400">
                <th className="py-2 pr-4">Machine</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Action Performed</th>
                <th className="py-2 pr-4">Technician</th>
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]">
              {activeFacility.machines
                .flatMap((m) =>
                  m.maintenanceHistory.map((h) => ({
                    machineName: m.name,
                    machineId: m.id,
                    ...h,
                  }))
                )
                .slice(0, 12)
                .map((row) => (
                  <tr key={`${row.machineId}-${row.id}`} className="text-slate-300">
                    <td className="py-2.5 pr-4 font-medium text-cyan-300">{row.machineName}</td>
                    <td className="py-2.5 pr-4 font-mono text-slate-400">{row.date}</td>
                    <td className="py-2.5 pr-4">{row.action}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{row.technician}</td>
                    <td className="py-2.5 pr-4 text-emerald-300">{row.outcome}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">৳{row.costBdt.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
