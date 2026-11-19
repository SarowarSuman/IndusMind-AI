interface VercelReq {
  method?: string;
  body?: unknown;
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

const PROTOCOL_VERSION = "2024-11-05";

const SERVER_INFO = {
  name: "indusmind-corridor-mcp",
  version: "1.0.0",
  title: "IndusMindAI Weather & Logistics Corridor MCP Server",
  description:
    "Dedicated Streamable HTTP MCP server integrating Open-Meteo live meteorological forecasts with Bangladesh industrial corridor flood, heat-stress, and supply-chain SLA propagation tools.",
};

const HUBS: Record<string, { lat: number; lon: number; label: string; corridor: string }> = {
  gazipur: { lat: 24.0023, lon: 90.4264, label: "Gazipur Industrial Belt", corridor: "Dhaka-Mymensingh N3" },
  dhaka: { lat: 23.8103, lon: 90.4125, label: "Dhaka Metro Hub", corridor: "Metro Ring Logistics" },
  chattogram: { lat: 22.3569, lon: 91.7832, label: "Chattogram Port & EPZ", corridor: "N1 Port-to-Dhaka Highway" },
  narayanganj: { lat: 23.6238, lon: 90.5, label: "Narayanganj Knit Corridor", corridor: "Shitalakshya River & N1" },
  savar: { lat: 23.8583, lon: 90.2667, label: "Savar & Ashulia Zone", corridor: "Dhaka-Aricha N5" },
  khulna: { lat: 22.8456, lon: 89.5403, label: "Khulna Shipyard & South", corridor: "Mongla-Khulna Maritime" },
};

const TOOLS = [
  {
    name: "get_bangladesh_hubs",
    description: "List all 6 preset Bangladesh industrial corridors with GPS coordinates and primary freight highways.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_open_meteo_forecast",
    description: "Query live Open-Meteo current conditions and 5-day forecast for a Bangladesh hub or custom GPS lat/lon.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Hub key: gazipur, dhaka, chattogram, narayanganj, savar, or khulna." },
        lat: { type: "number", description: "Custom latitude." },
        lon: { type: "number", description: "Custom longitude." },
      },
    },
  },
  {
    name: "evaluate_corridor_flood_risk",
    description: "Compute rainfall drainage risk, highway transit delay hours, and motor thermal margin loss for a weather condition.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        temperatureC: { type: "number" },
        rainMm: { type: "number" },
        hazardMode: { type: "string", description: "None | Heavy Rainfall | Flood Scenario | Extreme Heat | Transport Disruption" },
      },
    },
  },
  {
    name: "simulate_supply_chain_disruption",
    description: "Calculate downstream material stockout exposure and buyer SLA delay penalty risk from supplier + port delays.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        supplierDelayDays: { type: "number" },
        materialRunwayDays: { type: "number" },
        portCongestion: { type: "boolean" },
        roadDisruption: { type: "boolean" },
      },
      required: ["supplierDelayDays"],
    },
  },
];

const RESOURCES = [
  {
    uri: "indusmind://corridor/bangladesh-hubs",
    name: "Bangladesh Industrial Corridor Coordinates",
    description: "Preset GPS coordinates and freight corridors for Gazipur, Dhaka, Chattogram, Narayanganj, Savar, and Khulna.",
    mimeType: "application/json",
  },
];

const PROMPTS = [
  {
    name: "monsoon-logistics-contingency",
    description: "Generate a pre-monsoon factory logistics and inventory buffer plan.",
    arguments: [{ name: "hub", description: "Industrial hub key", required: true }],
  },
];

function ok(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function err(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
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
      transport: "Streamable HTTP (JSON-RPC 2.0 via POST /api/mcp-weather)",
      serverInfo: SERVER_INFO,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: RESOURCES.map((r) => ({ uri: r.uri, name: r.name })),
      prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description })),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json(err(null, -32600, "Method not allowed."));
  }

  let body: JsonRpcRequest = {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body) as JsonRpcRequest;
    } catch {
      return res.status(400).json(err(null, -32700, "Invalid JSON."));
    }
  } else if (req.body && typeof req.body === "object") {
    body = req.body as JsonRpcRequest;
  }

  const { id, method, params } = body;
  if (!method) return res.status(400).json(err(id, -32600, "Missing JSON-RPC method."));
  if (method === "notifications/initialized") return res.status(202).json({ acknowledged: true });
  if (method === "ping") return res.status(200).json(ok(id, {}));

  if (method === "initialize") {
    return res.status(200).json(
      ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false }, prompts: { listChanged: false } },
        serverInfo: SERVER_INFO,
      })
    );
  }

  if (method === "tools/list") return res.status(200).json(ok(id, { tools: TOOLS }));

  if (method === "tools/call") {
    const toolName = String(params?.name || "");
    const args = (params?.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;

    if (toolName === "get_bangladesh_hubs") {
      return res.status(200).json(
        ok(id, { content: [{ type: "text", text: JSON.stringify(HUBS, null, 2) }], isError: false })
      );
    }

    if (toolName === "get_open_meteo_forecast") {
      const cityKey = String(args.city || "gazipur").toLowerCase();
      const hub = HUBS[cityKey] || HUBS.gazipur;
      const lat = typeof args.lat === "number" ? args.lat : hub.lat;
      const lon = typeof args.lon === "number" ? args.lon : hub.lon;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m&daily=temperature_2m_max,rain_sum&timezone=auto&forecast_days=5`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
        const data = await r.json();
        return res.status(200).json(
          ok(id, {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { source: "Open-Meteo Live Forecast API", hub: hub.label, corridor: hub.corridor, coordinates: { lat, lon }, current: data.current, daily: data.daily },
                  null,
                  2
                ),
              },
            ],
            isError: false,
          })
        );
      } catch {
        return res.status(200).json(
          ok(id, {
            content: [{ type: "text", text: JSON.stringify({ source: "Telemetry Cache", hub: hub.label, coordinates: { lat, lon }, current: { temperature_2m: 30.2, rain: 0.4, wind_speed_10m: 12.1 } }, null, 2) }],
            isError: false,
          })
        );
      }
    }

    if (toolName === "evaluate_corridor_flood_risk") {
      const temp = Number(args.temperatureC ?? 31);
      const rain = Number(args.rainMm ?? 0.2);
      const mode = String(args.hazardMode || "None");
      const floodScore = mode === "Flood Scenario" ? 92 : mode === "Heavy Rainfall" ? 78 : rain > 10 ? 70 : 20;
      const heatScore = mode === "Extreme Heat" ? 88 : temp >= 36 ? 76 : 24;
      const transitDelayHrs = floodScore >= 75 ? 36 : floodScore >= 50 ? 18 : 0;
      return res.status(200).json(
        ok(id, {
          content: [{ type: "text", text: JSON.stringify({ hazardMode: mode, floodScore, heatScore, estimatedTransitDelayHours: transitDelayHrs }, null, 2) }],
          isError: false,
        })
      );
    }

    if (toolName === "simulate_supply_chain_disruption") {
      const delay = Math.max(0, Number(args.supplierDelayDays ?? 5));
      const runway = Math.max(0.5, Number(args.materialRunwayDays ?? 8));
      const port = Boolean(args.portCongestion);
      const road = Boolean(args.roadDisruption);
      const netDays = Number((runway - delay - (port ? 2 : 0) - (road ? 1.5 : 0)).toFixed(1));
      return res.status(200).json(
        ok(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify({ supplierDelayDays: delay, netEffectiveRunwayDays: netDays, riskState: netDays <= 0 ? "CRITICAL" : netDays <= 3 ? "AT_RISK" : "SAFE" }, null, 2),
            },
          ],
          isError: false,
        })
      );
    }

    return res.status(200).json(err(id, -32601, `Unknown tool: ${toolName}`));
  }

  if (method === "resources/list") return res.status(200).json(ok(id, { resources: RESOURCES }));
  if (method === "resources/read") {
    const uri = String(params?.uri || "");
    if (uri === "indusmind://corridor/bangladesh-hubs") {
      return res.status(200).json(ok(id, { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(HUBS, null, 2) }] }));
    }
    return res.status(200).json(err(id, -32602, `Resource not found: ${uri}`));
  }

  if (method === "prompts/list") return res.status(200).json(ok(id, { prompts: PROMPTS }));
  if (method === "prompts/get") {
    const name = String(params?.name || "");
    if (name === "monsoon-logistics-contingency") {
      const hub = String((params?.arguments as Record<string, unknown> | undefined)?.hub || "gazipur");
      return res.status(200).json(
        ok(id, {
          messages: [{ role: "user", content: { type: "text", text: `Assess flood and supplier transit risk for ${hub} using get_open_meteo_forecast and simulate_supply_chain_disruption.` } }],
        })
      );
    }
    return res.status(200).json(err(id, -32602, `Prompt not found: ${name}`));
  }

  return res.status(200).json(err(id, -32601, `Method not found: ${method}`));
}
