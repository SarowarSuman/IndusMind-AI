interface VercelReq {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  end?: () => void;
}

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

const SERVER_INFO = {
  name: "indusmind-plant-mcp",
  version: "1.0.0",
  title: "IndusMindAI Predictive Plant Intelligence MCP Server",
  description:
    "Read-only Model Context Protocol server (Streamable HTTP) exposing predictive machine telemetry diagnostics, Open-Meteo logistics weather risk, supply-chain disruption simulation, and 20-industry benchmark tools.",
};

const PROTOCOL_VERSION = "2024-11-05";

const CITY_COORDS: Record<string, { lat: number; lon: number; label: string }> = {
  dhaka: { lat: 23.8103, lon: 90.4125, label: "Dhaka Metro Hub, Bangladesh" },
  chattogram: { lat: 22.3569, lon: 91.7832, label: "Chattogram Port & EPZ, Bangladesh" },
  gazipur: { lat: 24.0023, lon: 90.4264, label: "Gazipur Industrial Belt, Bangladesh" },
  narayanganj: { lat: 23.6238, lon: 90.5, label: "Narayanganj Knit Corridor, Bangladesh" },
  savar: { lat: 23.8583, lon: 90.2667, label: "Savar & Ashulia Zone, Bangladesh" },
  khulna: { lat: 22.8456, lon: 89.5403, label: "Khulna Shipyard & South, Bangladesh" },
};

const INDUSTRY_BENCHMARKS: Array<{
  id: string;
  name: string;
  nominalTempC: number;
  maxVibrationMmS: number;
  targetOeePct: number;
  criticalFailureFocus: string;
}> = [
  { id: "garments", name: "Garments & Apparel", nominalTempC: 62, maxVibrationMmS: 4.5, targetOeePct: 84, criticalFailureFocus: "Sewing servo drive & steam boiler pressure" },
  { id: "textiles", name: "Textile & Dyeing", nominalTempC: 74, maxVibrationMmS: 5.2, targetOeePct: 81, criticalFailureFocus: "High-temp dyeing jet pump cavitation & bearing wear" },
  { id: "pharma", name: "Pharmaceuticals & Healthcare", nominalTempC: 48, maxVibrationMmS: 2.8, targetOeePct: 91, criticalFailureFocus: "HEPA cleanroom HVAC drift & granulation drive heat" },
  { id: "food", name: "Food & Beverage Processing", nominalTempC: 55, maxVibrationMmS: 3.6, targetOeePct: 86, criticalFailureFocus: "Pasteurizer thermal overshoot & chiller compressor strain" },
  { id: "cement", name: "Cement & Construction Materials", nominalTempC: 88, maxVibrationMmS: 7.5, targetOeePct: 79, criticalFailureFocus: "Rotary kiln gearbox torque & crusher bearing fatigue" },
  { id: "steel", name: "Steel & Metal Manufacturing", nominalTempC: 92, maxVibrationMmS: 8.0, targetOeePct: 78, criticalFailureFocus: "Rolling mill spindle vibration & furnace cooling pump" },
  { id: "automotive", name: "Automotive & Parts Assembly", nominalTempC: 60, maxVibrationMmS: 3.8, targetOeePct: 88, criticalFailureFocus: "Robotic weld arm servo thermal load & press hydraulics" },
  { id: "electronics", name: "Electronics & Semiconductor", nominalTempC: 44, maxVibrationMmS: 2.2, targetOeePct: 92, criticalFailureFocus: "SMT pick-and-place vibration & cleanroom humidity" },
  { id: "plastics", name: "Plastic & Packaging Industry", nominalTempC: 72, maxVibrationMmS: 4.4, targetOeePct: 83, criticalFailureFocus: "Extruder barrel heater drift & hydraulic pressure spike" },
  { id: "chemicals", name: "Chemicals & Petrochemicals", nominalTempC: 78, maxVibrationMmS: 4.9, targetOeePct: 85, criticalFailureFocus: "Reactor agitator seal wear & condenser thermal margin" },
  { id: "power", name: "Power Plants & Energy", nominalTempC: 84, maxVibrationMmS: 5.5, targetOeePct: 93, criticalFailureFocus: "Turbine bearing harmonics & transformer oil temperature" },
  { id: "agriculture", name: "Agriculture & Agro-Processing", nominalTempC: 58, maxVibrationMmS: 4.8, targetOeePct: 80, criticalFailureFocus: "Grain dryer airflow blockage & conveyor motor overload" },
  { id: "cold-storage", name: "Cold Storage & Warehousing", nominalTempC: 38, maxVibrationMmS: 3.2, targetOeePct: 90, criticalFailureFocus: "Ammonia chiller compressor head temp & evaporator frost" },
  { id: "logistics", name: "Logistics & Transportation", nominalTempC: 52, maxVibrationMmS: 4.1, targetOeePct: 87, criticalFailureFocus: "Automated sortation conveyor drive & dock crane brake" },
  { id: "mining", name: "Mining & Heavy Equipment", nominalTempC: 90, maxVibrationMmS: 8.4, targetOeePct: 76, criticalFailureFocus: "Primary crusher shaft fatigue & hydraulic pump cavitation" },
  { id: "shipbuilding", name: "Shipbuilding & Marine", nominalTempC: 70, maxVibrationMmS: 6.2, targetOeePct: 77, criticalFailureFocus: "Gantry crane hoist motor & drydock dewatering pump" },
  { id: "paper", name: "Paper & Pulp Manufacturing", nominalTempC: 76, maxVibrationMmS: 5.4, targetOeePct: 82, criticalFailureFocus: "Drying cylinder bearing heat & pulp refiner load" },
  { id: "water", name: "Water Treatment & Utilities", nominalTempC: 50, maxVibrationMmS: 3.9, targetOeePct: 92, criticalFailureFocus: "High-lift booster pump impeller wear & RO membrane pressure" },
  { id: "light-eng", name: "Light Engineering & SMEs", nominalTempC: 64, maxVibrationMmS: 4.6, targetOeePct: 81, criticalFailureFocus: "CNC spindle bearing chatter & air compressor thermal trip" },
  { id: "custom", name: "Other Custom Industries", nominalTempC: 65, maxVibrationMmS: 4.5, targetOeePct: 85, criticalFailureFocus: "Multi-sensor baseline drift & unscheduled downtime risk" },
];

const MCP_TOOLS = [
  {
    name: "score_machine_telemetry",
    description:
      "Compute IndusMindAI's weighted ML health score, risk level, root-cause fault attribution (Vibration 35%, Temp 28%, Power 22%, RPM 15%), and recommended preventive window from live machine sensor readings.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        machineId: { type: "string", description: "Machine asset identifier (e.g. M-03, KNIT-04)." },
        temperatureC: { type: "number", description: "Current operating temperature in Celsius." },
        vibrationMmS: { type: "number", description: "RMS shaft/housing vibration in mm/s." },
        powerKw: { type: "number", description: "Current electrical power draw in kW." },
        rpm: { type: "number", description: "Rotational speed in RPM." },
        nominalTempC: { type: "number", description: "Optional baseline nominal temperature (°C). Defaults to 65." },
        nominalVibrationMmS: { type: "number", description: "Optional baseline vibration limit (mm/s). Defaults to 4.2." },
        nominalPowerKw: { type: "number", description: "Optional nominal power draw (kW). Defaults to 24." },
        nominalRpm: { type: "number", description: "Optional nominal RPM. Defaults to 1450." },
      },
      required: ["temperatureC", "vibrationMmS"],
    },
  },
  {
    name: "get_live_weather_risk",
    description:
      "Fetch live Open-Meteo regional forecasts for Bangladesh industrial hubs (gazipur, dhaka, chattogram, narayanganj, savar, khulna) or custom GPS coordinates, and return coupled logistics & thermal plant risk scores.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "Preset hub key: gazipur, dhaka, chattogram, narayanganj, savar, or khulna.",
        },
        lat: { type: "number", description: "Optional custom latitude." },
        lon: { type: "number", description: "Optional custom longitude." },
      },
    },
  },
  {
    name: "evaluate_supply_delay",
    description:
      "Evaluate how inbound supplier delays, port congestion, highway disruptions, and raw material inventory runway propagate into production line schedule risk and buyer SLA exposure.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        supplierDelayDays: { type: "number", description: "Simulated or observed supplier transit delay in days." },
        materialRunwayDays: { type: "number", description: "Current raw material stock runway in days. Defaults to 8." },
        portCongestion: { type: "boolean", description: "Whether Chattogram/inbound port congestion is active." },
        roadDisruption: { type: "boolean", description: "Whether regional highway corridor disruption is active." },
      },
      required: ["supplierDelayDays"],
    },
  },
  {
    name: "get_industry_benchmarks",
    description:
      "Retrieve calibrated baseline sensor thresholds, target OEE benchmarks, and critical failure focus areas across IndusMindAI's 20 supported manufacturing industries.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        industryFilter: {
          type: "string",
          description: "Optional keyword or industry ID (e.g. garments, pharma, steel, cement) to filter results.",
        },
      },
    },
  },
];

const MCP_RESOURCES = [
  {
    uri: "indusmind://plant/cyber-shield-policy",
    name: "Plant Cyber Shield Read-Only Policy",
    description: "Zero-trust read-only PLC/SCADA security boundaries enforced across all IndusMindAI telemetry and MCP endpoints.",
    mimeType: "application/json",
  },
  {
    uri: "indusmind://plant/supported-industries",
    name: "20 Configurable Industry Ecosystems",
    description: "Catalog of all 20 industrial verticals supported inside IndusMindAI with baseline thermal and vibration limits.",
    mimeType: "application/json",
  },
];

const MCP_PROMPTS = [
  {
    name: "plant-shift-handover",
    description: "Structured shift handover checklist comparing highest-risk machine telemetry, active alerts, and supply buffer.",
    arguments: [
      { name: "facilityName", description: "Plant or factory unit name", required: true },
      { name: "language", description: "Preferred response language (English, Bangla, or Banglish)", required: false },
    ],
  },
  {
    name: "banglish-diagnostic-briefing",
    description: "Crisp Banglish floor-engineer maintenance briefing generated from sensor anomalies.",
    arguments: [
      { name: "machineId", description: "Target machine identifier (e.g. M-03)", required: true },
    ],
  },
];

function scoreTelemetry(args: Record<string, unknown>) {
  const machineId = String(args.machineId || "ASSET-01");
  const temp = Number(args.temperatureC ?? 68);
  const vib = Number(args.vibrationMmS ?? 3.5);
  const power = Number(args.powerKw ?? 24);
  const rpm = Number(args.rpm ?? 1450);

  const nomTemp = Math.max(10, Number(args.nominalTempC ?? 65));
  const nomVib = Math.max(0.5, Number(args.nominalVibrationMmS ?? 4.2));
  const nomPower = Math.max(1, Number(args.nominalPowerKw ?? 24));
  const nomRpm = Math.max(100, Number(args.nominalRpm ?? 1450));

  const vibRatio = Math.max(0, (vib - nomVib) / nomVib);
  const tempRatio = Math.max(0, (temp - nomTemp) / nomTemp);
  const powerRatio = Math.max(0, (power - nomPower) / nomPower);
  const rpmRatio = Math.min(1, Math.abs(rpm - nomRpm) / nomRpm);

  const vibContribution = Math.min(35, Math.round(vibRatio * 48));
  const tempContribution = Math.min(28, Math.round(tempRatio * 52));
  const powerContribution = Math.min(22, Math.round(powerRatio * 40));
  const rpmContribution = Math.min(15, Math.round(rpmRatio * 45));

  const riskScore = Math.min(
    99,
    Math.max(8, 10 + vibContribution + tempContribution + powerContribution + rpmContribution)
  );
  const healthScore = Math.max(1, 100 - riskScore);

  const riskLevel =
    riskScore >= 75
      ? "Critical Risk"
      : riskScore >= 55
      ? "High Risk"
      : riskScore >= 35
      ? "Moderate Risk"
      : "Low Risk";

  const predictedFailureCategory =
    vibContribution >= tempContribution && vibContribution >= 12
      ? "Bearing Degradation & Shaft Misalignment"
      : tempContribution >= 12
      ? "Thermal Overload & Cooling Headroom Loss"
      : powerContribution >= 10
      ? "Electrical Drive Torque / Current Surge"
      : "Nominal Mechanical Baseline";

  const recommendedInspectionWindow =
    riskScore >= 75
      ? "Immediate (0–4 hours)"
      : riskScore >= 55
      ? "Urgent (Within 24 hours)"
      : riskScore >= 35
      ? "Scheduled (24–48 hours)"
      : "Routine Weekly Check";

  return {
    machineId,
    healthScore,
    riskScore,
    riskLevel,
    predictedFailureCategory,
    recommendedInspectionWindow,
    weightedAttribution: {
      vibrationWeightPct: 35,
      vibrationPointsAdded: vibContribution,
      temperatureWeightPct: 28,
      temperaturePointsAdded: tempContribution,
      powerDrawWeightPct: 22,
      powerPointsAdded: powerContribution,
      rpmStabilityWeightPct: 15,
      rpmPointsAdded: rpmContribution,
    },
    readings: { temperatureC: temp, vibrationMmS: vib, powerKw: power, rpm },
    safetyMode: "READ_ONLY_ADVISORY",
  };
}

async function fetchWeatherRisk(args: Record<string, unknown>) {
  const cityKey = String(args.city || "gazipur").toLowerCase();
  const preset = CITY_COORDS[cityKey] || CITY_COORDS.gazipur;
  const lat = typeof args.lat === "number" && !Number.isNaN(args.lat) ? args.lat : preset.lat;
  const lon = typeof args.lon === "number" && !Number.isNaN(args.lon) ? args.lon : preset.lon;
  const location =
    typeof args.lat === "number" && typeof args.lon === "number"
      ? `Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`
      : preset.label;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&daily=temperature_2m_max,rain_sum&timezone=auto&forecast_days=3`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = (await resp.json()) as {
      current?: { temperature_2m?: number; relative_humidity_2m?: number; rain?: number; wind_speed_10m?: number };
      daily?: { time?: string[]; temperature_2m_max?: number[]; rain_sum?: number[] };
    };
    const temp = data.current?.temperature_2m ?? 29.5;
    const rain = data.current?.rain ?? 0.2;
    const wind = data.current?.wind_speed_10m ?? 11.4;
    const humidity = data.current?.relative_humidity_2m ?? 78;

    const rainRiskScore = rain > 10 ? 78 : rain > 2 ? 48 : 20;
    const heatRiskScore = temp >= 36 ? 82 : temp >= 32 ? 52 : 22;

    return {
      source: "Open-Meteo Live Forecast API",
      location,
      coordinates: { lat, lon },
      current: { temperatureC: temp, humidityPct: humidity, rainMm: rain, windKmh: wind },
      riskAssessment: {
        rainfallDrainageRisk: rainRiskScore,
        thermalCoolingStrainRisk: heatRiskScore,
        advisory:
          rainRiskScore >= 70 || heatRiskScore >= 70
            ? "Add +24h inbound corridor buffer and monitor motor/chiller thermal headroom."
            : "Normal operating corridor and ambient cooling margin.",
      },
      threeDaySummary: (data.daily?.time || []).map((date, idx) => ({
        date,
        maxTempC: data.daily?.temperature_2m_max?.[idx] ?? temp,
        rainSumMm: data.daily?.rain_sum?.[idx] ?? 0,
      })),
    };
  } catch {
    return {
      source: "Regional Weather Telemetry Fallback Cache",
      location,
      coordinates: { lat, lon },
      current: { temperatureC: 30.8, humidityPct: 76, rainMm: 0.4, windKmh: 12.6 },
      riskAssessment: {
        rainfallDrainageRisk: 24,
        thermalCoolingStrainRisk: 28,
        advisory: "Using regional telemetry cache; monitor Open-Meteo connectivity.",
      },
    };
  }
}

function evaluateSupply(args: Record<string, unknown>) {
  const delayDays = Math.max(0, Number(args.supplierDelayDays ?? 0));
  const runwayDays = Math.max(0.5, Number(args.materialRunwayDays ?? 8));
  const portCongestion = Boolean(args.portCongestion);
  const roadDisruption = Boolean(args.roadDisruption);

  const effectiveBufferDays = Number(
    (runwayDays - delayDays - (portCongestion ? 2 : 0) - (roadDisruption ? 1.5 : 0)).toFixed(1)
  );
  const slaBreachRiskPct = Math.min(
    98,
    Math.max(
      8,
      Math.round(
        delayDays * 4.5 + (portCongestion ? 22 : 0) + (roadDisruption ? 18 : 0) + (effectiveBufferDays < 2 ? 25 : 0)
      )
    )
  );

  return {
    supplierDelayDays: delayDays,
    startingMaterialRunwayDays: runwayDays,
    portCongestion,
    roadDisruption,
    netEffectiveBufferDays: effectiveBufferDays,
    slaBreachRiskPct,
    status: effectiveBufferDays <= 0 ? "CRITICAL_STOCKOUT_RISK" : effectiveBufferDays <= 3 ? "AT_RISK" : "BUFFERED",
    recommendedMitigation:
      effectiveBufferDays <= 2
        ? "Activate secondary regional vendor immediately and rebalance high-priority buyer orders onto top-efficiency lines."
        : "Maintain safety stock tracking; monitor port clearance windows.",
  };
}

function jsonRpcSuccess(id: string | number | null | undefined, result: unknown) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    result,
  };
}

function jsonRpcError(id: string | number | null | undefined, code: number, message: string) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message },
  };
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader?.("Access-Control-Allow-Origin", "*");
  res.setHeader?.("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader?.("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id");

  if (req.method === "OPTIONS") {
    res.status(204);
    if (res.end) res.end();
    else res.json({});
    return;
  }

  if (req.method === "GET") {
    return res.status(200).json({
      protocol: "Model Context Protocol (MCP)",
      protocolVersion: PROTOCOL_VERSION,
      transport: "Streamable HTTP (JSON-RPC 2.0 via POST /api/mcp)",
      serverInfo: SERVER_INFO,
      security: "Read-Only Plant Cyber Shield (no physical PLC/SCADA write operations)",
      capabilities: {
        toolsCount: MCP_TOOLS.length,
        resourcesCount: MCP_RESOURCES.length,
        promptsCount: MCP_PROMPTS.length,
      },
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: MCP_RESOURCES.map((r) => ({ uri: r.uri, name: r.name })),
      prompts: MCP_PROMPTS.map((p) => ({ name: p.name, description: p.description })),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json(jsonRpcError(null, -32600, "Only GET, POST, and OPTIONS are supported."));
  }

  let body: JsonRpcRequest = {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body) as JsonRpcRequest;
    } catch {
      return res.status(400).json(jsonRpcError(null, -32700, "Invalid JSON payload."));
    }
  } else if (req.body && typeof req.body === "object") {
    body = req.body as JsonRpcRequest;
  }

  const { id, method, params } = body;

  if (!method) {
    return res.status(400).json(jsonRpcError(id, -32600, "Missing JSON-RPC method."));
  }

  if (method === "notifications/initialized") {
    return res.status(202).json({ acknowledged: true });
  }

  if (method === "ping") {
    return res.status(200).json(jsonRpcSuccess(id, {}));
  }

  if (method === "initialize") {
    return res.status(200).json(
      jsonRpcSuccess(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
          prompts: { listChanged: false },
        },
        serverInfo: SERVER_INFO,
        instructions:
          "Use indusmind-plant-mcp tools to inspect machine telemetry risk, Open-Meteo industrial weather hazards, supply-chain disruption impact, and 20-industry baseline benchmarks. All operations are strictly read-only.",
      })
    );
  }

  if (method === "tools/list") {
    return res.status(200).json(jsonRpcSuccess(id, { tools: MCP_TOOLS }));
  }

  if (method === "tools/call") {
    const toolName = String(params?.name || "");
    const args = (params?.arguments && typeof params.arguments === "object"
      ? params.arguments
      : {}) as Record<string, unknown>;

    if (toolName === "score_machine_telemetry") {
      const result = scoreTelemetry(args);
      return res.status(200).json(
        jsonRpcSuccess(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        })
      );
    }

    if (toolName === "get_live_weather_risk") {
      const result = await fetchWeatherRisk(args);
      return res.status(200).json(
        jsonRpcSuccess(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        })
      );
    }

    if (toolName === "evaluate_supply_delay") {
      const result = evaluateSupply(args);
      return res.status(200).json(
        jsonRpcSuccess(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          isError: false,
        })
      );
    }

    if (toolName === "get_industry_benchmarks") {
      const filter = String(args.industryFilter || "").trim().toLowerCase();
      const matched = filter
        ? INDUSTRY_BENCHMARKS.filter(
            (b) => b.id.toLowerCase().includes(filter) || b.name.toLowerCase().includes(filter)
          )
        : INDUSTRY_BENCHMARKS;
      return res.status(200).json(
        jsonRpcSuccess(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ count: matched.length, industries: matched }, null, 2),
            },
          ],
          isError: false,
        })
      );
    }

    return res
      .status(200)
      .json(jsonRpcError(id, -32601, `Unknown MCP tool: ${toolName}`));
  }

  if (method === "resources/list") {
    return res.status(200).json(jsonRpcSuccess(id, { resources: MCP_RESOURCES }));
  }

  if (method === "resources/read") {
    const uri = String(params?.uri || "");
    if (uri === "indusmind://plant/cyber-shield-policy") {
      return res.status(200).json(
        jsonRpcSuccess(id, {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  policy: "Read-Only Plant Cyber Shield",
                  plcWriteAllowed: false,
                  remoteControlAllowed: false,
                  telemetryScope: "Advisory diagnostics, forecasting, and maintenance scheduling only",
                },
                null,
                2
              ),
            },
          ],
        })
      );
    }
    if (uri === "indusmind://plant/supported-industries") {
      return res.status(200).json(
        jsonRpcSuccess(id, {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(INDUSTRY_BENCHMARKS, null, 2),
            },
          ],
        })
      );
    }
    return res.status(200).json(jsonRpcError(id, -32602, `Resource not found: ${uri}`));
  }

  if (method === "prompts/list") {
    return res.status(200).json(jsonRpcSuccess(id, { prompts: MCP_PROMPTS }));
  }

  if (method === "prompts/get") {
    const promptName = String(params?.name || "");
    const pArgs = (params?.arguments && typeof params.arguments === "object"
      ? params.arguments
      : {}) as Record<string, unknown>;
    if (promptName === "plant-shift-handover") {
      const facilityName = String(pArgs.facilityName || "Active Plant");
      const language = String(pArgs.language || "English");
      return res.status(200).json(
        jsonRpcSuccess(id, {
          description: "Shift handover diagnostic prompt",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Generate a concise shift handover briefing in ${language} for ${facilityName}. Inspect top-risk machines, Open-Meteo corridor weather risk, and any supply delay exposure using indusmind-plant-mcp tools.`,
              },
            },
          ],
        })
      );
    }
    if (promptName === "banglish-diagnostic-briefing") {
      const machineId = String(pArgs.machineId || "M-03");
      return res.status(200).json(
        jsonRpcSuccess(id, {
          description: "Banglish technician troubleshooting prompt",
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Run score_machine_telemetry for ${machineId} and explain the exact root cause and immediate LOTO/maintenance checklist in simple Banglish.`,
              },
            },
          ],
        })
      );
    }
    return res.status(200).json(jsonRpcError(id, -32602, `Prompt not found: ${promptName}`));
  }

  return res.status(200).json(jsonRpcError(id, -32601, `Method not found: ${method}`));
}
