import React, { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Box,
  CalendarClock,
  CloudRain,
  Cpu,
  Factory,
  Home,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Shuffle,
  Sparkles,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { useIndustry } from "../../context/IndustryContext";
import { PageRoute, UserRole } from "../../types/industrial";
import { GuidedDemoBar } from "../shared/GuidedDemoBar";
import { CopilotPanel } from "../copilot/CopilotPanel";
import { IndusMindLogo } from "../shared/IndusMindLogo";

const SIDEBAR_ITEMS: Array<{
  route: PageRoute;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { route: "dashboard", label: "Overview", icon: LayoutDashboard },
  { route: "digital-twin", label: "Digital Twin", icon: Box },
  { route: "machines", label: "Machines", icon: Cpu },
  { route: "predictive", label: "Predictive Maintenance", icon: Activity },
  { route: "production", label: "Production", icon: Factory },
  { route: "supply-chain", label: "Supply Chain", icon: Truck },
  { route: "weather", label: "Weather Intelligence", icon: CloudRain },
  { route: "copilot", label: "AI Copilot", icon: Bot },
  { route: "maintenance", label: "Maintenance Planner", icon: Wrench },
  { route: "analytics", label: "Analytics", icon: BarChart3 },
  { route: "alerts", label: "Alerts", icon: Bell },
  { route: "settings", label: "Settings", icon: Settings },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    route,
    navigate,
    facilities,
    activeFacilityId,
    activeFacility,
    activeIndustry,
    switchFacility,
    industries,
    switchIndustry,
    userRole,
    setUserRole,
    userName,
    isSimulating,
    setIsSimulating,
    resetDemo,
    generateNewScenario,
    copilotOpen,
    setCopilotOpen,
    guidedStep,
    startGuidedDemo,
  } = useIndustry();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [clockText, setClockText] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const t = window.setInterval(() => {
      setClockText(new Date().toLocaleTimeString());
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const unreadAlerts = activeFacility.alerts.filter((a) => !a.read && !a.resolved);
  const openAlerts = activeFacility.alerts.filter((a) => !a.resolved);

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-slate-800/80 bg-[#0D1422] transition-all duration-200 shrink-0 ${
          collapsed ? "w-[72px]" : "w-[252px]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
          {!collapsed && (
            <button
              onClick={() => navigate("home")}
              className="hover:opacity-90 transition-opacity shrink-0"
            >
              <IndusMindLogo size="sm" />
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = route === item.route;
            const alertCount = item.route === "alerts" ? openAlerts.length : 0;
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                title={collapsed ? item.label : undefined}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#00E5FF]/12 text-[#00E5FF] border border-[#00E5FF]/30"
                    : "text-slate-300 hover:bg-[#111C2D] hover:text-white border border-transparent"
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!collapsed && alertCount > 0 && (
                  <span className="font-mono text-xs font-semibold text-[#EF4444] tabular-nums">
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-3 space-y-2">
          {!collapsed && (
            <button
              onClick={() => {
                if (guidedStep === null) startGuidedDemo();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-3 py-2 text-xs font-semibold text-[#00E5FF] hover:bg-[#00E5FF]/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {guidedStep === null ? "Platform Walkthrough" : `Walkthrough ${guidedStep}/10`}
            </button>
          )}
          <button
            onClick={() => navigate("home")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-white"
          >
            <Home className="h-3.5 w-3.5" />
            {!collapsed && <span>Back to Website</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative z-10 flex w-72 flex-col bg-[#0D1422] border-r border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
              <IndusMindLogo size="sm" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-slate-800 p-1.5 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = route === item.route;
                return (
                  <button
                    key={item.route}
                    onClick={() => {
                      navigate(item.route);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      active
                        ? "bg-[#00E5FF]/12 text-[#00E5FF] border border-[#00E5FF]/30"
                        : "text-slate-300 hover:bg-[#111C2D]"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-800 p-3 space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Active Operator Role
                </label>
                <select
                  aria-label="Mobile Select Operator Role"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-2 text-xs text-slate-200 focus:border-[#00E5FF] focus:outline-none"
                >
                  <option value="System Admin">System Admin (Admin Panel)</option>
                  <option value="Developer">Developer</option>
                  <option value="Factory Owner">Factory Owner</option>
                  <option value="Plant Manager">Plant Manager</option>
                  <option value="Maintenance Engineer">Maintenance Engineer</option>
                  <option value="Production Manager">Production Manager</option>
                </select>
              </div>
              <button
                onClick={() => {
                  startGuidedDemo();
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-lg bg-[#00E5FF] px-3 py-2.5 text-xs font-semibold text-[#070B14]"
              >
                Platform Walkthrough
              </button>
              <button
                onClick={() => {
                  navigate("home");
                  setMobileMenuOpen(false);
                }}
                className="w-full rounded-lg border border-slate-700 px-3 py-2.5 text-xs text-slate-300"
              >
                Back to Website
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Command Header */}
        <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#0D1422]/95 px-3.5 py-2.5 sm:px-6 sm:py-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
            {/* Left: Mobile toggle + Active Factory & Industry selectors */}
            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open workspace navigation"
                className="lg:hidden rounded-lg border border-slate-800 p-2 text-slate-300 shrink-0"
              >
                <Menu className="h-4 w-4" />
              </button>

              <select
                aria-label="Select Factory Facility"
                value={activeFacilityId}
                onChange={(e) => switchFacility(e.target.value)}
                className="min-w-[130px] flex-1 sm:flex-initial sm:max-w-[230px] rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:border-[#00E5FF] focus:outline-none truncate"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select Industry Preset"
                value={activeIndustry.id}
                onChange={(e) => switchIndustry(e.target.value)}
                className="min-w-[130px] flex-1 sm:flex-initial sm:max-w-[200px] rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs font-medium text-[#00E5FF] focus:border-[#00E5FF] focus:outline-none truncate"
              >
                {industries.map((ind) => (
                  <option key={ind.id} value={ind.id}>
                    {ind.name}
                  </option>
                ))}
              </select>

              <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 pl-2">
                <span className="font-mono text-[#22C55E]">LIVE PLANT TELEMETRY</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-slate-500" />
                  {clockText}
                </span>
              </div>
            </div>

            {/* Right: Telemetry Stream + Notifications + Role */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setIsSimulating(!isSimulating)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isSimulating
                    ? "bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40"
                    : "bg-[#111C2D] text-slate-200 border border-slate-700 hover:border-[#00E5FF]/50"
                }`}
              >
                {isSimulating ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isSimulating ? "Pause Live Stream" : "Start Live Stream"}
              </button>

              <button
                onClick={generateNewScenario}
                title="Test Anomaly Scenario"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 whitespace-nowrap shrink-0"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Test Anomaly</span>
              </button>

              <button
                onClick={resetDemo}
                title="Reset Workspace"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Reset State</span>
              </button>

              {/* Notification Popover */}
              <div className="relative">
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  aria-label="Open notifications"
                  className="relative rounded-lg border border-slate-700 bg-[#111C2D] p-2 text-slate-300 hover:text-white"
                >
                  <Bell className="h-4 w-4" />
                  {unreadAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white tabular-nums">
                      {unreadAlerts.length}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-[#0D1422] p-3 shadow-2xl z-50">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <span className="text-xs font-semibold text-slate-100">
                        Active Alerts ({openAlerts.length})
                      </span>
                      <button
                        onClick={() => {
                          setNotifOpen(false);
                          navigate("alerts");
                        }}
                        className="text-xs text-[#00E5FF] hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {openAlerts.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3 text-center">No active alerts.</p>
                      ) : (
                        openAlerts.slice(0, 4).map((a) => (
                          <button
                            key={a.id}
                            onClick={() => {
                              setNotifOpen(false);
                              navigate("alerts");
                            }}
                            className="w-full text-left rounded-lg border border-slate-800 bg-[#111C2D] p-2.5 hover:border-slate-600"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span
                                className={
                                  a.priority === "Critical" ? "text-[#EF4444] font-semibold" : "text-[#F59E0B] font-semibold"
                                }
                              >
                                {a.priority}
                              </span>
                              <span className="text-slate-500">{a.category}</span>
                            </div>
                            <p className="text-xs font-medium text-slate-100 mt-1 truncate">{a.title}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Role Selector */}
              <select
                aria-label="Select Operator Role"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                title={userName}
                className="hidden sm:block rounded-lg border border-slate-700 bg-[#111C2D] px-2.5 py-1.5 text-xs text-slate-200 focus:border-[#00E5FF] focus:outline-none"
              >
                <option value="System Admin">System Admin (Admin Panel)</option>
                <option value="Developer">Developer</option>
                <option value="Factory Owner">Factory Owner</option>
                <option value="Plant Manager">Plant Manager</option>
                <option value="Maintenance Engineer">Maintenance Engineer</option>
                <option value="Production Manager">Production Manager</option>
              </select>
            </div>
          </div>
        </header>

        {/* Interactive Walkthrough Bar */}
        <GuidedDemoBar />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>

      {/* Floating Sphere Copilot Button & Slide-Over Drawer */}
      {route !== "copilot" && (
        <>
          <button
            onClick={() => setCopilotOpen(true)}
            aria-label="Open Sphere Copilot"
            className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-xl border border-[#00E5FF]/50 bg-[#0D1422] px-4 py-3 text-xs font-semibold text-[#00E5FF] shadow-2xl hover:bg-[#111C2D] transition-colors"
          >
            <Bot className="h-4 w-4" />
            <span>Sphere Copilot</span>
          </button>

          {copilotOpen && (
            <div className="fixed inset-0 z-50 flex justify-end">
              <div className="fixed inset-0 bg-black/60" onClick={() => setCopilotOpen(false)} />
              <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#070B14] border-l border-slate-800 p-4">
                <div className="flex items-center justify-between pb-3">
                  <span className="font-display text-sm font-semibold text-slate-100">
                    Sphere Copilot Assistant
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCopilotOpen(false);
                        navigate("copilot");
                      }}
                      className="text-xs text-[#00E5FF] hover:underline"
                    >
                      Full Workspace
                    </button>
                    <button
                      onClick={() => setCopilotOpen(false)}
                      aria-label="Close Copilot Drawer"
                      className="rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <CopilotPanel compact />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
