import {
  ContributingFactor,
  MachineAsset,
  MachinePrediction,
  OperationalStatus,
  RiskLevel,
  SensorReading,
  SensorThresholds,
} from "../types/industrial";

/**
 * Integration-ready contract for future Python/FastAPI ML models
 * (e.g., Random Forest, XGBoost, Isolation Forest, and RUL regression).
 * In the competition prototype, prediction runs deterministically in TypeScript
 * over asset-specific baselines, moving averages, and rate-of-change slopes.
 */
export interface MLModelFeatureVector {
  machineId: string;
  category: string;
  tempDeltaRatio: number;
  vibDeltaRatio: number;
  powerDeltaRatio: number;
  rpmDeviationRatio: number;
  tempTrendSlope: number;
  vibTrendSlope: number;
  operatingHours: number;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function computeMovingAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function computeSlope(values: number[]): number {
  if (values.length < 3) return 0;
  const recent = values.slice(-5);
  const first = recent[0];
  const last = recent[recent.length - 1];
  return (last - first) / Math.max(1, recent.length - 1);
}

export function extractMLFeatureVector(machine: {
  id: string;
  category: string;
  temperature: number;
  vibration: number;
  powerKw: number;
  rpm: number;
  operatingHours: number;
  thresholds: SensorThresholds;
  history: SensorReading[];
}): MLModelFeatureVector {
  const { thresholds, history } = machine;
  const tempRange = Math.max(1, thresholds.tempMax - thresholds.tempNominal);
  const vibRange = Math.max(0.2, thresholds.vibrationMax - thresholds.vibrationNominal);
  const powerRange = Math.max(1, thresholds.powerMax - thresholds.powerNominal);

  const recentHist = history.slice(-8);
  const tempSlope = computeSlope(recentHist.map((h) => h.temperature));
  const vibSlope = computeSlope(recentHist.map((h) => h.vibration));

  return {
    machineId: machine.id,
    category: machine.category,
    tempDeltaRatio: (machine.temperature - thresholds.tempNominal) / tempRange,
    vibDeltaRatio: (machine.vibration - thresholds.vibrationNominal) / vibRange,
    powerDeltaRatio: (machine.powerKw - thresholds.powerNominal) / powerRange,
    rpmDeviationRatio:
      Math.abs(machine.rpm - thresholds.rpmNominal) /
      Math.max(1, thresholds.rpmNominal * (thresholds.rpmVariancePct / 100)),
    tempTrendSlope: tempSlope,
    vibTrendSlope: vibSlope,
    operatingHours: machine.operatingHours,
  };
}

export function evaluateMachinePrediction(machine: {
  id: string;
  name: string;
  category: string;
  visualKind: MachineAsset["visualKind"];
  temperature: number;
  vibration: number;
  powerKw: number;
  rpm: number;
  pressureBar?: number;
  torqueNm?: number;
  operatingHours: number;
  thresholds: SensorThresholds;
  history: SensorReading[];
}): { prediction: MachinePrediction; derivedStatus: OperationalStatus } {
  const { thresholds, history } = machine;
  const fv = extractMLFeatureVector(machine);

  const tempAvg = computeMovingAverage(history.slice(-6).map((h) => h.temperature)) || machine.temperature;
  const vibAvg = computeMovingAverage(history.slice(-6).map((h) => h.vibration)) || machine.vibration;

  const tempDeltaPct = Math.round(((machine.temperature - thresholds.tempNominal) / Math.max(1, thresholds.tempNominal)) * 100);
  const vibDeltaPct = Math.round(((machine.vibration - thresholds.vibrationNominal) / Math.max(0.1, thresholds.vibrationNominal)) * 100);
  const powerDeltaPct = Math.round(((machine.powerKw - thresholds.powerNominal) / Math.max(1, thresholds.powerNominal)) * 100);
  const rpmDeltaPct = Math.round(((machine.rpm - thresholds.rpmNominal) / Math.max(1, thresholds.rpmNominal)) * 100);

  // Asset-specific weighting profiles
  const isThermalAsset = machine.visualKind === "boiler" || machine.category.toLowerCase().includes("oven") || machine.category.toLowerCase().includes("kiln");
  const isPressurizedAsset = thresholds.hasPressure;

  const wVib = isThermalAsset ? 0.22 : 0.38;
  const wTemp = isThermalAsset ? 0.42 : 0.28;
  const wPower = 0.18;
  const wRpm = 0.10;
  const wSecondary = isPressurizedAsset || thresholds.hasTorque ? 0.12 : 0;

  const vibScore = clamp(fv.vibDeltaRatio * 100, 0, 130);
  const tempScore = clamp(fv.tempDeltaRatio * 100, 0, 130);
  const powerScore = clamp(fv.powerDeltaRatio * 100, 0, 130);
  const rpmScore = clamp(fv.rpmDeviationRatio * 80, 0, 110);

  let secondaryScore = 0;
  let secondaryDeltaPct = 0;
  let secondaryLabel = "";

  if (thresholds.hasPressure && typeof machine.pressureBar === "number" && thresholds.pressureNominal && thresholds.pressureMax) {
    const pRange = Math.max(0.5, thresholds.pressureMax - thresholds.pressureNominal);
    secondaryScore = clamp(((machine.pressureBar - thresholds.pressureNominal) / pRange) * 100, 0, 120);
    secondaryDeltaPct = Math.round(((machine.pressureBar - thresholds.pressureNominal) / thresholds.pressureNominal) * 100);
    secondaryLabel = "Operating Pressure";
  } else if (thresholds.hasTorque && typeof machine.torqueNm === "number" && thresholds.torqueNominal && thresholds.torqueMax) {
    const tRange = Math.max(5, thresholds.torqueMax - thresholds.torqueNominal);
    secondaryScore = clamp(((machine.torqueNm - thresholds.torqueNominal) / tRange) * 100, 0, 120);
    secondaryDeltaPct = Math.round(((machine.torqueNm - thresholds.torqueNominal) / thresholds.torqueNominal) * 100);
    secondaryLabel = "Shaft Torque";
  }

  // Add trend momentum penalty when temperature or vibration are actively climbing
  const trendPenalty =
    (fv.vibTrendSlope > 0.12 ? 8 : 0) +
    (fv.tempTrendSlope > 0.8 ? 8 : 0) +
    (machine.operatingHours > 9000 ? 4 : 0);

  const rawRisk =
    vibScore * wVib +
    tempScore * wTemp +
    powerScore * wPower +
    rpmScore * wRpm +
    secondaryScore * wSecondary +
    trendPenalty;

  const riskScore = Math.round(clamp(rawRisk, 4, 98));
  const healthScore = Math.round(clamp(100 - riskScore * 0.94, 5, 99));

  let healthBand: MachinePrediction["healthBand"] = "Excellent";
  if (healthScore < 25) healthBand = "Severe";
  else if (healthScore < 50) healthBand = "Critical";
  else if (healthScore < 75) healthBand = "Warning";
  else if (healthScore < 90) healthBand = "Good";

  let riskLevel: RiskLevel = "Low Risk";
  if (riskScore >= 72) riskLevel = "Critical Risk";
  else if (riskScore >= 50) riskLevel = "High Risk";
  else if (riskScore >= 28) riskLevel = "Moderate Risk";

  const derivedStatus: OperationalStatus =
    riskLevel === "Critical Risk"
      ? "Critical"
      : riskLevel === "High Risk" || riskLevel === "Moderate Risk"
      ? "Warning"
      : "Operational";

  const factors: ContributingFactor[] = [
    {
      metric: "Vibration",
      deltaPct: vibDeltaPct,
      weight: Math.round(wVib * 100),
      summary:
        vibDeltaPct > 25
          ? `Vibration is ${vibDeltaPct}% above baseline (${machine.vibration.toFixed(2)} vs ${thresholds.vibrationNominal} mm/s; rolling avg ${vibAvg.toFixed(2)}).`
          : `Vibration remains near nominal baseline (${machine.vibration.toFixed(2)} mm/s).`,
    },
    {
      metric: "Temperature",
      deltaPct: tempDeltaPct,
      weight: Math.round(wTemp * 100),
      summary:
        tempDeltaPct > 15
          ? `Temperature elevated +${tempDeltaPct}% over nominal (${machine.temperature.toFixed(1)}°C vs ${thresholds.tempNominal}°C; moving avg ${tempAvg.toFixed(1)}°C).`
          : `Thermal profile stable (${machine.temperature.toFixed(1)}°C).`,
    },
    {
      metric: "Power Draw",
      deltaPct: powerDeltaPct,
      weight: Math.round(wPower * 100),
      summary:
        powerDeltaPct > 18
          ? `Current / power consumption +${powerDeltaPct}% above expected load (${machine.powerKw.toFixed(1)} kW).`
          : `Power draw within nominal band (${machine.powerKw.toFixed(1)} kW).`,
    },
    {
      metric: "RPM Stability",
      deltaPct: rpmDeltaPct,
      weight: Math.round(wRpm * 100),
      summary:
        Math.abs(rpmDeltaPct) > 8
          ? `Speed variance of ${rpmDeltaPct > 0 ? "+" : ""}${rpmDeltaPct}% from rated ${thresholds.rpmNominal} RPM.`
          : `Rotational speed steady at ${Math.round(machine.rpm)} RPM.`,
    },
  ];

  if (secondaryLabel) {
    factors.push({
      metric: secondaryLabel,
      deltaPct: secondaryDeltaPct,
      weight: Math.round(wSecondary * 100),
      summary:
        secondaryDeltaPct > 18
          ? `${secondaryLabel} elevated +${secondaryDeltaPct}% above nominal setpoint.`
          : `${secondaryLabel} within normal operating envelope.`,
    });
  }

  // Sort by highest absolute impact
  factors.sort((a, b) => Math.abs(b.deltaPct) * b.weight - Math.abs(a.deltaPct) * a.weight);

  let predictedFailureCategory = "Nominal Operation — No Active Fault Signature";
  let recommendedAction = "Continue routine telemetry monitoring and scheduled preventive checks.";
  let recommendedInspectionWindow = "Next planned weekly PM cycle";
  let operationalConsequence = "Minimal operational risk under current operating parameters.";

  if (riskLevel !== "Low Risk") {
    if (vibDeltaPct >= tempDeltaPct && vibDeltaPct > 22) {
      predictedFailureCategory =
        machine.visualKind === "pump"
          ? "Impeller Imbalance / Mechanical Seal Wear"
          : "Bearing Degradation & Shaft Misalignment Risk";
      recommendedAction =
        "Inspect drive bearings, check shaft laser alignment, and verify lubrication film integrity.";
      recommendedInspectionWindow =
        riskLevel === "Critical Risk" ? "Immediate inspection recommended (current shift)" : "Schedule inspection within 24–48 hours";
      operationalConsequence =
        "Continued operation under elevated vibration may accelerate bearing spalling and force an unplanned line stoppage.";
    } else if (tempDeltaPct > 18) {
      predictedFailureCategory = isThermalAsset
        ? "Refractory / Thermal Control Overshoot Risk"
        : "Stator Winding Thermal Stress / Cooling Fouling";
      recommendedAction =
        "Clean cooling fins/exchangers, verify coolant or airflow rate, and inspect thermal relays.";
      recommendedInspectionWindow =
        riskLevel === "Critical Risk" ? "Immediate inspection recommended (current shift)" : "Schedule inspection within 24–48 hours";
      operationalConsequence =
        "Sustained thermal overshoot increases insulation degradation risk and reduces production consistency.";
    } else if (powerDeltaPct > 20) {
      predictedFailureCategory = "Electrical Load Anomaly / Mechanical Friction Drag";
      recommendedAction =
        "Check phase current balance, drive VFD parameters, and downstream mechanical friction.";
      recommendedInspectionWindow = "Inspect during next shift changeover";
      operationalConsequence =
        "Elevated current draw raises energy cost per unit and risks overload trip during peak production.";
    } else {
      predictedFailureCategory = "Multi-Parameter Drift — Early Wear Signature";
      recommendedAction =
        "Perform diagnostic walkaround, check fasteners, sensor calibration, and baseline load profile.";
      recommendedInspectionWindow = "Within 3–5 days";
      operationalConsequence =
        "Early-stage drift may compound across connected downstream line assets if left unchecked.";
    }
  }

  const confidenceNote =
    history.length >= 10
      ? "Telemetry confidence: High (rolling window + asset-specific thresholds calibrated)."
      : "Telemetry confidence: Preliminary (short telemetry window; collecting extended baseline).";

  return {
    derivedStatus,
    prediction: {
      healthScore,
      healthBand,
      riskScore,
      riskLevel,
      predictedFailureCategory,
      confidenceNote,
      recommendedInspectionWindow,
      recommendedAction,
      operationalConsequence,
      contributingFactors: factors,
    },
  };
}
