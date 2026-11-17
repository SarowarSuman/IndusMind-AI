import { FactoryEnvironment, WeatherScenarioState } from "../types/industrial";

export function buildCopilotContextPayload(
  factory: FactoryEnvironment,
  weather: WeatherScenarioState,
  industryName: string
) {
  return {
    facility: factory.name,
    location: factory.location,
    industry: industryName,
    machines: factory.machines.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      status: m.status,
      healthScore: m.prediction.healthScore,
      riskLevel: m.prediction.riskLevel,
      riskScore: m.prediction.riskScore,
      temperatureC: Number(m.temperature.toFixed(1)),
      vibrationMmS: Number(m.vibration.toFixed(2)),
      powerKw: Number(m.powerKw.toFixed(1)),
      rpm: Math.round(m.rpm),
      predictedFailureCategory: m.prediction.predictedFailureCategory,
      topFactor: m.prediction.contributingFactors[0]?.summary,
      recommendedAction: m.prediction.recommendedAction,
    })),
    productionLines: factory.lines.map((l) => ({
      name: l.name,
      status: l.status,
      efficiencyPct: l.efficiencyPct,
      targetUnits: l.targetUnits,
      actualUnits: l.actualUnits,
    })),
    activeAlerts: factory.alerts
      .filter((a) => !a.resolved)
      .slice(0, 6)
      .map((a) => ({
        priority: a.priority,
        category: a.category,
        title: a.title,
        message: a.message,
      })),
    materials: factory.materials.map((mat) => ({
      name: mat.name,
      currentInventory: mat.currentInventory,
      unit: mat.unit,
      daysRemaining: Number((mat.currentInventory / Math.max(1, mat.dailyConsumption)).toFixed(1)),
      reorderThreshold: mat.reorderThreshold,
    })),
    supplyDisruption: factory.supplyDisruption,
    weather: {
      location: weather.liveData?.location || factory.location,
      activeCondition: weather.simulatedHazard,
      temperatureC: weather.liveData?.current.temperatureC,
      rainMm: weather.liveData?.current.rainMm,
    },
  };
}

export function generateDeterministicCopilotResponse(
  question: string,
  factory: FactoryEnvironment,
  weather: WeatherScenarioState,
  industryName: string
): string {
  const q = question.toLowerCase().trim();
  const isBanglish =
    /\b(kemon|ki|kothay|kharap|bhalo|valobhabe|kivabe|keno|kon|korbo|ajke|machin|khub|somossa|rodh|bachabo)\b/i.test(
      q
    );

  const sortedByRisk = [...factory.machines].sort(
    (a, b) => b.prediction.riskScore - a.prediction.riskScore
  );
  const topMachine = sortedByRisk[0];
  const criticalMachines = factory.machines.filter(
    (m) => m.prediction.riskLevel === "Critical Risk" || m.prediction.riskLevel === "High Risk"
  );
  const avgHealth = Math.round(
    factory.machines.reduce((s, m) => s + m.prediction.healthScore, 0) /
      Math.max(1, factory.machines.length)
  );
  const openAlerts = factory.alerts.filter((a) => !a.resolved);
  const lowestMat = [...factory.materials].sort(
    (a, b) =>
      a.currentInventory / Math.max(1, a.dailyConsumption) -
      b.currentInventory / Math.max(1, b.dailyConsumption)
  )[0];
  const bottleneckLine = [...factory.lines].sort((a, b) => a.efficiencyPct - b.efficiencyPct)[0];
  const pendingTasks = factory.maintenanceTasks.filter(
    (t) => t.status === "Scheduled" || t.status === "Overdue" || t.status === "In Progress"
  );

  // Greeting / small talk
  if (/^(hi|hello|hey|assalamu|salam|kemon acho|how are you)/i.test(q)) {
    return `Sphere Copilot Active — ${factory.name} (${industryName})

- Fleet Health Average: ${avgHealth}% across ${factory.machines.length} machines
- Priority Watch: ${topMachine.name} (${topMachine.id}) at ${topMachine.prediction.healthScore}% health (${topMachine.prediction.riskLevel})
- Active Alerts: ${openAlerts.length} · Pending Tasks: ${pendingTasks.length}

Ask me anything in English or Banglish—e.g. "Which machine needs attention?", "Kon machine kharap?", "How to prevent delivery delay?", or "Accident safety status".`;
  }

  // Specific machine mention (e.g., M-01..M-06, Motor-03, Boiler, Pump, Conveyor, Robot)
  const mentionedMachine = factory.machines.find(
    (m) =>
      q.includes(m.id.toLowerCase()) ||
      q.includes(m.name.toLowerCase()) ||
      (q.includes("motor-03") && m.id.toLowerCase().includes("m-03")) ||
      (q.includes("motor 03") && m.id.toLowerCase().includes("m-03")) ||
      m.category.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w))
  );

  if (mentionedMachine) {
    const factors = mentionedMachine.prediction.contributingFactors
      .slice(0, 3)
      .map((f) => `- ${f.metric}: ${f.summary}`)
      .join("\n");
    return `Live Asset Diagnostics — ${mentionedMachine.name} (${mentionedMachine.id}) at ${factory.name}:

- Health Score: ${mentionedMachine.prediction.healthScore}% (${mentionedMachine.prediction.healthBand}) · Risk: ${mentionedMachine.prediction.riskLevel} (${mentionedMachine.prediction.riskScore}/100)
- Live Sensors: ${mentionedMachine.temperature.toFixed(1)}°C · ${mentionedMachine.vibration.toFixed(2)} mm/s · ${mentionedMachine.powerKw.toFixed(1)} kW · ${Math.round(mentionedMachine.rpm)} RPM
- Detected Pattern: ${mentionedMachine.prediction.predictedFailureCategory}

Key Telemetry Signals:
${factors}

Preventive Action (${mentionedMachine.prediction.recommendedInspectionWindow}):
${mentionedMachine.prediction.recommendedAction}`;
  }

  // Safety / Accident prevention
  if (q.includes("accident") || q.includes("safety") || q.includes("damage") || q.includes("khoti") || q.includes("hazard")) {
    const highRiskList =
      criticalMachines.length > 0
        ? criticalMachines
            .map(
              (m) =>
                `- ${m.name} (${m.id}): ${m.prediction.riskLevel} (${m.temperature.toFixed(1)}°C, ${m.vibration.toFixed(2)} mm/s) -> ${m.prediction.recommendedAction}`
            )
            .join("\n")
        : "- All monitored assets are operating inside safe thermal and mechanical bounds.";

    return `Zero-Accident & Equipment Protection Report (${factory.name}):

${highRiskList}

Safety Interlock Protocol:
1. Dispatch lock-out/tag-out (LOTO) inspection on ${topMachine.id} within ${topMachine.prediction.recommendedInspectionWindow}.
2. Keep Live Sensor Stream active so thermal spikes trigger instant shift alerts before mechanical failure.`;
  }

  // Vibration / Thermal
  if (q.includes("vibration") || q.includes("temp") || q.includes("heat") || q.includes("garom")) {
    const vibMachines = [...factory.machines].sort(
      (a, b) =>
        b.vibration / b.thresholds.vibrationNominal -
        a.vibration / a.thresholds.vibrationNominal
    );
    const list = vibMachines
      .slice(0, 4)
      .map((m) => {
        const pct = Math.round(
          ((m.vibration - m.thresholds.vibrationNominal) /
            Math.max(0.1, m.thresholds.vibrationNominal)) *
            100
        );
        return `- ${m.name} (${m.id}): ${m.vibration.toFixed(2)} mm/s (${pct >= 0 ? "+" : ""}${pct}% vs nominal) · ${m.temperature.toFixed(1)}°C · Health ${m.prediction.healthScore}%`;
      })
      .join("\n");
    return `Live Vibration & Thermal Ranking — ${factory.name}:\n\n${list}\n\nNext Step: Schedule bearing, shaft alignment, and lubrication checks on ${vibMachines[0].id} via Maintenance Planner.`;
  }

  // Supplier / Inventory / Delivery Delay
  if (
    q.includes("supplier") ||
    q.includes("inventory") ||
    q.includes("supply") ||
    q.includes("material") ||
    q.includes("delay") ||
    q.includes("delivery") ||
    q.includes("stock")
  ) {
    const matList = factory.materials
      .map((m) => {
        const days = (m.currentInventory / Math.max(1, m.dailyConsumption)).toFixed(1);
        return `- ${m.name}: ${m.currentInventory.toLocaleString()} ${m.unit} (~${days} days runway, reorder threshold ${m.reorderThreshold.toLocaleString()})`;
      })
      .join("\n");
    const delayedSuppliers = factory.suppliers.filter(
      (s) => s.shipmentStatus === "Delayed" || s.shipmentStatus === "At Risk"
    );
    return `Supply Chain & On-Time Delivery Status (${factory.name}):

- Transit Delay Offset: +${factory.supplyDisruption.supplierDelayDays} days
- Port Congestion: ${factory.supplyDisruption.portCongestion ? "Active" : "Clear"} · Road Corridor: ${factory.supplyDisruption.roadDisruption ? "Congested" : "Clear"}
- Flagged Suppliers: ${delayedSuppliers.length > 0 ? delayedSuppliers.map((s) => `${s.name} (${s.shipmentStatus})`).join(", ") : "All shipments on schedule"}

Material Buffers:
${matList}

Zero-Delay Action Plan:
${
  lowestMat
    ? `Trigger immediate replenishment for ${lowestMat.name} (${(lowestMat.currentInventory / Math.max(1, lowestMat.dailyConsumption)).toFixed(1)} days remaining) and route incoming stock to ${bottleneckLine?.name || "primary line"}.`
    : "Maintain scheduled reorder cadence."
}`;
  }

  // Production / Bottleneck / Slowdown
  if (
    q.includes("production") ||
    q.includes("slowdown") ||
    q.includes("bottleneck") ||
    q.includes("line") ||
    q.includes("downtime") ||
    q.includes("output")
  ) {
    const lineSummary = factory.lines
      .map(
        (l) =>
          `- ${l.name} (${l.status}): ${l.actualUnits.toLocaleString()} / ${l.targetUnits.toLocaleString()} (${l.efficiencyPct}% efficiency)`
      )
      .join("\n");
    return `Production Intelligence Live Status (${industryName}):

${lineSummary}

Bottleneck Focus:
${bottleneckLine ? `${bottleneckLine.name} is operating at ${bottleneckLine.efficiencyPct}% (${bottleneckLine.status}).` : "All lines balanced."}
${
  criticalMachines.length > 0
    ? `At-Risk Assets: ${criticalMachines.map((m) => `${m.id} (${m.prediction.healthScore}%)`).join(", ")} should be inspected during shift handover.`
    : "All line machinery operating within target tolerances."
}

Recommended Action: Rebalance priority batches onto highest-efficiency lines and clear ${topMachine.id} maintenance ticket.`;
  }

  // Weather
  if (q.includes("weather") || q.includes("rain") || q.includes("flood") || q.includes("bristi") || q.includes("storm")) {
    const loc = weather.liveData?.location || factory.location;
    return `Weather & Logistics Telemetry (${loc}):

- Current Conditions: ${weather.liveData?.current.temperatureC ?? 31.5}°C · Humidity ${weather.liveData?.current.humidityPct ?? 76}% · Rain ${weather.liveData?.current.rainMm ?? 0} mm · Wind ${weather.liveData?.current.windKmh ?? 12} km/h
- Corridor Status: ${weather.simulatedHazard}
- Operational Guidance: ${
      weather.simulatedHazard === "None"
        ? "Regional transport corridors clear. Continue normal inbound dispatch monitoring."
        : `${weather.simulatedHazard} active — allocate +24h buffer for highway transit and monitor chiller/motor thermal headroom.`
    }`;
  }

  // Maintenance / Attention / Banglish troubleshooting
  if (
    q.includes("maintenance") ||
    q.includes("prioritize") ||
    q.includes("attention") ||
    q.includes("immediate") ||
    isBanglish ||
    q.includes("fix") ||
    q.includes("problem") ||
    q.includes("issue")
  ) {
    return `Real-Time Action Plan — ${factory.name} (${industryName}):

1. Immediate Asset Priority: ${topMachine.name} (${topMachine.id})
   - Health: ${topMachine.prediction.healthScore}% · Risk: ${topMachine.prediction.riskLevel}
   - Issue: ${topMachine.prediction.predictedFailureCategory}
   - Fix: ${topMachine.prediction.recommendedAction}

2. Production & Delivery Safeguard:
   - Bottleneck Line: ${bottleneckLine ? `${bottleneckLine.name} at ${bottleneckLine.efficiencyPct}%` : "Balanced"}
   - Tightest Buffer: ${lowestMat ? `${lowestMat.name} (${(lowestMat.currentInventory / Math.max(1, lowestMat.dailyConsumption)).toFixed(1)} days)` : "Healthy"}

3. Open Alerts (${openAlerts.length}) & Pending Repairs (${pendingTasks.length}):
   - ${openAlerts[0] ? `Top Alert: ${openAlerts[0].title}` : "No critical unresolved alerts."}
   - Open Maintenance Planner to complete repairs and restore ${topMachine.id} health to nominal.`;
  }

  // Default comprehensive live briefing tailored to the user's question
  return `Live Plant Briefing — ${factory.name} (${industryName})
Query: "${question}"

- Fleet Health Average: ${avgHealth}% across ${factory.machines.length} live assets
- Highest-Risk Asset: ${topMachine.name} (${topMachine.id}) at ${topMachine.prediction.healthScore}% health (${topMachine.prediction.riskLevel})
- Production Status: ${bottleneckLine ? `${bottleneckLine.name} at ${bottleneckLine.efficiencyPct}% efficiency (${bottleneckLine.status})` : "All lines running"}
- Supply Runway: ${lowestMat ? `${lowestMat.name} has ~${(lowestMat.currentInventory / Math.max(1, lowestMat.dailyConsumption)).toFixed(1)} days remaining` : "Nominal"}
- Weather (${weather.liveData?.location ?? factory.location}): ${weather.liveData?.current.temperatureC ?? 31}°C, Condition: ${weather.simulatedHazard}

Recommended Next Action:
${topMachine.prediction.riskLevel !== "Low Risk" ? `Inspect ${topMachine.id} (${topMachine.prediction.recommendedInspectionWindow}): ${topMachine.prediction.recommendedAction}` : "All systems operating cleanly within predictive safety bounds."}`;
}
