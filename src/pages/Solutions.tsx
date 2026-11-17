import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { MarketingNavbar } from "../components/layout/MarketingNavbar";
import { MarketingFooter } from "../components/layout/MarketingFooter";

export const Solutions: React.FC = () => {
  const { navigate } = useIndustry();

  const pillars = [
    {
      role: "For Maintenance Engineers",
      title: "Early Anomaly Detection & Inspection Prioritization",
      outcomes: [
        "Asset-specific thresholds for motors, boilers, compressors, CNC cells, and chillers",
        "Interactive sensor stress-testing with immediate health and risk recalculation",
        "One-click conversion from predictive alerts to scheduled maintenance work orders",
      ],
      route: "predictive" as const,
      cta: "Open Predictive Engine",
    },
    {
      role: "For Production Managers",
      title: "Bottleneck Resolution & Delivery Schedule Protection",
      outcomes: [
        "Real-time tracking of target vs. actual shift output across production lines",
        "Interactive capacity disruption calculator modeling shortfall and alternative routing",
        "Maintenance window alignment to minimize unplanned shift conflicts",
      ],
      route: "production" as const,
      cta: "Open Production Intelligence",
    },
    {
      role: "For Supply Chain & Logistics Teams",
      title: "Buffer Runway Monitoring & Weather Contingency Planning",
      outcomes: [
        "Supplier reliability scoring and multi-day lead-time delay modeling",
        "Days-of-inventory calculations with automated reorder threshold warnings",
        "Bangladesh corridor weather risk modeling for Dhaka, Gazipur, Chattogram, and Savar",
      ],
      route: "supply-chain" as const,
      cta: "Open Supply Chain Map",
    },
    {
      role: "For Factory Owners & Multi-Plant Executives",
      title: "Unified Multi-Facility Visibility & Printable Reporting",
      outcomes: [
        "Switch seamlessly between 5 regional plants or compare all facilities side by side",
        "Context-aware Sphere Copilot executive summaries grounded in live plant telemetry",
        "Exportable CSV and printable operational, maintenance, and supply risk reports",
      ],
      route: "analytics" as const,
      cta: "Open Analytics & Reports",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] text-[#F8FAFC] flex flex-col">
      <MarketingNavbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-14 space-y-10">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold tracking-wider text-[#00E5FF] uppercase">Solutions</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-50">
            Role-Aligned Industrial Intelligence
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Built for practical day-to-day execution across shop-floor technicians, planners, and
            multi-facility leadership.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-xl border border-slate-800 bg-[#111C2D] p-6 space-y-4">
              <div className="text-xs font-mono text-[#00E5FF]">{p.role}</div>
              <h2 className="font-display text-xl font-semibold text-slate-100">{p.title}</h2>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {p.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(p.route)}
                className="inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-[#00E5FF] hover:underline"
              >
                {p.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};
