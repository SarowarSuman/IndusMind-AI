import React, { useState } from "react";
import { Building2, Code2, EyeOff, Factory, Lock, Plus, RotateCcw, ShieldCheck, UserCog } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { UserRole } from "../types/industrial";

const ROLES: UserRole[] = [
  "System Admin",
  "Developer",
  "Factory Owner",
  "Plant Manager",
  "Maintenance Engineer",
  "Production Manager",
];

export const Settings: React.FC = () => {
  const {
    facilities,
    activeFacility,
    activeFacilityId,
    switchFacility,
    industries,
    activeIndustry,
    switchIndustry,
    addCustomIndustry,
    userRole,
    setUserRole,
    userName,
    setUserName,
    isSimulating,
    setIsSimulating,
    generateNewScenario,
    resetDemo,
    navigate,
    privacyMasking,
    setPrivacyMasking,
    exportWatermark,
    setExportWatermark,
    securityAuditLog,
    recordSecurityEvent,
  } = useIndustry();

  const [customName, setCustomName] = useState("");
  const [customLoc, setCustomLoc] = useState("Dhaka, Bangladesh");
  const [customUnit, setCustomUnit] = useState("Units");
  const [customTarget, setCustomTarget] = useState(5000);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddIndustry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    addCustomIndustry(
      customName.trim(),
      customLoc.trim() || "Industrial Park",
      customUnit.trim() || "Units",
      Math.max(100, Number(customTarget) || 5000)
    );
    setFeedback(`Created & activated custom industry "${customName.trim()}".`);
    setCustomName("");
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
          Admin Panel · Enterprise & Developer Configuration
        </p>
        <h1 className="text-2xl font-bold text-slate-100">Settings, Admin & Multi-Facility Hub</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage all 5 connected plants, switch between 20+ industry configurations, configure roles, or inspect live developer telemetry schemas.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-200">
          {feedback}
        </div>
      )}

      {/* Multi-Facility Global Overview */}
      <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Global Multi-Facility Comparison (Factories A–E)
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Click any facility card to switch active command context
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {facilities.map((fac) => {
            const isCurrent = fac.id === activeFacilityId;
            const avgHealth = Math.round(
              fac.machines.reduce((s, m) => s + m.prediction.healthScore, 0) /
                Math.max(1, fac.machines.length)
            );
            const openAlerts = fac.alerts.filter((a) => !a.resolved).length;
            const avgEff = Math.round(
              fac.lines.reduce((s, l) => s + l.efficiencyPct, 0) / Math.max(1, fac.lines.length)
            );
            const sector = industries.find((i) => i.id === fac.industryId)?.name ?? fac.industryId;

            return (
              <button
                key={fac.id}
                onClick={() => {
                  switchFacility(fac.id);
                  navigate("dashboard");
                }}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  isCurrent
                    ? "bg-cyan-500/10 border-cyan-500/50"
                    : "bg-[#111C2D] border-[#1E293B] hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">{fac.name}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{fac.location}</div>
                <div className="text-[11px] text-cyan-300/90 mt-1 truncate">{sector}</div>

                <div className="grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t border-[#1E293B] text-center">
                  <div>
                    <div className="text-[10px] text-slate-500">Health</div>
                    <div className="text-xs font-mono font-semibold text-slate-100 tabular-nums">
                      {avgHealth}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Alerts</div>
                    <div
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        openAlerts > 0 ? "text-amber-300" : "text-emerald-300"
                      }`}
                    >
                      {openAlerts}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500">Line Eff.</div>
                    <div className="text-xs font-mono font-semibold text-slate-100 tabular-nums">
                      {avgEff}%
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Industry Preset Switcher + Custom Industry Creator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-[#0D1422] border border-[#1E293B] p-5">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-1">
            <Factory className="w-4 h-4 text-cyan-400" />
            Switch Active Industry Configuration ({industries.length} Presets)
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Applying an industry preset dynamically rebuilds the active plant&apos;s machines, thresholds, suppliers, and materials.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-72 overflow-y-auto pr-1">
            {industries.map((ind) => {
              const active = ind.id === activeIndustry.id;
              return (
                <button
                  key={ind.id}
                  onClick={() => {
                    switchIndustry(ind.id);
                    setFeedback(`Switched active plant to ${ind.name}.`);
                  }}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    active
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-semibold"
                      : "bg-[#111C2D] border-[#1E293B] text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="truncate">{ind.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Target: {ind.dailyTarget.toLocaleString()} {ind.productionUnit}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleAddIndustry}
          className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-5 space-y-3"
        >
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            Create Custom Industry Preset
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Industry Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Leather Tannery & Footwear"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-1.5 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Location</label>
            <input
              type="text"
              value={customLoc}
              onChange={(e) => setCustomLoc(e.target.value)}
              className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-1.5 text-xs text-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Output Unit</label>
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Daily Target</label>
              <input
                type="number"
                value={customTarget}
                onChange={(e) => setCustomTarget(Number(e.target.value))}
                className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-1.5 text-xs font-mono text-slate-200"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 transition-colors"
          >
            Create & Activate Industry
          </button>
        </form>
      </div>

      {/* Role & Telemetry Stream Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-cyan-400" />
            Operator Profile & Role Access
          </h2>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Operator Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-3 py-2 text-xs text-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Active Role Perspective</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRole(r)}
                  className={`px-3 py-2 rounded-lg border text-xs text-left transition-colors ${
                    userRole === r
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200 font-semibold"
                      : "bg-[#111C2D] border-[#1E293B] text-slate-300 hover:border-slate-600"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-5 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Telemetry Stream & Workspace Controls
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Toggle real-time sensor streaming across all assets, trigger anomaly stress-tests, or restore workspace baselines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                isSimulating
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-[#111C2D] border-[#1E293B] text-slate-200"
              }`}
            >
              {isSimulating ? "Live Sensor Stream: Active" : "Live Sensor Stream: Paused"}
            </button>

            <button
              onClick={() => {
                generateNewScenario();
                setFeedback("Triggered an anomaly stress-test on the active facility.");
              }}
              className="px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
            >
              Test Anomaly Scenario
            </button>

            <button
              onClick={() => {
                resetDemo();
                setFeedback("All 5 facilities and telemetry baselines restored.");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-medium text-rose-200 hover:bg-rose-500/25"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Workspace State
            </button>
          </div>
        </div>
      </div>

      {/* Data Privacy, Anti-Sabotage & Cyber Protection */}
      <div className="rounded-xl bg-[#0D1422] border border-emerald-500/30 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Industrial Data Privacy, Anti-Sabotage &amp; Cyber Protection
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Protects factory trade secrets from competitors and physically isolates machinery from remote cyber sabotage.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            ZERO-TRUST SHIELD ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-lg bg-[#111C2D] border border-[#1E293B] space-y-1">
            <div className="font-semibold text-slate-100">1. One-Way Read-Only PLC Diode</div>
            <p className="text-slate-400 leading-relaxed">
              Edge gateways only stream sensor telemetry outbound over TLS 1.3. Remote PLC/SCADA write-back is blocked so hackers cannot alter RPM, pressure, or stop machines.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#111C2D] border border-[#1E293B] space-y-1">
            <div className="font-semibold text-slate-100">2. AES-256 Tenant Isolation</div>
            <p className="text-slate-400 leading-relaxed">
              Every factory&apos;s production count, supplier list, and asset health are encrypted at rest and strictly siloed—no rival plant or external entity can view your data.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#111C2D] border border-[#1E293B] space-y-1">
            <div className="font-semibold text-slate-100">3. Strict RBAC &amp; Tamper Audit</div>
            <p className="text-slate-400 leading-relaxed">
              Role-scoped permissions restrict sensitive exports to Factory Owners &amp; Admins, with every access logged in an immutable audit trail.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const next = !privacyMasking;
              setPrivacyMasking(next);
              recordSecurityEvent(
                `${next ? "Enabled" : "Disabled"} confidential facility & supplier masking`,
                "Privacy Guard"
              );
              setFeedback(`Privacy masking ${next ? "enabled" : "disabled"}.`);
            }}
            className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-colors ${
              privacyMasking
                ? "bg-emerald-500/12 border-emerald-500/40"
                : "bg-[#111C2D] border-[#1E293B] hover:border-slate-600"
            }`}
          >
            <div className="space-y-0.5 pr-3">
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-cyan-400" />
                Mask Plant Identity on Shared Screens &amp; Exports
              </div>
              <div className="text-[11px] text-slate-400">
                Hides factory identity in exported reports to prevent competitor leaks.
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 ${
                privacyMasking ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {privacyMasking ? "ON" : "OFF"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !exportWatermark;
              setExportWatermark(next);
              recordSecurityEvent(
                `${next ? "Enabled" : "Disabled"} confidential export watermarking`,
                "Leak Prevention"
              );
              setFeedback(`Confidential export watermark ${next ? "enabled" : "disabled"}.`);
            }}
            className={`flex items-center justify-between p-3.5 rounded-lg border text-left transition-colors ${
              exportWatermark
                ? "bg-emerald-500/12 border-emerald-500/40"
                : "bg-[#111C2D] border-[#1E293B] hover:border-slate-600"
            }`}
          >
            <div className="space-y-0.5 pr-3">
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Confidential Report Watermarking
              </div>
              <div className="text-[11px] text-slate-400">
                Tags CSV &amp; printed reports with authorized operator name, role &amp; timestamp.
              </div>
            </div>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 ${
                exportWatermark ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"
              }`}
            >
              {exportWatermark ? "ON" : "OFF"}
            </span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-200">
            Security &amp; Access Audit Trail
          </div>
          <div className="rounded-lg bg-[#070B14] border border-[#1E293B] divide-y divide-[#1E293B] max-h-44 overflow-y-auto">
            {securityAuditLog.slice(0, 8).map((ev) => (
              <div
                key={ev.id}
                className="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[11px]"
              >
                <div className="text-slate-300">
                  <span className="font-mono text-cyan-300">{ev.actor}</span> — {ev.action}
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-slate-500">
                  <span className="text-emerald-400">{ev.protection}</span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Admin & Developer Diagnostics Console */}
      {(userRole === "System Admin" || userRole === "Developer") && (
        <div className="rounded-xl bg-[#0D1422] border border-cyan-500/30 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              {userRole} Console — Live API & Telemetry Inspection
            </h2>
            <span className="text-[11px] font-mono text-slate-400">
              Active Plant ID: {activeFacility.id} · Sector: {activeIndustry.id}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#070B14] border border-[#1E293B]">
              <div className="text-slate-400">Weather Endpoint</div>
              <div className="text-emerald-300 mt-1">GET /api/weather (Open-Meteo)</div>
            </div>
            <div className="p-3 rounded-lg bg-[#070B14] border border-[#1E293B]">
              <div className="text-slate-400">Copilot Endpoint</div>
              <div className="text-cyan-300 mt-1">POST /api/copilot/analyze</div>
            </div>
            <div className="p-3 rounded-lg bg-[#070B14] border border-[#1E293B]">
              <div className="text-slate-400">Monitored Nodes ({activeFacility.machines.length})</div>
              <div className="text-slate-200 mt-1">
                {activeFacility.machines.map((m) => m.id).join(" · ")}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
