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
  name: "indusmind-audit-mcp",
  version: "1.0.0",
  title: "IndusMindAI Safety, Maintenance & BDT Budget MCP Server",
  description:
    "Streamable HTTP MCP server exposing Lock-Out/Tag-Out (LOTO) safety inspection checklists, maintenance priority queues, BDT (৳) preventive vs. reactive cost estimators, and shift audit summaries.",
};

const TOOLS = [
  {
    name: "generate_loto_checklist",
    description: "Generate a step-by-step Lock-Out / Tag-Out (LOTO) floor safety protocol tailored to a specific machine hazard.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        machineId: { type: "string" },
        hazardType: { type: "string", description: "thermal | vibration | pressure | electrical" },
      },
      required: ["machineId"],
    },
  },
  {
    name: "prioritize_maintenance_queue",
    description: "Rank candidate machines by risk score and production bottleneck dependency to generate an actionable technician queue.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        assets: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              riskScore: { type: "number" },
              onCriticalLine: { type: "boolean" },
            },
          },
        },
      },
      required: ["assets"],
    },
  },
  {
    name: "calculate_downtime_budget_bdt",
    description: "Estimate Bangladesh Taka (৳ BDT) savings comparing preventive intervention vs. unplanned breakdown downtime.",
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    inputSchema: {
      type: "object",
      properties: {
        estimatedDowntimeHours: { type: "number" },
        hourlyLineLossBdt: { type: "number" },
        preventiveServiceCostBdt: { type: "number" },
      },
      required: ["estimatedDowntimeHours"],
    },
  },
];

const RESOURCES = [
  {
    uri: "indusmind://audit/loto-safety-standard",
    name: "Zero-Accident Floor Safety Standard",
    description: "Standardized preventive inspection and safety interlock checklist for factory supervisors.",
    mimeType: "application/json",
  },
];

const PROMPTS = [
  {
    name: "executive-audit-brief",
    description: "Summarize preventive vs reactive BDT cost savings and pending safety checks.",
    arguments: [{ name: "facilityName", description: "Factory name", required: true }],
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
      transport: "Streamable HTTP (JSON-RPC 2.0 via POST /api/mcp-audit)",
      serverInfo: SERVER_INFO,
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      resources: RESOURCES.map((r) => ({ uri: r.uri, name: r.name })),
      prompts: PROMPTS.map((p) => ({ name: p.name, description: p.description })),
    });
  }

  if (req.method !== "POST") return res.status(405).json(err(null, -32600, "Method not allowed."));

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

    if (toolName === "generate_loto_checklist") {
      const machineId = String(args.machineId || "M-03");
      const hazardType = String(args.hazardType || "thermal");
      const steps = [
        `Notify shift supervisor and pause upstream feed to ${machineId}.`,
        `Isolate main electrical breaker and apply Lock-Out / Tag-Out (LOTO) tag for ${hazardType} inspection.`,
        `Verify zero residual energy/pressure before opening drive housing.`,
        `Inspect bearings, cooling airflow, and sensor calibration; log reading before restart.`,
      ];
      return res.status(200).json(
        ok(id, { content: [{ type: "text", text: JSON.stringify({ machineId, hazardType, steps }, null, 2) }], isError: false })
      );
    }

    if (toolName === "prioritize_maintenance_queue") {
      const rawAssets = Array.isArray(args.assets) ? args.assets : [];
      const ranked = rawAssets
        .map((a) => {
          const item = (a || {}) as { id?: unknown; riskScore?: unknown; onCriticalLine?: unknown };
          const score = Number(item.riskScore ?? 30) + (item.onCriticalLine ? 15 : 0);
          return { id: String(item.id || "ASSET"), priorityScore: score, urgency: score >= 75 ? "IMMEDIATE" : score >= 50 ? "URGENT" : "PLANNED" };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore);
      return res.status(200).json(
        ok(id, { content: [{ type: "text", text: JSON.stringify({ queue: ranked }, null, 2) }], isError: false })
      );
    }

    if (toolName === "calculate_downtime_budget_bdt") {
      const hours = Math.max(0.5, Number(args.estimatedDowntimeHours ?? 12));
      const hourlyLoss = Math.max(1000, Number(args.hourlyLineLossBdt ?? 45000));
      const preventive = Math.max(1000, Number(args.preventiveServiceCostBdt ?? 53500));
      const reactiveLoss = Math.round(hours * hourlyLoss);
      const netSavings = Math.max(0, reactiveLoss - preventive);
      return res.status(200).json(
        ok(id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { currency: "BDT (৳)", unplannedReactiveLossBdt: reactiveLoss, preventiveBudgetBdt: preventive, netSavingsBdt: netSavings },
                null,
                2
              ),
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
    if (uri === "indusmind://audit/loto-safety-standard") {
      return res.status(200).json(
        ok(id, { contents: [{ uri, mimeType: "application/json", text: JSON.stringify({ standard: "Zero-Accident LOTO", mandatoryShiftSignOff: true }, null, 2) }] })
      );
    }
    return res.status(200).json(err(id, -32602, `Resource not found: ${uri}`));
  }

  if (method === "prompts/list") return res.status(200).json(ok(id, { prompts: PROMPTS }));
  if (method === "prompts/get") {
    const name = String(params?.name || "");
    if (name === "executive-audit-brief") {
      const fac = String((params?.arguments as Record<string, unknown> | undefined)?.facilityName || "Active Plant");
      return res.status(200).json(
        ok(id, {
          messages: [{ role: "user", content: { type: "text", text: `Calculate BDT downtime savings and prioritize maintenance work orders for ${fac} using indusmind-audit-mcp.` } }],
        })
      );
    }
    return res.status(200).json(err(id, -32602, `Prompt not found: ${name}`));
  }

  return res.status(200).json(err(id, -32601, `Method not found: ${method}`));
}
