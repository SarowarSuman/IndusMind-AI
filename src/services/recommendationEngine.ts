import { FactoryEnvironment, WeatherScenarioState } from "../types/industrial";

export interface SmartRecommendation {
  id: string;
  issue: string;
  whyItMatters: string;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  recommendedAction: string;
  expectedBenefit: string;
  priority: "High" | "Medium" | "Low";
  targetRef: string;
  actionType: "maintenance" | "supply" | "production" | "weather";
  machineId?: string;
}

export function generateRecommendations(
  factory: FactoryEnvironment,
  weather: WeatherScenarioState
): SmartRecommendation[] {
  const recs: SmartRecommendation[] = [];

  // 1. Machine risk recommendations
  const atRiskMachines = [...factory.machines]
    .filter((m) => m.prediction.riskLevel !== "Low Risk")
    .sort((a, b) => b.prediction.riskScore - a.prediction.riskScore);

  for (const m of atRiskMachines.slice(0, 3)) {
    const topFactor = m.prediction.contributingFactors[0];
    recs.push({
      id: `rec-m-${m.id}`,
      issue: `${m.name} (${m.id}) — ${m.prediction.predictedFailureCategory}`,
      whyItMatters: topFactor ? topFactor.summary : m.prediction.operationalConsequence,
      riskLevel: m.prediction.riskLevel === "Critical Risk" ? "Critical" : m.prediction.riskLevel === "High Risk" ? "High" : "Medium",
      recommendedAction: m.prediction.recommendedAction,
      expectedBenefit: "Potentially reduce unplanned line stoppage risk and extend rotating component service life.",
      priority: m.prediction.riskLevel === "Critical Risk" ? "High" : "Medium",
      targetRef: m.id,
      actionType: "maintenance",
      machineId: m.id,
    });
  }

  // 2. Inventory & supplier recommendations
  for (const mat of factory.materials) {
    const daysLeft = mat.currentInventory / Math.max(1, mat.dailyConsumption);
    if (mat.currentInventory <= mat.reorderThreshold || daysLeft < 4.5) {
      recs.push({
        id: `rec-mat-${mat.id}`,
        issue: `${mat.name} inventory approaching reorder threshold (${daysLeft.toFixed(1)} days remaining)`,
        whyItMatters: `Current stock (${mat.currentInventory.toLocaleString()} ${mat.unit}) may fall below safety buffer if incoming delivery slips.`,
        riskLevel: daysLeft < 2.5 ? "Critical" : "High",
        recommendedAction: "Trigger safety reorder immediately and confirm transit status with backup vendor.",
        expectedBenefit: "Helps maintain continuous line feed and lowers stockout stoppage probability.",
        priority: "High",
        targetRef: mat.name,
        actionType: "supply",
      });
    }
  }

  if (factory.supplyDisruption.supplierDelayDays > 0 || factory.supplyDisruption.portCongestion) {
    recs.push({
      id: `rec-sup-delay`,
      issue: `Inbound supply chain delay active (+${factory.supplyDisruption.supplierDelayDays}d lead-time impact)`,
      whyItMatters: "Delayed raw material arrivals threaten shift attainment on primary production lines.",
      riskLevel: factory.supplyDisruption.supplierDelayDays >= 3 ? "Critical" : "High",
      recommendedAction: "Prioritize high-margin orders using existing stock and activate secondary local supplier.",
      expectedBenefit: "Mitigates schedule slippage and protects export delivery commitments.",
      priority: "High",
      targetRef: "Supply Network",
      actionType: "supply",
    });
  }

  // 3. Weather impact recommendations
  if (weather.simulatedHazard !== "None" || (weather.liveData && weather.liveData.current.rainMm > 5)) {
    const hazardLabel =
      weather.simulatedHazard !== "None" ? weather.simulatedHazard : "Elevated Rainfall";
    recs.push({
      id: `rec-wx`,
      issue: `${hazardLabel} operational risk detected for ${weather.liveData?.location || factory.location}`,
      whyItMatters:
        hazardLabel === "Extreme Heat"
          ? "Elevated ambient temperature increases cooling demand and thermal stress on drive motors."
          : "Surface transport and inbound logistics corridors may experience slower turnaround times.",
      riskLevel: hazardLabel === "Flood Scenario" ? "Critical" : "High",
      recommendedAction:
        hazardLabel === "Extreme Heat"
          ? "Check chiller capacity, clean HVAC/motor ventilation intakes, and stagger peak thermal loads."
          : "Pre-stage 48-hour raw material buffer onsite and inspect warehouse drainage & dock seals.",
      expectedBenefit: "Improves operational continuity during regional weather disruptions.",
      priority: "High",
      targetRef: weather.liveData?.location || factory.location,
      actionType: "weather",
    });
  }

  // 4. Production bottleneck recommendations
  const degradedLine = factory.lines.find((l) => l.status === "Bottleneck" || l.efficiencyPct < 82);
  if (degradedLine) {
    recs.push({
      id: `rec-prod-${degradedLine.id}`,
      issue: `${degradedLine.name} operating at ${degradedLine.efficiencyPct}% efficiency`,
      whyItMatters: `Output (${degradedLine.actualUnits.toLocaleString()}) is trailing target (${degradedLine.targetUnits.toLocaleString()}) on ${degradedLine.shift}.`,
      riskLevel: degradedLine.efficiencyPct < 70 ? "High" : "Medium",
      recommendedAction: "Rebalance shift workload across parallel equipment and schedule PM window during off-peak hours.",
      expectedBenefit: "Supports higher plan attainment while avoiding maintenance-production conflicts.",
      priority: "Medium",
      targetRef: degradedLine.name,
      actionType: "production",
    });
  }

  if (recs.length === 0) {
    recs.push({
      id: "rec-nominal",
      issue: "All monitored lines and assets operating within nominal thresholds",
      whyItMatters: "Preventive maintenance and buffer inventory levels are currently aligned with daily targets.",
      riskLevel: "Low",
      recommendedAction: "Maintain current PM cadence and monitor vibration/thermal baselines across shifts.",
      expectedBenefit: "Sustains predictable plant availability and steady production throughput.",
      priority: "Low",
      targetRef: factory.name,
      actionType: "production",
    });
  }

  return recs;
}
