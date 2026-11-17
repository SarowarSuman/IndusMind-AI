import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { INDUSTRY_PRESETS } from "../data/industries";
import { buildFactoryFromIndustry, createInitialMultiFacilities } from "../data/demoFactories";
import { evaluateMachinePrediction } from "../services/predictionEngine";
import {
  FactoryEnvironment,
  IndustrialAlert,
  IndustryPreset,
  MachineAsset,
  MachineVisualKind,
  MaintenanceStatus,
  MaintenanceTask,
  PageRoute,
  SupplyChainDisruption,
  UserRole,
  WeatherScenarioState,
} from "../types/industrial";

interface GuidedStepDef {
  step: number;
  title: string;
  description: string;
  targetRoute: PageRoute;
}

export const GUIDED_DEMO_STEPS: GuidedStepDef[] = [
  {
    step: 1,
    title: "Baseline Healthy Export Facility",
    description: "All assets at Apex Apparel (Gazipur) start in nominal condition preparing for a 10,000-unit order.",
    targetRoute: "dashboard",
  },
  {
    step: 2,
    title: "Event 1: Motor-03 Abnormal Vibration",
    description: "Main Conveyor Motor-03 vibration climbs +42% above baseline due to early bearing wear.",
    targetRoute: "predictive",
  },
  {
    step: 3,
    title: "Event 2: Rising Thermal Profile",
    description: "Motor-03 bearing friction causes stator temperature to climb toward upper safety thresholds.",
    targetRoute: "predictive",
  },
  {
    step: 4,
    title: "Event 3: Critical Risk & Alert Triggered",
    description: "The predictive engine classifies Motor-03 as Critical Risk and raises an automated alert.",
    targetRoute: "digital-twin",
  },
  {
    step: 5,
    title: "Event 4: Sphere Copilot Root-Cause Explanation",
    description: "Sphere Copilot inspects live telemetry and recommends bearing, alignment, and lubrication checks.",
    targetRoute: "copilot",
  },
  {
    step: 6,
    title: "Event 5: Preventive Maintenance Scheduled",
    description: "Plant Manager logs a high-priority inspection task for Motor-03 before breakdown occurs.",
    targetRoute: "maintenance",
  },
  {
    step: 7,
    title: "Event 6: Inbound Supplier Delivery Delay",
    description: "Narayanganj Knit Mills reports a +3 day transit delay on combed cotton rolls.",
    targetRoute: "supply-chain",
  },
  {
    step: 8,
    title: "Event 7: Heavy Rainfall Corridor Alert",
    description: "Weather Intelligence models a heavy rainfall scenario affecting Gazipur-Dhaka transport.",
    targetRoute: "weather",
  },
  {
    step: 9,
    title: "Event 8–9: Production Impact & Reroute Plan",
    description: "Production Intelligence recalculates potential shortfall and recommends inventory & line rebalancing.",
    targetRoute: "production",
  },
  {
    step: 10,
    title: "Event 10: Unified Command Overview",
    description: "Dashboard reflects updated risk posture, scheduled mitigation, and operational KPIs.",
    targetRoute: "dashboard",
  },
];

interface IndustryContextValue {
  route: PageRoute;
  navigate: (r: PageRoute) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  userName: string;
  setUserName: (name: string) => void;
  industries: IndustryPreset[];
  addCustomIndustry: (name: string, location: string, unit: string, dailyTarget: number) => void;
  facilities: FactoryEnvironment[];
  activeFacilityId: string;
  activeFacility: FactoryEnvironment;
  activeIndustry: IndustryPreset;
  switchFacility: (facilityId: string) => void;
  switchIndustry: (industryId: string) => void;
  selectedMachineId: string;
  setSelectedMachineId: (id: string) => void;
  selectedMachine: MachineAsset;
  isSimulating: boolean;
  setIsSimulating: (v: boolean) => void;
  resetDemo: () => void;
  generateNewScenario: () => void;
  updateMachineSensors: (
    machineId: string,
    updates: Partial<Pick<MachineAsset, "temperature" | "vibration" | "powerKw" | "rpm" | "operatingHours" | "pressureBar" | "torqueNm">>
  ) => void;
  addCustomMachine: (input: {
    name: string;
    id: string;
    category: string;
    visualKind: MachineVisualKind;
    zone: MachineAsset["zone"];
    tempNominal: number;
    vibrationNominal: number;
    powerNominal: number;
    rpmNominal: number;
  }) => void;
  createMaintenanceTask: (task: Omit<MaintenanceTask, "id" | "status">) => void;
  updateMaintenanceStatus: (taskId: string, status: MaintenanceStatus) => void;
  markAlertRead: (alertId: string) => void;
  markAllAlertsRead: () => void;
  resolveAlert: (alertId: string) => void;
  updateSupplyDisruption: (updates: Partial<SupplyChainDisruption>) => void;
  weather: WeatherScenarioState;
  fetchWeather: (cityKey: string, customLat?: number, customLon?: number) => Promise<void>;
  setSimulatedWeatherHazard: (hazard: WeatherScenarioState["simulatedHazard"]) => void;
  copilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  copilotQueuedPrompt: string | null;
  askCopilot: (prompt: string, openFullPage?: boolean) => void;
  clearQueuedPrompt: () => void;
  guidedStep: number | null;
  startGuidedDemo: () => void;
  nextGuidedStep: () => void;
  prevGuidedStep: () => void;
  exitGuidedDemo: () => void;
  privacyMasking: boolean;
  setPrivacyMasking: (v: boolean) => void;
  exportWatermark: boolean;
  setExportWatermark: (v: boolean) => void;
  securityAuditLog: Array<{
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    protection: string;
  }>;
  recordSecurityEvent: (action: string, protection: string) => void;
}

const IndustryContext = createContext<IndustryContextValue | null>(null);

const VALID_ROUTES: PageRoute[] = [
  "home",
  "platform",
  "solutions",
  "industries",
  "technology",
  "signin",
  "dashboard",
  "digital-twin",
  "machines",
  "predictive",
  "production",
  "supply-chain",
  "weather",
  "copilot",
  "maintenance",
  "alerts",
  "analytics",
  "settings",
];

function getInitialRoute(): PageRoute {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace(/^#\/?/, "") as PageRoute;
  return VALID_ROUTES.includes(hash) ? hash : "home";
}

export const IndustryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<PageRoute>(getInitialRoute);
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      return (localStorage.getItem("is_role") as UserRole) || "Plant Manager";
    } catch {
      return "Plant Manager";
    }
  });
  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem("is_user") || "Eng. Rafiqul Islam";
    } catch {
      return "Eng. Rafiqul Islam";
    }
  });

  const [industries, setIndustries] = useState<IndustryPreset[]>(INDUSTRY_PRESETS);
  const [facilities, setFacilities] = useState<FactoryEnvironment[]>(() => createInitialMultiFacilities());
  const [activeFacilityId, setActiveFacilityId] = useState<string>("factory-a");
  const [selectedMachineId, setSelectedMachineId] = useState<string>("M-03");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [copilotQueuedPrompt, setCopilotQueuedPrompt] = useState<string | null>(null);
  const [guidedStep, setGuidedStep] = useState<number | null>(null);
  const [privacyMasking, setPrivacyMasking] = useState<boolean>(false);
  const [exportWatermark, setExportWatermark] = useState<boolean>(true);
  const [securityAuditLog, setSecurityAuditLog] = useState<
    Array<{ id: string; timestamp: string; actor: string; action: string; protection: string }>
  >([
    {
      id: "sec-init-1",
      timestamp: new Date().toISOString(),
      actor: "Edge Gateway Diode",
      action: "Verified outbound-only TLS 1.3 telemetry tunnel (zero PLC write-back)",
      protection: "Anti-Sabotage Lock",
    },
    {
      id: "sec-init-2",
      timestamp: new Date().toISOString(),
      actor: "Tenant Security Core",
      action: "AES-256 facility isolation enforced across plant workspaces",
      protection: "Tenant Silo Active",
    },
  ]);

  const recordSecurityEvent = useCallback(
    (action: string, protection: string) => {
      setSecurityAuditLog((prev) => [
        {
          id: `sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          actor: `${userName} (${userRole})`,
          action,
          protection,
        },
        ...prev.slice(0, 24),
      ]);
    },
    [userName, userRole]
  );

  const [weather, setWeather] = useState<WeatherScenarioState>({
    cityKey: "gazipur",
    simulatedHazard: "None",
    liveData: {
      source: "Open-Meteo Regional Feed (Click Refresh for Live Update)",
      isSimulated: false,
      location: "Gazipur, Bangladesh",
      updatedAt: new Date().toISOString(),
      current: {
        temperatureC: 30.8,
        humidityPct: 74,
        rainMm: 0.4,
        windKmh: 12.6,
        weatherCode: 2,
      },
      daily: Array.from({ length: 5 }, (_, i) => ({
        date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
        tempMaxC: Number((31.2 + i * 0.4).toFixed(1)),
        tempMinC: Number((24.6 + i * 0.2).toFixed(1)),
        precipProbPct: 30 + i * 10,
        rainSumMm: Number((2.0 + i * 3.1).toFixed(1)),
      })),
    },
  });

  const navigate = useCallback((r: PageRoute) => {
    setRoute(r);
    if (typeof window !== "undefined") {
      window.location.hash = r === "home" ? "" : `#${r}`;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#\/?/, "") as PageRoute;
      if (VALID_ROUTES.includes(h)) {
        setRoute(h);
      } else if (!window.location.hash) {
        setRoute("home");
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("is_role", userRole);
      localStorage.setItem("is_user", userName);
    } catch {
      // ignore storage errors
    }
  }, [userRole, userName]);

  const activeFacility = useMemo(
    () => facilities.find((f) => f.id === activeFacilityId) || facilities[0],
    [facilities, activeFacilityId]
  );

  const activeIndustry = useMemo(
    () => industries.find((ind) => ind.id === activeFacility.industryId) || industries[0],
    [industries, activeFacility.industryId]
  );

  const selectedMachine = useMemo(
    () =>
      activeFacility.machines.find((m) => m.id === selectedMachineId) ||
      activeFacility.machines[0],
    [activeFacility.machines, selectedMachineId]
  );

  const updateActiveFacility = useCallback(
    (updater: (fac: FactoryEnvironment) => FactoryEnvironment) => {
      setFacilities((prev) =>
        prev.map((f) => (f.id === activeFacilityId ? updater(f) : f))
      );
    },
    [activeFacilityId]
  );

  const switchFacility = useCallback(
    (facilityId: string) => {
      setActiveFacilityId(facilityId);
      const found = facilities.find((f) => f.id === facilityId);
      if (found && found.machines.length > 0) {
        const m03 = found.machines.find((m) => m.id === "M-03") || found.machines[0];
        setSelectedMachineId(m03.id);
        recordSecurityEvent(`Switched tenant context to ${found.name}`, "Tenant RBAC Verified");
      }
    },
    [facilities, recordSecurityEvent]
  );

  const switchIndustry = useCallback(
    (industryId: string) => {
      const preset = industries.find((i) => i.id === industryId);
      if (!preset) return;
      const newFac = buildFactoryFromIndustry(preset, {
        id: activeFacilityId,
        name: `${preset.name} Plant — ${preset.defaultLocation}`,
        location: preset.defaultLocation,
        degradeMotor03: true,
      });
      setFacilities((prev) =>
        prev.map((f) => (f.id === activeFacilityId ? newFac : f))
      );
      const m03 = newFac.machines.find((m) => m.id === "M-03") || newFac.machines[0];
      setSelectedMachineId(m03.id);
      recordSecurityEvent(`Loaded encrypted ${preset.name} twin`, "AES-256 Sandbox");
    },
    [activeFacilityId, industries, recordSecurityEvent]
  );

  const addCustomIndustry = useCallback(
    (name: string, location: string, unit: string, dailyTarget: number) => {
      const base = industries[industries.length - 1];
      const id = `custom-${Date.now()}`;
      const newPreset: IndustryPreset = {
        ...base,
        id,
        name,
        defaultLocation: location || "Dhaka",
        productionUnit: unit || "units",
        dailyTarget: dailyTarget || 5000,
        sectorSummary: `Custom configured industrial ecosystem for ${name}.`,
      };
      setIndustries((prev) => [...prev, newPreset]);
      const newFac = buildFactoryFromIndustry(newPreset, {
        id: activeFacilityId,
        name: `${name} — ${location || "Dhaka"}`,
        location: location || "Dhaka",
        degradeMotor03: false,
      });
      setFacilities((prev) =>
        prev.map((f) => (f.id === activeFacilityId ? newFac : f))
      );
    },
    [activeFacilityId, industries]
  );

  const recomputeLines = (fac: FactoryEnvironment): FactoryEnvironment["lines"] => {
    return fac.lines.map((line) => {
      const lineMachines = fac.machines.filter((m) => line.machineIds.includes(m.id));
      const avgHealth =
        lineMachines.reduce((s, m) => s + m.prediction.healthScore, 0) /
        Math.max(1, lineMachines.length);
      const disruptionPenalty =
        fac.supplyDisruption.supplierDelayDays * 2.5 +
        (fac.supplyDisruption.portCongestion ? 5 : 0) +
        (fac.supplyDisruption.roadDisruption ? 4 : 0) +
        (fac.supplyDisruption.weatherDisruption ? 5 : 0);
      const eff = Math.max(38, Math.min(99, Math.round(avgHealth * 0.96 - disruptionPenalty)));
      return {
        ...line,
        efficiencyPct: eff,
        actualUnits: Math.round((line.targetUnits * eff) / 100),
        status: eff < 62 ? "Bottleneck" : eff < 84 ? "Degraded" : "Running",
      };
    });
  };

  const updateMachineSensors = useCallback(
    (
      machineId: string,
      updates: Partial<Pick<MachineAsset, "temperature" | "vibration" | "powerKw" | "rpm" | "operatingHours" | "pressureBar" | "torqueNm">>
    ) => {
      updateActiveFacility((fac) => {
        const newAlerts: IndustrialAlert[] = [...fac.alerts];
        const newLog = [...fac.activityLog];

        const updatedMachines = fac.machines.map((m) => {
          if (m.id !== machineId) return m;
          const merged = { ...m, ...updates };
          const { prediction, derivedStatus } = evaluateMachinePrediction(merged);
          const nowIso = new Date().toISOString();

          const nextPoint = {
            timestamp: nowIso,
            temperature: Number(merged.temperature.toFixed(1)),
            vibration: Number(merged.vibration.toFixed(2)),
            powerKw: Number(merged.powerKw.toFixed(1)),
            rpm: Math.round(merged.rpm),
            pressureBar: merged.pressureBar,
            torqueNm: merged.torqueNm,
            healthScore: prediction.healthScore,
          };

          const updatedHistory = [...m.history.slice(-29), nextPoint];

          // Trigger alert if risk escalated to High or Critical and no unresolved alert exists for same priority
          if (
            (prediction.riskLevel === "Critical Risk" || prediction.riskLevel === "High Risk") &&
            !newAlerts.some(
              (a) =>
                a.machineId === m.id &&
                !a.resolved &&
                a.priority === (prediction.riskLevel === "Critical Risk" ? "Critical" : "High")
            )
          ) {
            const prio = prediction.riskLevel === "Critical Risk" ? "Critical" : "High";
            newAlerts.unshift({
              id: `alrt-${m.id}-${Date.now()}`,
              title: `${prio.toUpperCase()} — ${m.name}`,
              message: `${prediction.predictedFailureCategory}. Temp: ${merged.temperature.toFixed(1)}°C, Vib: ${merged.vibration.toFixed(2)} mm/s.`,
              recommendedAction: prediction.recommendedAction,
              category:
                merged.vibration > merged.thresholds.vibrationMax * 0.85
                  ? "Abnormal Vibration"
                  : merged.temperature > merged.thresholds.tempMax * 0.85
                  ? "Abnormal Temperature"
                  : "Machine Failure Risk",
              priority: prio,
              timestamp: nowIso,
              read: false,
              resolved: false,
              machineId: m.id,
            });
            newLog.unshift({
              id: `act-${Date.now()}`,
              timestamp: nowIso,
              type: "alert",
              description: `${prio} anomaly flagged on ${m.id}: ${prediction.predictedFailureCategory}.`,
            });
          }

          return {
            ...merged,
            status: derivedStatus,
            prediction,
            history: updatedHistory,
          };
        });

        const nextFac = {
          ...fac,
          machines: updatedMachines,
          alerts: newAlerts.slice(0, 40),
          activityLog: newLog.slice(0, 30),
        };
        return {
          ...nextFac,
          lines: recomputeLines(nextFac),
        };
      });
    },
    [updateActiveFacility]
  );

  const addCustomMachine = useCallback(
    (input: {
      name: string;
      id: string;
      category: string;
      visualKind: MachineVisualKind;
      zone: MachineAsset["zone"];
      tempNominal: number;
      vibrationNominal: number;
      powerNominal: number;
      rpmNominal: number;
    }) => {
      updateActiveFacility((fac) => {
        const cleanId = input.id.trim().toUpperCase() || `AST-${fac.machines.length + 1}`;
        const thresholds = {
          tempNominal: input.tempNominal,
          tempMax: Math.round(input.tempNominal * 1.4),
          vibrationNominal: input.vibrationNominal,
          vibrationMax: Number((input.vibrationNominal * 2.8).toFixed(1)),
          powerNominal: input.powerNominal,
          powerMax: Math.round(input.powerNominal * 1.45),
          rpmNominal: input.rpmNominal,
          rpmVariancePct: 14,
          hasPressure: input.visualKind === "pump" || input.visualKind === "boiler",
          hasTorque: input.visualKind === "motor",
          pressureNominal: input.visualKind === "pump" || input.visualKind === "boiler" ? 7.5 : undefined,
          pressureMax: input.visualKind === "pump" || input.visualKind === "boiler" ? 10.5 : undefined,
          torqueNominal: input.visualKind === "motor" ? 120 : undefined,
          torqueMax: input.visualKind === "motor" ? 175 : undefined,
        };
        const base = {
          id: cleanId,
          name: input.name,
          industryId: fac.industryId,
          category: input.category,
          visualKind: input.visualKind,
          lineId: "LINE-01",
          zone: input.zone,
          manufacturer: "Custom Configured Asset",
          model: `${cleanId}-V1`,
          installationDate: new Date().toISOString().slice(0, 10),
          operatingHours: 120,
          temperature: input.tempNominal,
          vibration: input.vibrationNominal,
          powerKw: input.powerNominal,
          rpm: input.rpmNominal,
          pressureBar: thresholds.pressureNominal,
          torqueNm: thresholds.torqueNominal,
          position3D: [
            ((fac.machines.length % 3) - 1) * 4.2,
            0,
            fac.machines.length >= 3 ? 4.4 : -4.4,
          ] as [number, number, number],
          connectedTo: [fac.machines[0]?.id || "M-03"],
          thresholds,
          history: [
            {
              timestamp: new Date().toISOString(),
              temperature: input.tempNominal,
              vibration: input.vibrationNominal,
              powerKw: input.powerNominal,
              rpm: input.rpmNominal,
              healthScore: 95,
            },
          ],
          maintenanceHistory: [],
        };
        const { prediction, derivedStatus } = evaluateMachinePrediction(base);
        const newMachine: MachineAsset = { ...base, status: derivedStatus, prediction };
        setSelectedMachineId(newMachine.id);
        return {
          ...fac,
          machines: [...fac.machines, newMachine],
          activityLog: [
            {
              id: `act-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "simulation",
              description: `Added custom asset ${newMachine.name} (${newMachine.id}).`,
            },
            ...fac.activityLog,
          ],
        };
      });
    },
    [updateActiveFacility]
  );

  const createMaintenanceTask = useCallback(
    (task: Omit<MaintenanceTask, "id" | "status">) => {
      updateActiveFacility((fac) => {
        const newTask: MaintenanceTask = {
          ...task,
          id: `PM-${Math.floor(200 + Math.random() * 799)}`,
          status: "Scheduled",
        };
        return {
          ...fac,
          maintenanceTasks: [newTask, ...fac.maintenanceTasks],
          activityLog: [
            {
              id: `act-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "maintenance",
              description: `Scheduled ${task.priority} maintenance for ${task.machineId}: ${task.title}.`,
            },
            ...fac.activityLog,
          ],
        };
      });
    },
    [updateActiveFacility]
  );

  const updateMaintenanceStatus = useCallback(
    (taskId: string, status: MaintenanceStatus) => {
      updateActiveFacility((fac) => {
        const target = fac.maintenanceTasks.find((t) => t.id === taskId);
        const updatedTasks = fac.maintenanceTasks.map((t) =>
          t.id === taskId ? { ...t, status } : t
        );

        let updatedMachines = fac.machines;
        let updatedAlerts = fac.alerts;
        const updatedLog = [...fac.activityLog];

        if (status === "Completed" && target) {
          updatedMachines = fac.machines.map((m) => {
            if (m.id !== target.machineId) return m;
            const restored = {
              ...m,
              temperature: m.thresholds.tempNominal,
              vibration: m.thresholds.vibrationNominal,
              powerKw: m.thresholds.powerNominal,
              rpm: m.thresholds.rpmNominal,
              pressureBar: m.thresholds.pressureNominal,
              torqueNm: m.thresholds.torqueNominal,
              maintenanceHistory: [
                {
                  id: `mh-${Date.now()}`,
                  date: new Date().toISOString().slice(0, 10),
                  action: target.title,
                  technician: target.assignedTechnician,
                  outcome: "Completed — sensors restored to nominal baseline",
                  costBdt: Math.round(target.estimatedDurationHrs * 1800),
                },
                ...m.maintenanceHistory,
              ],
            };
            const { prediction, derivedStatus } = evaluateMachinePrediction(restored);
            return {
              ...restored,
              status: derivedStatus,
              prediction,
              history: [
                ...m.history.slice(-29),
                {
                  timestamp: new Date().toISOString(),
                  temperature: restored.temperature,
                  vibration: restored.vibration,
                  powerKw: restored.powerKw,
                  rpm: restored.rpm,
                  healthScore: prediction.healthScore,
                },
              ],
            };
          });

          updatedAlerts = fac.alerts.map((a) =>
            a.machineId === target.machineId ? { ...a, resolved: true, read: true } : a
          );

          updatedLog.unshift({
            id: `act-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "maintenance",
            description: `Completed PM task ${target.id} on ${target.machineId}. Machine health restored.`,
          });
        }

        const nextFac = {
          ...fac,
          maintenanceTasks: updatedTasks,
          machines: updatedMachines,
          alerts: updatedAlerts,
          activityLog: updatedLog.slice(0, 30),
        };
        return {
          ...nextFac,
          lines: recomputeLines(nextFac),
        };
      });
    },
    [updateActiveFacility]
  );

  const markAlertRead = useCallback(
    (alertId: string) => {
      updateActiveFacility((fac) => ({
        ...fac,
        alerts: fac.alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a)),
      }));
    },
    [updateActiveFacility]
  );

  const markAllAlertsRead = useCallback(() => {
    updateActiveFacility((fac) => ({
      ...fac,
      alerts: fac.alerts.map((a) => ({ ...a, read: true })),
    }));
  }, [updateActiveFacility]);

  const resolveAlert = useCallback(
    (alertId: string) => {
      updateActiveFacility((fac) => ({
        ...fac,
        alerts: fac.alerts.map((a) =>
          a.id === alertId ? { ...a, resolved: true, read: true } : a
        ),
      }));
    },
    [updateActiveFacility]
  );

  const updateSupplyDisruption = useCallback(
    (updates: Partial<SupplyChainDisruption>) => {
      updateActiveFacility((fac) => {
        const nextDisruption = { ...fac.supplyDisruption, ...updates };
        const delayed =
          nextDisruption.supplierDelayDays > 0 ||
          nextDisruption.portCongestion ||
          nextDisruption.roadDisruption ||
          nextDisruption.weatherDisruption;

        const updatedSuppliers = fac.suppliers.map((s, idx) => ({
          ...s,
          shipmentStatus: delayed && idx === 0 ? ("Delayed" as const) : delayed && idx === 1 ? ("At Risk" as const) : ("On Schedule" as const),
          delayHistoryDays: idx === 0 ? nextDisruption.supplierDelayDays : s.delayHistoryDays,
        }));

        const updatedAlerts = [...fac.alerts];
        if (delayed && !updatedAlerts.some((a) => a.category === "Supplier Delay" && !a.resolved)) {
          updatedAlerts.unshift({
            id: `alrt-sup-${Date.now()}`,
            title: `Supply Chain Disruption (+${nextDisruption.supplierDelayDays}d Lead Time)`,
            message: `Inbound logistics impacted by ${[
              nextDisruption.supplierDelayDays > 0 ? `${nextDisruption.supplierDelayDays}-day supplier delay` : "",
              nextDisruption.portCongestion ? "port congestion" : "",
              nextDisruption.roadDisruption ? "road disruption" : "",
              nextDisruption.weatherDisruption ? "weather delay" : "",
            ]
              .filter(Boolean)
              .join(", ")}.`,
            recommendedAction: "Activate secondary regional vendor and rebalance shift schedule.",
            category: "Supplier Delay",
            priority: nextDisruption.supplierDelayDays >= 3 ? "Critical" : "High",
            timestamp: new Date().toISOString(),
            read: false,
            resolved: false,
          });
        }

        const nextFac: FactoryEnvironment = {
          ...fac,
          supplyDisruption: nextDisruption,
          suppliers: updatedSuppliers,
          alerts: updatedAlerts.slice(0, 40),
        };
        return {
          ...nextFac,
          lines: recomputeLines(nextFac),
        };
      });
    },
    [updateActiveFacility]
  );

  const fetchWeather = useCallback(async (cityKey: string, customLat?: number, customLon?: number) => {
    try {
      const params = new URLSearchParams({ city: cityKey });
      if (typeof customLat === "number" && typeof customLon === "number") {
        params.set("lat", String(customLat));
        params.set("lon", String(customLon));
      }
      const res = await fetch(`/api/weather?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setWeather((prev) => ({
          ...prev,
          cityKey,
          customLat,
          customLon,
          liveData: json,
        }));
      }
    } catch {
      // keep existing fallback data
    }
  }, []);

  const setSimulatedWeatherHazard = useCallback(
    (hazard: WeatherScenarioState["simulatedHazard"]) => {
      setWeather((prev) => ({ ...prev, simulatedHazard: hazard }));
      if (hazard !== "None") {
        updateSupplyDisruption({
          weatherDisruption: true,
          roadDisruption: hazard === "Flood Scenario" || hazard === "Transport Disruption",
          supplierDelayDays: hazard === "Flood Scenario" ? 3 : hazard === "Heavy Rainfall" ? 2 : 1,
        });
      } else {
        updateSupplyDisruption({
          weatherDisruption: false,
          roadDisruption: false,
          supplierDelayDays: 0,
        });
      }
    },
    [updateSupplyDisruption]
  );

  const resetDemo = useCallback(() => {
    setIsSimulating(false);
    setGuidedStep(null);
    const fresh = createInitialMultiFacilities();
    setFacilities(fresh);
    setActiveFacilityId("factory-a");
    setSelectedMachineId("M-03");
    setWeather((prev) => ({ ...prev, simulatedHazard: "None" }));
  }, []);

  const generateNewScenario = useCallback(() => {
    updateActiveFacility((fac) => {
      const targetIdx = Math.floor(Math.random() * fac.machines.length);
      const updatedMachines = fac.machines.map((m, idx) => {
        const spike = idx === targetIdx ? 0.85 : Math.random() * 0.35;
        const temp = Number(
          (m.thresholds.tempNominal + (m.thresholds.tempMax - m.thresholds.tempNominal) * spike).toFixed(1)
        );
        const vib = Number(
          (m.thresholds.vibrationNominal + (m.thresholds.vibrationMax - m.thresholds.vibrationNominal) * spike).toFixed(2)
        );
        const power = Number((m.thresholds.powerNominal * (1 + spike * 0.32)).toFixed(1));
        const merged = { ...m, temperature: temp, vibration: vib, powerKw: power };
        const { prediction, derivedStatus } = evaluateMachinePrediction(merged);
        return {
          ...merged,
          status: derivedStatus,
          prediction,
          history: [
            ...m.history.slice(-29),
            {
              timestamp: new Date().toISOString(),
              temperature: temp,
              vibration: vib,
              powerKw: power,
              rpm: m.rpm,
              healthScore: prediction.healthScore,
            },
          ],
        };
      });
      const targetM = updatedMachines[targetIdx];
      setSelectedMachineId(targetM.id);
      const nextFac = {
        ...fac,
        machines: updatedMachines,
        activityLog: [
          {
            id: `act-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "simulation" as const,
            description: `Generated new stress scenario focused on ${targetM.name} (${targetM.id}).`,
          },
          ...fac.activityLog,
        ],
      };
      return { ...nextFac, lines: recomputeLines(nextFac) };
    });
  }, [updateActiveFacility]);

  // Continuous live simulation tick when enabled
  const simTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isSimulating) {
      if (simTickRef.current) window.clearInterval(simTickRef.current);
      return;
    }
    simTickRef.current = window.setInterval(() => {
      updateActiveFacility((fac) => {
        const updatedMachines = fac.machines.map((m) => {
          const jitterTemp = (Math.random() - 0.46) * 0.9;
          const jitterVib = (Math.random() - 0.46) * 0.14;
          const jitterPower = (Math.random() - 0.48) * 0.6;
          const nextTemp = Math.max(m.thresholds.tempNominal * 0.8, Number((m.temperature + jitterTemp).toFixed(1)));
          const nextVib = Math.max(0.4, Number((m.vibration + jitterVib).toFixed(2)));
          const nextPower = Math.max(5, Number((m.powerKw + jitterPower).toFixed(1)));
          const merged = {
            ...m,
            temperature: nextTemp,
            vibration: nextVib,
            powerKw: nextPower,
            operatingHours: m.operatingHours + 1,
          };
          const { prediction, derivedStatus } = evaluateMachinePrediction(merged);
          return {
            ...merged,
            status: derivedStatus,
            prediction,
            history: [
              ...m.history.slice(-29),
              {
                timestamp: new Date().toISOString(),
                temperature: nextTemp,
                vibration: nextVib,
                powerKw: nextPower,
                rpm: m.rpm,
                healthScore: prediction.healthScore,
              },
            ],
          };
        });
        const nextFac = { ...fac, machines: updatedMachines };
        return { ...nextFac, lines: recomputeLines(nextFac) };
      });
    }, 2600);
    return () => {
      if (simTickRef.current) window.clearInterval(simTickRef.current);
    };
  }, [isSimulating, updateActiveFacility]);

  const askCopilot = useCallback(
    (prompt: string, openFullPage = false) => {
      setCopilotQueuedPrompt(prompt);
      if (openFullPage) {
        navigate("copilot");
      } else {
        setCopilotOpen(true);
      }
    },
    [navigate]
  );

  const clearQueuedPrompt = useCallback(() => setCopilotQueuedPrompt(null), []);

  // Guided Demo Stepper State Mutations (Section 25)
  const applyGuidedStepState = useCallback(
    (stepNum: number) => {
      const def = GUIDED_DEMO_STEPS.find((s) => s.step === stepNum);
      if (!def) return;

      if (stepNum === 1) {
        const garments = industries[0];
        const healthyPlant = buildFactoryFromIndustry(garments, {
          id: "factory-a",
          name: "Factory A — Apex Apparel Export Unit",
          location: "Gazipur",
          degradeMotor03: false,
        });
        setFacilities((prev) => prev.map((f) => (f.id === "factory-a" ? healthyPlant : f)));
        setActiveFacilityId("factory-a");
        setSelectedMachineId("M-03");
        setWeather((prev) => ({ ...prev, simulatedHazard: "None" }));
      } else if (stepNum === 2) {
        setActiveFacilityId("factory-a");
        setSelectedMachineId("M-03");
        updateMachineSensors("M-03", { vibration: 4.35, temperature: 63.0 });
      } else if (stepNum === 3) {
        setSelectedMachineId("M-03");
        updateMachineSensors("M-03", { vibration: 4.95, temperature: 79.4, powerKw: 31.8 });
      } else if (stepNum === 4) {
        setSelectedMachineId("M-03");
        updateMachineSensors("M-03", { vibration: 5.45, temperature: 82.6, powerKw: 34.2, rpm: 1365 });
      } else if (stepNum === 5) {
        setCopilotQueuedPrompt("Why is Motor-03 at critical risk?");
      } else if (stepNum === 6) {
        createMaintenanceTask({
          machineId: "M-03",
          machineName: "Main Conveyor Motor-03",
          title: "Inspect Motor-03 bearings, alignment & lubrication",
          priority: "Critical",
          assignedTechnician: "Eng. Tanvir Ahmed",
          dueDate: new Date().toISOString().slice(0, 10),
          estimatedDurationHrs: 3,
          notes: "Scheduled from Guided Demo predictive risk alert.",
        });
      } else if (stepNum === 7) {
        updateSupplyDisruption({ supplierDelayDays: 3, portCongestion: true });
      } else if (stepNum === 8) {
        setSimulatedWeatherHazard("Heavy Rainfall");
      }

      navigate(def.targetRoute);
    },
    [createMaintenanceTask, industries, navigate, setSimulatedWeatherHazard, updateMachineSensors, updateSupplyDisruption]
  );

  const startGuidedDemo = useCallback(() => {
    setGuidedStep(1);
    applyGuidedStepState(1);
  }, [applyGuidedStepState]);

  const nextGuidedStep = useCallback(() => {
    setGuidedStep((prev) => {
      const next = prev === null ? 1 : Math.min(GUIDED_DEMO_STEPS.length, prev + 1);
      applyGuidedStepState(next);
      return next;
    });
  }, [applyGuidedStepState]);

  const prevGuidedStep = useCallback(() => {
    setGuidedStep((prev) => {
      const next = prev === null ? 1 : Math.max(1, prev - 1);
      applyGuidedStepState(next);
      return next;
    });
  }, [applyGuidedStepState]);

  const exitGuidedDemo = useCallback(() => {
    setGuidedStep(null);
  }, []);

  const value: IndustryContextValue = {
    route,
    navigate,
    userRole,
    setUserRole,
    userName,
    setUserName,
    industries,
    addCustomIndustry,
    facilities,
    activeFacilityId,
    activeFacility,
    activeIndustry,
    switchFacility,
    switchIndustry,
    selectedMachineId,
    setSelectedMachineId,
    selectedMachine,
    isSimulating,
    setIsSimulating,
    resetDemo,
    generateNewScenario,
    updateMachineSensors,
    addCustomMachine,
    createMaintenanceTask,
    updateMaintenanceStatus,
    markAlertRead,
    markAllAlertsRead,
    resolveAlert,
    updateSupplyDisruption,
    weather,
    fetchWeather,
    setSimulatedWeatherHazard,
    copilotOpen,
    setCopilotOpen,
    copilotQueuedPrompt,
    askCopilot,
    clearQueuedPrompt,
    guidedStep,
    startGuidedDemo,
    nextGuidedStep,
    prevGuidedStep,
    exitGuidedDemo,
    privacyMasking,
    setPrivacyMasking,
    exportWatermark,
    setExportWatermark,
    securityAuditLog,
    recordSecurityEvent,
  };

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>;
};

export function useIndustry(): IndustryContextValue {
  const ctx = useContext(IndustryContext);
  if (!ctx) throw new Error("useIndustry must be used inside IndustryProvider");
  return ctx;
}
