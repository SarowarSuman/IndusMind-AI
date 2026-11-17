import React from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Bot,
  CalendarPlus,
  Clock,
  Cpu,
  Eye,
  Factory,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIndustry } from "../context/IndustryContext";
import { generateRecommendations } from "../services/recommendationEngine";

export const Dashboard: React.FC = () => {
  const {
    activeFacility,
    activeIndustry,
    weather,
    navigate,
    setSelectedMachineId,
    askCopilot,
    createMaintenanceTask,
  } = useIndustry();

  const machines = activeFacility.machines;
  const totalMachines = machines.length;
  const operationalCount = machines.filter((m) => m.status === "Operational").length;
  const atRiskCount = machines.filter((m) => m.prediction.riskLevel !== "Low Risk").length;
  const openAlerts = activeFacility.alerts.filter((a) => !a.resolved);
  const criticalAlerts = openAlerts.filter((a) => a.priority === "Critical");

  const avgHealth = Math.round(
    machines.reduce((s, m) => s + m.prediction.healthScore, 0) / Math.max(1, totalMachines)
  );
  const avgEfficiency = Math.round(
    activeFacility.lines.reduce((s, l) => s + l.efficiencyPct, 0) /
      Math.max(1, activeFacility.lines.length)
  );
  const estDowntimeHrs = Number(
    (
      activeFacility.downtimeHoursMonth +
      machines.filter((m) => m.status === "Critical").length * 4.5 +
      machines.filter((m) => m.status === "Warning").length * 1.5
    ).toFixed(1)
  );
  const openTasks = activeFacility.maintenanceTasks.filter(
    (t) => t.status !== "Cancelled" && t.status !== "Completed"
  ).length;
  const maintCostBdt = activeFacility.maintenanceCostBdtMonth + openTasks * 3500;

  const healthChartData = machines.map((m) => ({
    id: m.id,
    health: m.prediction.healthScore,
    risk: m.prediction.riskScore,
  }));

  const riskBuckets = [
    { name: "Low", value: machines.filter((m) => m.prediction.riskLevel === "Low Risk").length, color: "#22C55E" },
    { name: "Moderate", value: machines.filter((m) => m.prediction.riskLevel === "Moderate Risk").length, color: "#3B82F6" },
    { name: "High", value: machines.filter((m) => m.prediction.riskLevel === "High Risk").length, color: "#F59E0B" },
    { name: "Critical", value: machines.filter((m) => m.prediction.riskLevel === "Critical Risk").length, color: "#EF4444" },
  ].filter((b) => b.value > 0);

  const downtimeTrendData = Array.from({ length: 6 }, (_, i) => {
    const base = Math.max(2, estDowntimeHrs - (5 - i) * 1.1);
    return {
      week: `W${i + 1}`,
      unplannedHrs: Number((base * (i === 5 ? 1 : 0.85 + (i % 2) * 0.15)).toFixed(1)),
      efficiency: Math.min(98, Math.max(55, avgEfficiency + (5 - i) * 1.4 - (i === 5 ? 2 : 0))),
    };
  });

  const recommendations = generateRecommendations(activeFacility, weather);

  const kpis = [
    { label: "Total Machines", value: String(totalMachines), sub: activeIndustry.name, icon: Cpu, tone: "text-slate-100" },
    { label: "Operational Machines", value: String(operationalCount), sub: `${Math.round((operationalCount / Math.max(1, totalMachines)) * 100)}% nominal`, icon: Activity, tone: "text-[#22C55E]" },
    { label: "Machines at Risk", value: String(atRiskCount), sub: "Moderate to Critical", icon: AlertTriangle, tone: atRiskCount > 0 ? "text-[#F59E0B]" : "text-[#22C55E]" },
    { label: "Critical Alerts", value: String(criticalAlerts.length), sub: `${openAlerts.length} total open`, icon: AlertTriangle, tone: criticalAlerts.length > 0 ? "text-[#EF4444]" : "text-slate-100" },
    { label: "Overall Machine Health", value: `${avgHealth}%`, sub: "Weighted asset index", icon: TrendingUp, tone: avgHealth >= 80 ? "text-[#22C55E]" : avgHealth >= 60 ? "text-[#F59E0B]" : "text-[#EF4444]" },
    { label: "Production Efficiency", value: `${avgEfficiency}%`, sub: `${activeFacility.lines.length} active lines`, icon: Factory, tone: "text-[#00E5FF]" },
    { label: "Estimated Downtime", value: `${estDowntimeHrs} hrs`, sub: "Monthly projection", icon: Clock, tone: "text-slate-100" },
    { label: "Maintenance Cost Est.", value: `৳${maintCostBdt.toLocaleString("en-IN")}`, sub: "Monthly budget (BDT)", icon: Banknote, tone: "text-slate-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-50">
            Industrial Command Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeFacility.name} · {activeFacility.location} · Live Operational Telemetry
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("digital-twin")}
            className="rounded-lg border border-slate-700 bg-[#111C2D] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#00E5FF]"
          >
            Open 3D Digital Twin
          </button>
          <button
            onClick={() => navigate("predictive")}
            className="rounded-lg bg-[#00E5FF] px-3.5 py-2 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
          >
            Inspect Predictive Health
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="rounded-xl border border-slate-800 bg-[#111C2D] p-4 space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate">{k.label}</span>
                <Icon className="h-4 w-4 text-slate-500 shrink-0" />
              </div>
              <div className={`font-display text-2xl font-bold font-mono tabular-nums ${k.tone}`}>
                {k.value}
              </div>
              <div className="text-[11px] text-slate-400 truncate">{k.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Zero-Trust Industrial Data & Cyber Protection Bar */}
      <div className="rounded-xl border border-emerald-500/25 bg-[#0D1422] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex items-start sm:items-center gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong className="text-emerald-300">Plant Cyber Shield Active:</strong>{" "}
            One-Way Read-Only PLC Diode (zero remote machine control) · AES-256 &amp; TLS 1.3 Encrypted · Tenant-Isolated Facility Silo
          </span>
        </div>
        <button
          onClick={() => navigate("settings")}
          className="text-xs font-semibold text-[#00E5FF] hover:underline whitespace-nowrap self-start md:self-auto"
        >
          Privacy &amp; Security Controls &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Asset Health & Risk Distribution
            </h2>
            <span className="text-[11px] text-slate-400">Live plant fleet</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={healthChartData}>
                <XAxis dataKey="id" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1422", borderColor: "#334155", fontSize: "12px" }}
                />
                <Bar dataKey="health" name="Health Score (%)" radius={[4, 4, 0, 0]}>
                  {healthChartData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={
                        entry.health < 50 ? "#EF4444" : entry.health < 75 ? "#F59E0B" : "#22C55E"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Production Efficiency vs. Downtime
          </h2>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={downtimeTrendData}>
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1422", borderColor: "#334155", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="efficiency"
                  name="Efficiency (%)"
                  stroke="#00E5FF"
                  fill="#00E5FF"
                  fillOpacity={0.14}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="unplannedHrs"
                  name="Downtime (hrs)"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
          <h2 className="font-display text-sm font-semibold text-slate-100">Fleet Risk Split</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskBuckets}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={42}
                  outerRadius={66}
                  paddingAngle={3}
                >
                  {riskBuckets.map((b) => (
                    <Cell key={b.name} fill={b.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1422", borderColor: "#334155", fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {riskBuckets.map((b) => (
              <div key={b.name} className="flex items-center justify-between px-1 font-mono tabular-nums">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
                  {b.name}
                </span>
                <span className="text-slate-100 font-semibold">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Active Risk Alerts ({openAlerts.length})
            </h2>
            <button
              onClick={() => navigate("alerts")}
              className="text-xs font-semibold text-[#00E5FF] hover:underline"
            >
              Manage All Alerts
            </button>
          </div>

          {openAlerts.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-[#0D1422] p-6 text-center text-xs text-slate-400">
              All alerts resolved. Machines are currently operating within configured thresholds.
            </div>
          ) : (
            <div className="space-y-3">
              {openAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-slate-800 bg-[#0D1422] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        alert.priority === "Critical"
                          ? "text-[#EF4444]"
                          : alert.priority === "High"
                          ? "text-[#F59E0B]"
                          : "text-[#3B82F6]"
                      }`}
                    >
                      {alert.priority} · {alert.category}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-100">{alert.title}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{alert.message}</p>
                  <p className="text-xs text-slate-300">
                    <span className="text-[#00E5FF] font-medium">Recommended: </span>
                    {alert.recommendedAction}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {alert.machineId && (
                      <button
                        onClick={() => {
                          setSelectedMachineId(alert.machineId!);
                          navigate("predictive");
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-[#00E5FF]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Machine
                      </button>
                    )}
                    <button
                      onClick={() =>
                        askCopilot(
                          alert.machineId
                            ? `Analyze ${alert.machineId} alert: ${alert.title}`
                            : `Analyze operational alert: ${alert.title}`
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs font-medium text-[#00E5FF] hover:border-[#00E5FF]"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Analyze with AI
                    </button>
                    {alert.machineId && (
                      <button
                        onClick={() => {
                          createMaintenanceTask({
                            machineId: alert.machineId!,
                            machineName:
                              machines.find((m) => m.id === alert.machineId)?.name ||
                              alert.machineId!,
                            title: alert.recommendedAction.slice(0, 64),
                            priority: alert.priority,
                            assignedTechnician: "Eng. Tanvir Ahmed",
                            dueDate: new Date().toISOString().slice(0, 10),
                            estimatedDurationHrs: 2.5,
                            notes: `Created from alert: ${alert.title}`,
                            createdFromAlertId: alert.id,
                          });
                          navigate("maintenance");
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-[#00E5FF] px-2.5 py-1.5 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF]"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Schedule Maintenance
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-slate-100">
              Smart Operational Insights & Recommendations
            </h2>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-lg border border-slate-800 bg-[#0D1422] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-100">{rec.issue}</span>
                    <span
                      className={`font-mono shrink-0 ml-2 ${
                        rec.riskLevel === "Critical"
                          ? "text-[#EF4444]"
                          : rec.riskLevel === "High"
                          ? "text-[#F59E0B]"
                          : "text-[#22C55E]"
                      }`}
                    >
                      {rec.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{rec.whyItMatters}</p>
                  <p className="text-xs text-slate-200">
                    <span className="text-[#00E5FF]">Action: </span>
                    {rec.recommendedAction}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-5 space-y-3">
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Recent Activity Timeline
            </h2>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {activeFacility.activityLog.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 border-b border-slate-800/70 pb-2 text-xs last:border-0"
                >
                  <span className="text-slate-300">{act.description}</span>
                  <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
