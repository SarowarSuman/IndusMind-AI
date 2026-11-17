import { INDUSTRY_PRESETS } from "./industries";
import { evaluateMachinePrediction } from "../services/predictionEngine";
import {
  FactoryEnvironment,
  IndustrialAlert,
  IndustryPreset,
  MachineAsset,
  MaintenanceTask,
  ProductionLine,
  RawMaterial,
  SensorReading,
  SupplierProfile,
} from "../types/industrial";

const POSITIONS_3D: Array<[number, number, number]> = [
  [-5.6, 0, -3.6],
  [-1.9, 0, -3.6],
  [1.9, 0, -3.6],
  [5.6, 0, -3.6],
  [-5.6, 0, 0.2],
  [5.6, 0, 0.2],
  [-5.6, 0, 3.8],
  [-1.9, 0, 3.8],
  [1.9, 0, 3.8],
  [5.6, 0, 3.8],
  [-3.8, 0, -6.6],
  [3.8, 0, -6.6],
];

function buildHistory(
  nominalTemp: number,
  nominalVib: number,
  nominalPower: number,
  nominalRpm: number,
  currentTemp: number,
  currentVib: number,
  currentPower: number,
  currentRpm: number,
  pressureNominal?: number,
  torqueNominal?: number
): SensorReading[] {
  const points = 24;
  const now = Date.now();
  const list: SensorReading[] = [];

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const wave = Math.sin(i * 0.7) * 0.03;
    const ramp = progress > 0.55 ? (progress - 0.55) / 0.45 : 0;
    const temp = nominalTemp + (currentTemp - nominalTemp) * ramp + nominalTemp * wave;
    const vib = nominalVib + (currentVib - nominalVib) * ramp + nominalVib * wave * 1.4;
    const power = nominalPower + (currentPower - nominalPower) * ramp + nominalPower * wave;
    const rpm = nominalRpm + (currentRpm - nominalRpm) * ramp + nominalRpm * (wave * 0.35);
    const ts = new Date(now - (points - 1 - i) * 3600 * 1000).toISOString();

    const estHealth = Math.max(
      18,
      Math.min(
        98,
        Math.round(
          95 -
            Math.max(0, (vib - nominalVib) / Math.max(0.2, nominalVib)) * 38 -
            Math.max(0, (temp - nominalTemp) / Math.max(5, nominalTemp)) * 45
        )
      )
    );

    list.push({
      timestamp: ts,
      temperature: Number(temp.toFixed(1)),
      vibration: Number(vib.toFixed(2)),
      powerKw: Number(power.toFixed(1)),
      rpm: Math.round(rpm),
      pressureBar: pressureNominal ? Number((pressureNominal * (1 + wave * 0.8)).toFixed(2)) : undefined,
      torqueNm: torqueNominal ? Number((torqueNominal * (1 + wave * 0.9)).toFixed(1)) : undefined,
      healthScore: estHealth,
    });
  }
  return list;
}

export function buildFactoryFromIndustry(
  preset: IndustryPreset,
  options?: {
    id?: string;
    name?: string;
    location?: string;
    degradeMotor03?: boolean;
  }
): FactoryEnvironment {
  const factoryId = options?.id || `fac-${preset.id}`;
  const factoryName = options?.name || `${preset.name} Plant — ${preset.defaultLocation}`;
  const location = options?.location || preset.defaultLocation;
  const allowCritical = options?.degradeMotor03 ?? true;
  const profile = preset.fleetProfile || {
    baseDowntimeHrs: 6.5,
    baseMaintenanceBdt: 42000,
    lineCount: 2 as const,
    degradedIndices: [1],
    watchIndices: [3],
    efficiencyBiasPct: 0,
    openTaskCount: 2 as const,
  };

  const totalTemplates = preset.sampleTemplates.length;
  const lineCount = profile.lineCount;

  const machines: MachineAsset[] = preset.sampleTemplates.map((tpl, idx) => {
    const id = tpl.suffix;
    const isDegradedTarget = allowCritical && profile.degradedIndices.includes(idx);
    const isSecondaryWatch = profile.watchIndices.includes(idx);

    const temp = isDegradedTarget
      ? Number((tpl.thresholds.tempNominal + (tpl.thresholds.tempMax - tpl.thresholds.tempNominal) * (0.78 + (idx % 2) * 0.08)).toFixed(1))
      : isSecondaryWatch
      ? Number((tpl.thresholds.tempNominal + (tpl.thresholds.tempMax - tpl.thresholds.tempNominal) * (0.4 + (idx % 3) * 0.06)).toFixed(1))
      : Number((tpl.thresholds.tempNominal + (idx % 3) * 0.4).toFixed(1));

    const vib = isDegradedTarget
      ? Number((tpl.thresholds.vibrationNominal + (tpl.thresholds.vibrationMax - tpl.thresholds.vibrationNominal) * (0.82 + (idx % 2) * 0.07)).toFixed(2))
      : isSecondaryWatch
      ? Number((tpl.thresholds.vibrationNominal + (tpl.thresholds.vibrationMax - tpl.thresholds.vibrationNominal) * (0.42 + (idx % 3) * 0.05)).toFixed(2))
      : tpl.thresholds.vibrationNominal;

    const power = isDegradedTarget
      ? Number((tpl.thresholds.powerNominal * (1.2 + (idx % 2) * 0.06)).toFixed(1))
      : isSecondaryWatch
      ? Number((tpl.thresholds.powerNominal * 1.09).toFixed(1))
      : tpl.thresholds.powerNominal;

    const rpm = isDegradedTarget
      ? Math.round(tpl.thresholds.rpmNominal * 0.92)
      : tpl.thresholds.rpmNominal;

    const history = buildHistory(
      tpl.thresholds.tempNominal,
      tpl.thresholds.vibrationNominal,
      tpl.thresholds.powerNominal,
      tpl.thresholds.rpmNominal,
      temp,
      vib,
      power,
      rpm,
      tpl.thresholds.pressureNominal,
      tpl.thresholds.torqueNominal
    );

    const operatingHours = 2150 + idx * 1240 + ((preset.dailyTarget * 17) % 950);
    const lineIdx = idx % lineCount;
    const lineId = `LINE-0${lineIdx + 1}`;
    const base = {
      id,
      name: tpl.name,
      industryId: preset.id,
      category: tpl.category,
      visualKind: tpl.visualKind,
      lineId,
      zone: tpl.zone,
      manufacturer: ["Siemens Industrial", "ABB Drives", "Atlas Copco", "Mitsubishi Heavy", "Grundfos", "Caterpillar Energy"][idx % 6],
      model: `${tpl.suffix}-PRO-${2020 + (idx % 5)}`,
      installationDate: `202${1 + (idx % 4)}-0${1 + (idx % 8)}-14`,
      operatingHours,
      temperature: temp,
      vibration: vib,
      powerKw: power,
      rpm,
      pressureBar: tpl.thresholds.pressureNominal,
      torqueNm: tpl.thresholds.torqueNominal,
      position3D: POSITIONS_3D[idx % POSITIONS_3D.length],
      connectedTo: idx < totalTemplates - 1 ? [preset.sampleTemplates[idx + 1].suffix] : [preset.sampleTemplates[0].suffix],
      thresholds: tpl.thresholds,
      history,
      maintenanceHistory: [
        {
          id: `mh-${id}-1`,
          date: "2026-10-18",
          action: "Scheduled bearing lubrication & sensor calibration",
          technician: ["Eng. Tanvir Ahmed", "Eng. Farhana Karim", "Eng. Mahbubur Rahman"][idx % 3],
          outcome: "Passed baseline check",
          costBdt: 3200 + idx * 450,
        },
      ],
    };

    const { prediction, derivedStatus } = evaluateMachinePrediction(base);
    return {
      ...base,
      status: derivedStatus,
      prediction,
    };
  });

  const lineNames = [
    "Primary Production Line-01",
    "Secondary & Processing Line-02",
    "Finishing & Packaging Line-03",
  ];
  const lineShares = lineCount === 3 ? [0.46, 0.32, 0.22] : [0.6, 0.4];

  const lines: ProductionLine[] = Array.from({ length: lineCount }, (_, lIdx) => {
    const lineId = `LINE-0${lIdx + 1}`;
    const lineMachines = machines.filter((m) => m.lineId === lineId);
    const avgHealth = Math.round(
      lineMachines.reduce((s, m) => s + m.prediction.healthScore, 0) / Math.max(1, lineMachines.length)
    );
    const target = Math.max(1, Math.round(preset.dailyTarget * lineShares[lIdx]));
    const eff = Math.min(97, Math.max(62, Math.round(avgHealth * (0.95 - lIdx * 0.01) + profile.efficiencyBiasPct)));
    return {
      id: lineId,
      name: lineNames[lIdx],
      shift: lIdx === 2 ? "Shift B (16:00–00:00)" : "Shift A (08:00–16:00)",
      targetUnits: target,
      actualUnits: Math.round((target * eff) / 100),
      efficiencyPct: eff,
      status: eff < 78 ? "Bottleneck" : eff < 87 ? "Degraded" : "Running",
      machineIds: lineMachines.map((m) => m.id),
      unitCapacityPerHour: Math.max(1, Math.round(target / 8)),
    };
  });

  const today = new Date();
  const suppliers: SupplierProfile[] = preset.suppliers.map((s, idx) => {
    const eta = new Date(today.getTime() + s.leadTimeDays * 86400000).toISOString().slice(0, 10);
    return {
      id: `SUP-0${idx + 1}`,
      name: s.name,
      material: s.material,
      leadTimeDays: s.leadTimeDays,
      expectedDeliveryDate: eta,
      shipmentStatus: idx === 0 && allowCritical ? "In Transit" : "On Schedule",
      reliabilityScore: s.reliabilityScore,
      delayHistoryDays: idx === 1 ? 2 : 0,
      dependencyLevel: s.dependency,
    };
  });

  const materials: RawMaterial[] = preset.materials.map((m, idx) => ({
    id: `MAT-0${idx + 1}`,
    name: m.name,
    unit: m.unit,
    currentInventory: m.currentStock,
    minStockLevel: m.minStock,
    reorderThreshold: m.reorderThreshold,
    dailyConsumption: m.dailyConsumption,
    incomingStock: m.incomingQty,
    incomingEtaDays: m.incomingEtaDays,
  }));

  const alerts: IndustrialAlert[] = [];
  for (const m of machines) {
    if (m.prediction.riskLevel === "Critical Risk" || m.prediction.riskLevel === "High Risk") {
      alerts.push({
        id: `alrt-${m.id}-init`,
        title: `${m.prediction.riskLevel === "Critical Risk" ? "CRITICAL" : "HIGH"} — ${m.name}`,
        message: `${m.prediction.contributingFactors[0]?.summary || "Abnormal sensor trend detected."} Temperature at ${m.temperature}°C, vibration at ${m.vibration} mm/s.`,
        recommendedAction: m.prediction.recommendedAction,
        category: "Machine Failure Risk",
        priority: m.prediction.riskLevel === "Critical Risk" ? "Critical" : "High",
        timestamp: new Date().toISOString(),
        read: false,
        resolved: false,
        machineId: m.id,
      });
    }
  }

  const maintenanceTasks: MaintenanceTask[] = [];
  const openCount = allowCritical ? profile.openTaskCount : 1;
  for (let i = 0; i < openCount; i++) {
    const targetMachine = machines[(i * 2 + 1) % machines.length] || machines[0];
    maintenanceTasks.push({
      id: `PM-${101 + i}`,
      machineId: targetMachine.id,
      machineName: targetMachine.name,
      title:
        i === 0
          ? "Bearing inspection & vibration alignment check"
          : i === 1
          ? "Valve seal & pressure manifold calibration"
          : "Thermal relay & cooling fin service",
      priority: targetMachine.status === "Critical" ? "Critical" : i === 0 ? "High" : "Medium",
      assignedTechnician: ["Eng. Farhana Karim", "Eng. Tanvir Ahmed", "Eng. Mahbubur Rahman"][i % 3],
      dueDate: new Date(today.getTime() + (i + 1) * 86400000).toISOString().slice(0, 10),
      estimatedDurationHrs: 2 + i * 0.5,
      status: i === 2 ? "In Progress" : "Scheduled",
      notes: "Preventive schedule aligned with shift changeover.",
    });
  }
  maintenanceTasks.push({
    id: "PM-109",
    machineId: machines[0].id,
    machineName: machines[0].name,
    title: "Drive belt tension & thermal camera sweep",
    priority: "Low",
    assignedTechnician: "Eng. Tanvir Ahmed",
    dueDate: new Date(today.getTime() - 86400000).toISOString().slice(0, 10),
    estimatedDurationHrs: 1.5,
    status: "Completed",
    notes: "Completed during weekend shift changeover.",
  });

  return {
    id: factoryId,
    name: factoryName,
    location,
    industryId: preset.id,
    machines,
    lines,
    suppliers,
    materials,
    alerts,
    maintenanceTasks,
    activityLog: [
      {
        id: "act-init-1",
        timestamp: new Date().toISOString(),
        type: "simulation",
        description: `Loaded ${preset.name} workspace for ${factoryName} (${machines.length} monitored assets).`,
      },
    ],
    supplyDisruption: {
      supplierDelayDays: 0,
      portCongestion: false,
      roadDisruption: false,
      weatherDisruption: false,
      inventoryShortagePct: 0,
    },
    downtimeHoursMonth: allowCritical ? profile.baseDowntimeHrs : Number((profile.baseDowntimeHrs * 0.45).toFixed(1)),
    maintenanceCostBdtMonth: allowCritical
      ? profile.baseMaintenanceBdt
      : Math.round(profile.baseMaintenanceBdt * 0.78),
  };
}

export function createInitialMultiFacilities(): FactoryEnvironment[] {
  const byId = (id: string) => INDUSTRY_PRESETS.find((p) => p.id === id) || INDUSTRY_PRESETS[0];

  return [
    buildFactoryFromIndustry(byId("garments"), {
      id: "factory-a",
      name: "Factory A — Apex Apparel Export Unit",
      location: "Gazipur",
      degradeMotor03: true,
    }),
    buildFactoryFromIndustry(byId("pharma"), {
      id: "factory-b",
      name: "Factory B — Savar Sterile Pharma Campus",
      location: "Savar",
      degradeMotor03: false,
    }),
    buildFactoryFromIndustry(byId("food"), {
      id: "factory-c",
      name: "Factory C — Meghna Cold-Chain & Beverage",
      location: "Dhaka",
      degradeMotor03: true,
    }),
    buildFactoryFromIndustry(byId("cement"), {
      id: "factory-d",
      name: "Factory D — Karnaphuli Cement Terminal",
      location: "Chattogram",
      degradeMotor03: false,
    }),
    buildFactoryFromIndustry(byId("electronics"), {
      id: "factory-e",
      name: "Factory E — Gazipur Hi-Tech SMT Fab",
      location: "Gazipur",
      degradeMotor03: true,
    }),
  ];
}
