import React, { useMemo, useState } from "react";
import { Download, FileText, Printer, X } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIndustry } from "../context/IndustryContext";

type ReportType =
  | "Daily Operational Report"
  | "Weekly Maintenance Report"
  | "Monthly Factory Performance Report"
  | "Machine Health Report"
  | "Supply Chain Risk Report";

const REPORT_TYPES: ReportType[] = [
  "Daily Operational Report",
  "Weekly Maintenance Report",
  "Monthly Factory Performance Report",
  "Machine Health Report",
  "Supply Chain Risk Report",
];

const RISK_COLORS: Record<string, string> = {
  "Low Risk": "#10B981",
  "Moderate Risk": "#F59E0B",
  "High Risk": "#F97316",
  "Critical Risk": "#F43F5E",
};

export const Analytics: React.FC = () => {
  const {
    activeFacility,
    activeIndustry,
    weather,
    privacyMasking,
    exportWatermark,
    userName,
    userRole,
    recordSecurityEvent,
  } = useIndustry();
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [previewReport, setPreviewReport] = useState<ReportType | null>(null);

  const avgHealth = useMemo(() => {
    const sum = activeFacility.machines.reduce((acc, m) => acc + m.prediction.healthScore, 0);
    return Math.round(sum / Math.max(1, activeFacility.machines.length));
  }, [activeFacility.machines]);

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      "Low Risk": 0,
      "Moderate Risk": 0,
      "High Risk": 0,
      "Critical Risk": 0,
    };
    activeFacility.machines.forEach((m) => {
      counts[m.prediction.riskLevel] = (counts[m.prediction.riskLevel] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeFacility.machines]);

  const lineEfficiencyData = useMemo(
    () =>
      activeFacility.lines.map((l) => ({
        name: l.name,
        target: l.targetUnits,
        actual: l.actualUnits,
        efficiency: l.efficiencyPct,
      })),
    [activeFacility.lines]
  );

  const downtimeTrend = useMemo(() => {
    const points = dateRange === "7d" ? 7 : dateRange === "30d" ? 12 : 16;
    const baseDowntime = Math.max(1.5, activeFacility.downtimeHoursMonth / 10);
    const scaleFactor = avgHealth < 70 ? 1.35 : 0.9;
    return Array.from({ length: points }, (_, idx) => {
      const label = dateRange === "7d" ? `Day ${idx + 1}` : `Period ${idx + 1}`;
      const reactive = Number(
        (baseDowntime * scaleFactor * (0.8 + ((idx * 3) % 5) * 0.12)).toFixed(1)
      );
      const prevented = Number((reactive * 0.58 + 1.2).toFixed(1));
      return { label, downtimeHrs: reactive, avoidedHrs: prevented };
    });
  }, [dateRange, activeFacility.downtimeHoursMonth, avgHealth]);

  const inventoryRunwayData = useMemo(
    () =>
      activeFacility.materials.map((m) => ({
        name: m.name.slice(0, 18),
        daysRemaining: Number((m.currentInventory / Math.max(1, m.dailyConsumption)).toFixed(1)),
      })),
    [activeFacility.materials]
  );

  const buildReportRows = (type: ReportType): string[][] => {
    const disclaimer = [
      ["IndusMindAI Report", type],
      ["Facility", privacyMasking ? "[MASKED FACILITY ID]" : `${activeFacility.name} (${activeFacility.location})`],
      ["Industry Preset", activeIndustry.name],
      ["Window", dateRange],
      ["Generated At", new Date().toISOString()],
      ...(exportWatermark
        ? [["Confidential Watermark", `Authorized for ${userName} (${userRole}) · Do Not Distribute`]]
        : []),
      [
        "Notice",
        "IndusMindAI Operational Telemetry & Risk Intelligence Report.",
      ],
      [],
    ];

    if (type === "Machine Health Report") {
      return [
        ...disclaimer,
        ["Machine ID", "Machine Name", "Status", "Health Score", "Risk Score", "Risk Level", "Temp (C)", "Vibration (mm/s)", "Recommended Action"],
        ...activeFacility.machines.map((m) => [
          m.id,
          m.name,
          m.status,
          String(m.prediction.healthScore),
          String(m.prediction.riskScore),
          m.prediction.riskLevel,
          String(m.temperature),
          String(m.vibration),
          m.prediction.recommendedAction,
        ]),
      ];
    }

    if (type === "Weekly Maintenance Report") {
      return [
        ...disclaimer,
        ["Task ID", "Machine", "Title", "Priority", "Status", "Technician", "Due Date", "Est. Hours"],
        ...activeFacility.maintenanceTasks.map((t) => [
          t.id,
          t.machineName,
          t.title,
          t.priority,
          t.status,
          t.assignedTechnician,
          t.dueDate,
          String(t.estimatedDurationHrs),
        ]),
      ];
    }

    if (type === "Supply Chain Risk Report") {
      return [
        ...disclaimer,
        ["Type", "Name", "Material / Unit", "Status / Runway", "Lead Time / Stock", "Risk Note"],
        ...activeFacility.suppliers.map((s) => [
          "Supplier",
          privacyMasking ? `[MASKED VENDOR ${s.id}]` : s.name,
          s.material,
          s.shipmentStatus,
          `${s.leadTimeDays}d (+${s.delayHistoryDays}d delay)`,
          `Reliability ${s.reliabilityScore}% (${s.dependencyLevel})`,
        ]),
        ...activeFacility.materials.map((m) => [
          "Inventory",
          m.name,
          m.unit,
          `${(m.currentInventory / Math.max(1, m.dailyConsumption)).toFixed(1)} days`,
          `${m.currentInventory} / Min ${m.minStockLevel}`,
          `Incoming ${m.incomingStock} in ${m.incomingEtaDays}d`,
        ]),
      ];
    }

    if (type === "Monthly Factory Performance Report") {
      return [
        ...disclaimer,
        ["Line ID", "Line Name", "Status", "Target Units", "Actual Units", "Efficiency %"],
        ...activeFacility.lines.map((l) => [
          l.id,
          l.name,
          l.status,
          String(l.targetUnits),
          String(l.actualUnits),
          String(l.efficiencyPct),
        ]),
        [],
        ["Facility KPI", "Value"],
        ["Average Machine Health", `${avgHealth}/100`],
        ["Monthly Downtime", `${activeFacility.downtimeHoursMonth} hrs`],
        ["Monthly Maint. Cost (BDT)", `৳${activeFacility.maintenanceCostBdtMonth.toLocaleString("en-IN")}`],
      ];
    }

    // Daily Operational Report
    return [
      ...disclaimer,
      ["Metric", "Value"],
      ["Average Asset Health", `${avgHealth}/100`],
      ["Open Alerts", String(activeFacility.alerts.filter((a) => !a.resolved).length)],
      ["Active Work Orders", String(activeFacility.maintenanceTasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length)],
      ["Weather Hazard Mode", `${weather.simulatedHazard} (${weather.liveData?.location ?? "Gazipur"})`],
      [],
      ["Open Alerts Summary", "Priority", "Category", "Recommended Action"],
      ...activeFacility.alerts
        .filter((a) => !a.resolved)
        .map((a) => [a.title, a.priority, a.category, a.recommendedAction]),
    ];
  };

  const downloadCsv = (type: ReportType) => {
    const rows = buildReportRows(type);
    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeFacility.id}-${type.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    recordSecurityEvent(`Exported ${type} (${privacyMasking ? "masked" : "standard"})`, "Export Watermarked");
  };

  const previewRows = previewReport ? buildReportRows(previewReport) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Executive Insights & Reporting
          </p>
          <h1 className="text-2xl font-bold text-slate-100">Analytics & Reports</h1>
          <p className="text-sm text-slate-400 mt-1">
            Live plant metrics computed from {privacyMasking ? "[MASKED FACILITY]" : activeFacility.name} state with watermarked CSV &amp; printable report exports.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-[#0D1422] border border-[#1E293B] p-1">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                dateRange === r
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Machine Risk Distribution
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Current asset fleet split across predictive risk bands
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {riskDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[entry.name] || "#00E5FF"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1422",
                    borderColor: "#1E293B",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs mt-1">
            {riskDistribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: RISK_COLORS[d.name] }}
                />
                <span>{d.name}:</span>
                <span className="font-mono font-semibold tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Production Line Target vs Actual ({activeIndustry.productionUnit})
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Output coupled dynamically with machine status & supply disruptions
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lineEfficiencyData}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1422",
                    borderColor: "#1E293B",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="target" name="Target" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#00E5FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Downtime vs Avoided Hours ({dateRange.toUpperCase()})
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Comparison of unplanned downtime vs early-warning intervention savings
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={downtimeTrend}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1422",
                    borderColor: "#1E293B",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avoidedHrs"
                  name="Hours Avoided"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="downtimeHrs"
                  name="Downtime Hrs"
                  stroke="#F43F5E"
                  fill="#F43F5E"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Raw Material Inventory Runway (Days)
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Days of buffer remaining at current daily consumption rate
          </p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryRunwayData} layout="vertical">
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11} width={115} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1422",
                    borderColor: "#1E293B",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="daysRemaining" name="Days Runway" fill="#38BDF8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Report Generator Cards */}
      <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Exportable Operational Reports
            </h2>
            <p className="text-xs text-slate-400">
              All exports reflect current live plant telemetry, risk scores, and supply chain status.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORT_TYPES.map((rep) => (
            <div
              key={rep}
              className="p-4 rounded-xl bg-[#111C2D] border border-[#1E293B] flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-slate-100">{rep}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Covers {activeFacility.name} ({dateRange.toUpperCase()} snapshot).
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCsv(rep)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1422] border border-[#1E293B] hover:border-cyan-500/40 text-xs text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  CSV
                </button>
                <button
                  onClick={() => setPreviewReport(rep)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-xs text-cyan-200 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable Report Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4 print:static print:bg-white print:p-0">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-[#0D1422] border border-[#1E293B] p-6 text-slate-100 print:max-h-none print:border-0 print:bg-white print:text-slate-900">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-4 print:hidden">
              <div>
                <div className="text-xs font-mono text-cyan-400">Printable Report Preview</div>
                <div className="text-lg font-bold">{previewReport}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="p-1.5 rounded-lg bg-[#111C2D] border border-[#1E293B] text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                <strong>INDUSMINDAI OPERATIONAL REPORT:</strong> Snapshot of live plant
                health, maintenance schedule, and supply corridor status for {activeFacility.name}.
              </div>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#1E293B] print:border-slate-300">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-1.5 pr-3 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
