import React from "react";
import { ArrowDown, ExternalLink, Info } from "lucide-react";
import { MarketingNavbar } from "../components/layout/MarketingNavbar";
import { MarketingFooter } from "../components/layout/MarketingFooter";

export const Technology: React.FC = () => {
  const layers = [
    {
      name: "Industrial Assets",
      detail: "Motors, boilers, compressors, CNC centers, robotic arms, conveyors, and generators.",
    },
    {
      name: "Sensor & Data Collection",
      detail: "Vibration, temperature, current/power, pressure, RPM sensors, IoT gateways, and PLC/SCADA telemetry.",
    },
    {
      name: "Data Processing & Storage",
      detail: "Time-series ingestion, historical maintenance logs, equipment metadata, production & supplier records.",
    },
    {
      name: "AI / ML Prediction Engine",
      detail: "Deterministic anomaly scoring in prototype; FastAPI-ready architecture for Random Forest, XGBoost, Isolation Forest & RUL models.",
    },
    {
      name: "Industrial Intelligence Layer",
      detail: "Cross-domain correlation linking asset risk to production lines, inventory buffers, and weather risk.",
    },
    {
      name: "Dashboard & AI Recommendations",
      detail: "3D Digital Twin, dynamic KPIs, Sphere Copilot explanations, and smart recommendation engine.",
    },
    {
      name: "Human Decision & Action",
      detail: "Plant engineers verify inspections, schedule preventive work orders, and approve supply contingencies.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex flex-col">
      <MarketingNavbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-14 space-y-14">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[#00E5FF] uppercase">
            Technical Architecture & Research
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-50">
            Transparent, Extensible Industrial AI Architecture
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Built with clean separation between telemetry ingestion, deterministic predictive scoring
            logic, and integration-ready contracts for industrial plant deployments.
          </p>
        </div>

        {/* 7-Layer Visual Stack */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-slate-100">
            7-Layer End-to-End Architecture Flow
          </h2>
          <div className="space-y-2">
            {layers.map((layer, i) => (
              <React.Fragment key={layer.name}>
                <div className="rounded-xl border border-slate-800 bg-[#111C2D] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#00E5FF]">0{i + 1}.</span>
                    <span className="font-display text-sm font-semibold text-slate-100">
                      {layer.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 sm:max-w-xl sm:text-right">{layer.detail}</p>
                </div>
                {i < layers.length - 1 && (
                  <div className="flex justify-center">
                    <ArrowDown className="h-4 w-4 text-slate-600" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Future Integration & Cyber Security Layer */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 space-y-3">
            <h3 className="font-display text-lg font-semibold text-slate-100">
              Planned Industrial Protocol Integrations
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The data contract is structured for seamless integration with industrial PLC gateways,
              OPC UA servers, and enterprise ERP/MES platforms across manufacturing plants.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 pt-1">
              {[
                "MQTT Telemetry",
                "OPC UA Nodes",
                "Modbus TCP/RTU",
                "Industrial IoT Gateways",
                "ERP Connectors",
                "MES / CMMS Sync",
                "Python FastAPI ML",
                "Open-Meteo Weather (Live)",
              ].map((p) => (
                <div key={p} className="rounded-lg border border-slate-800 bg-[#0D1422] px-3 py-2">
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 space-y-3">
            <h3 className="font-display text-lg font-semibold text-slate-100">
              Bangladesh Industrial Context
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bangladesh&apos;s manufacturing economy spans garments, textiles, pharmaceuticals,
              agro-processing, steel, cement, and light engineering SMEs across Dhaka, Gazipur,
              Savar, Narayanganj, and Chattogram. Making predictive maintenance accessible in BDT
              without heavy proprietary hardware costs helps factories:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
              <li>Reduce unexpected equipment breakdowns and shift-level downtime</li>
              <li>Shift from reactive emergency repairs to planned preventive windows</li>
              <li>Prepare production schedules for monsoon rainfall and logistics disruptions</li>
              <li>Support SME manufacturers with practical, understandable risk intelligence</li>
            </ul>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-[#111C2D] p-6 space-y-3">
            <h3 className="font-display text-lg font-semibold text-emerald-300">
              Zero-Trust Cyber &amp; Data Protection
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Built so factory telemetry cannot be hacked, leaked to competitors, or abused to
              sabotage live floor machinery:
            </p>
            <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
              <li>
                <strong className="text-slate-200">One-Way Read-Only PLC Diode:</strong> Outbound-only telemetry prevents remote commands from altering RPM, pressure, or relays.
              </li>
              <li>
                <strong className="text-slate-200">AES-256 &amp; TLS 1.3 Siloing:</strong> Production output and machine health remain encrypted and strictly isolated per factory tenant.
              </li>
              <li>
                <strong className="text-slate-200">Role Access &amp; Export Watermarking:</strong> Sensitive reports are restricted, masked on shared displays, and logged in an audit trail.
              </li>
            </ul>
          </div>
        </section>

        {/* International Inspiration & Research */}
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-slate-50">
              International Inspiration & Research Foundations
            </h2>
            <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-[#0D1422] p-3 text-xs text-slate-300">
              <Info className="h-4 w-4 text-[#00E5FF] shrink-0 mt-0.5" />
              <span>
                Independent Proposal Notice: IndusMindAI is an independent proposed platform.
                We do not claim affiliation, endorsement, or partnership with Toyota, Xiaomi, UCI, or
                any referenced organization.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Toyota Production System (TPS)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conceptual inspiration from Just-in-Time flow, Jidoka (stopping abnormalities early
                  before defects propagate), Kaizen continuous improvement, and proactive equipment
                  reliability.
                </p>
              </div>
              <a
                href="https://global.toyota/en/company/vision-and-philosophy/production-system/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00E5FF] hover:underline"
              >
                Official TPS Reference
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  Xiaomi Smart Manufacturing Concepts
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inspired by hyper-intelligent manufacturing concepts: industrial digitalization,
                  connected factory telemetry, automated quality inspection, and AI-assisted plant
                  orchestration.
                </p>
              </div>
              <a
                href="https://www.mi.com/global/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00E5FF] hover:underline"
              >
                Xiaomi Global Reference
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-slate-100">
                  UCI AI4I 2020 Predictive Maintenance Dataset
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A synthetic benchmark dataset widely used for machine-learning experimentation on
                  temperature, rotational speed, torque, and tool-wear failure modes.
                </p>
              </div>
              <a
                href="https://archive.ics.uci.edu/dataset/601/ai4i"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00E5FF] hover:underline"
              >
                UCI Dataset Repository
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
};
