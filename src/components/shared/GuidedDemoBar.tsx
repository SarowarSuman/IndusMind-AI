import React from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { GUIDED_DEMO_STEPS, useIndustry } from "../../context/IndustryContext";

export const GuidedDemoBar: React.FC = () => {
  const { guidedStep, nextGuidedStep, prevGuidedStep, startGuidedDemo, exitGuidedDemo, resetDemo } =
    useIndustry();

  if (guidedStep === null) return null;

  const current = GUIDED_DEMO_STEPS.find((s) => s.step === guidedStep) || GUIDED_DEMO_STEPS[0];

  return (
    <div className="border-b border-[#00E5FF]/30 bg-[#0D1422] px-4 py-3 sm:px-6">
      <div className="mx-auto flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF] tabular-nums">
            <span>Interactive Platform Walkthrough</span>
            <span aria-hidden="true">·</span>
            <span>
              Step {current.step} of {GUIDED_DEMO_STEPS.length}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-slate-100">{current.title}</p>
          <p className="text-xs text-slate-400">{current.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={prevGuidedStep}
            disabled={guidedStep <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-[#111C2D] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous Step
          </button>
          <button
            onClick={nextGuidedStep}
            disabled={guidedStep >= GUIDED_DEMO_STEPS.length}
            className="inline-flex items-center gap-1 rounded-lg bg-[#00E5FF] px-3.5 py-1.5 text-xs font-semibold text-[#070B14] hover:bg-[#33ECFF] disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            Next Step
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              resetDemo();
              startGuidedDemo();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Scenario
          </button>
          <button
            onClick={exitGuidedDemo}
            aria-label="Close Guided Demo"
            className="inline-flex items-center justify-center rounded-lg border border-slate-800 p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
