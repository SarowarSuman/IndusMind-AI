import React, { useMemo, useState } from "react";
import {
  Bell,
  Bot,
  CheckCheck,
  CheckCircle2,
  Cpu,
  Search,
  Wrench,
} from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { AlertCategory, AlertPriority } from "../types/industrial";

const PRIORITIES: Array<"All" | AlertPriority> = ["All", "Critical", "High", "Medium", "Low"];
const CATEGORIES: Array<"All" | AlertCategory> = [
  "All",
  "Machine Failure Risk",
  "Abnormal Temperature",
  "Abnormal Vibration",
  "Power Consumption",
  "Production Bottleneck",
  "Supplier Delay",
  "Inventory Shortage",
  "Weather Disruption",
  "Maintenance Overdue",
];

const PRIORITY_BADGE: Record<AlertPriority, string> = {
  Critical: "bg-rose-500/15 text-rose-300 border-rose-500/40",
  High: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  Medium: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40",
  Low: "bg-slate-700/40 text-slate-300 border-slate-600/40",
};

export const Alerts: React.FC = () => {
  const {
    activeFacility,
    markAlertRead,
    markAllAlertsRead,
    resolveAlert,
    setSelectedMachineId,
    navigate,
    createMaintenanceTask,
    askCopilot,
  } = useIndustry();

  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [priorityFilter, setPriorityFilter] = useState<"All" | AlertPriority>("All");
  const [categoryFilter, setCategoryFilter] = useState<"All" | AlertCategory>("All");
  const [search, setSearch] = useState("");
  const [actionToast, setActionToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeFacility.alerts.filter((a) => {
      if (tab === "open" && a.resolved) return false;
      if (tab === "resolved" && !a.resolved) return false;
      if (priorityFilter !== "All" && a.priority !== priorityFilter) return false;
      if (categoryFilter !== "All" && a.category !== categoryFilter) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !a.message.toLowerCase().includes(q) &&
        !a.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [activeFacility.alerts, tab, priorityFilter, categoryFilter, search]);

  const openCount = activeFacility.alerts.filter((a) => !a.resolved).length;
  const unreadCount = activeFacility.alerts.filter((a) => !a.read && !a.resolved).length;
  const resolvedCount = activeFacility.alerts.filter((a) => a.resolved).length;

  const handleQuickTask = (alert: (typeof activeFacility.alerts)[number]) => {
    const targetMachine =
      activeFacility.machines.find((m) => m.id === alert.machineId) ?? activeFacility.machines[0];
    if (!targetMachine) return;

    createMaintenanceTask({
      machineId: targetMachine.id,
      machineName: targetMachine.name,
      title: `Mitigate: ${alert.title}`,
      priority: alert.priority,
      assignedTechnician: "Tariqul Hasan (Lead Mech)",
      dueDate: new Date().toISOString().slice(0, 10),
      estimatedDurationHrs: 2,
      notes: `${alert.message} Recommended: ${alert.recommendedAction}`,
      createdFromAlertId: alert.id,
    });
    markAlertRead(alert.id);
    setActionToast(`Created maintenance task for ${targetMachine.name}.`);
    setTimeout(() => setActionToast(null), 3500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Alert Triage & Mitigation
          </p>
          <h1 className="text-2xl font-bold text-slate-100">Alerts Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Filter anomalies, dispatch maintenance work orders, or investigate root causes with Sphere Copilot.
          </p>
        </div>

        <button
          onClick={markAllAlertsRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0D1422] border border-[#1E293B] hover:border-cyan-500/40 text-xs font-medium text-slate-200 disabled:opacity-50 transition-colors"
        >
          <CheckCheck className="w-4 h-4 text-cyan-400" />
          Mark All as Read ({unreadCount})
        </button>
      </div>

      {actionToast && (
        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between">
          <span>{actionToast}</span>
          <button
            onClick={() => navigate("maintenance")}
            className="text-cyan-300 font-semibold hover:underline"
          >
            View in Maintenance Planner →
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-[#070B14] border border-[#1E293B] p-1">
            <button
              onClick={() => setTab("open")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "open" ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Open Alerts ({openCount})
            </button>
            <button
              onClick={() => setTab("resolved")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "resolved"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts, machines, or descriptions..."
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] pl-8 pr-3 py-1.5 text-xs text-slate-200"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as "All" | AlertCategory)}
              className="rounded-lg bg-[#070B14] border border-[#1E293B] px-2.5 py-1.5 text-xs text-slate-200"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                priorityFilter === p
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                  : "bg-[#111C2D] border-[#1E293B] text-slate-400 hover:text-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-10 text-center">
            <Bell className="w-7 h-7 text-slate-500 mx-auto mb-2" />
            <div className="text-sm font-medium text-slate-300">No alerts match your filters</div>
            <p className="text-xs text-slate-500 mt-1">
              Try switching tabs or resetting the category and priority filters.
            </p>
          </div>
        ) : (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-xl bg-[#0D1422] border p-4 transition-colors ${
                !alert.read && !alert.resolved ? "border-cyan-500/35" : "border-[#1E293B]"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        PRIORITY_BADGE[alert.priority]
                      }`}
                    >
                      {alert.priority}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#111C2D] text-slate-300">
                      {alert.category}
                    </span>
                    {!alert.read && !alert.resolved && (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        Unread
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100">{alert.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                  <div className="text-xs text-cyan-300/90 bg-[#111C2D] border border-[#1E293B] rounded-lg px-3 py-2 mt-2">
                    <span className="font-semibold text-slate-200">Recommended Action: </span>
                    {alert.recommendedAction}
                  </div>
                </div>

                <div className="flex flex-wrap lg:flex-col gap-2 shrink-0 lg:min-w-[185px]">
                  {alert.machineId && (
                    <button
                      onClick={() => {
                        setSelectedMachineId(alert.machineId!);
                        navigate("predictive");
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111C2D] border border-[#1E293B] hover:border-cyan-500/40 text-xs text-slate-200"
                    >
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      View Machine ({alert.machineId})
                    </button>
                  )}

                  {!alert.resolved && (
                    <>
                      <button
                        onClick={() => handleQuickTask(alert)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111C2D] border border-[#1E293B] hover:border-amber-500/40 text-xs text-amber-200"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-400" />
                        Create Maintenance Task
                      </button>

                      <button
                        onClick={() =>
                          askCopilot(
                            `Explain root cause and mitigation steps for alert: "${alert.title}" (${alert.message}).`
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-xs text-cyan-200"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        Analyze with AI
                      </button>

                      <div className="flex gap-2">
                        {!alert.read && (
                          <button
                            onClick={() => markAlertRead(alert.id)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#111C2D] border border-[#1E293B] text-[11px] text-slate-300 hover:text-white"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 hover:bg-emerald-500/25"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Resolve
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
