import React from "react";
import { useIndustry } from "../../context/IndustryContext";
import { IndusMindLogo } from "../shared/IndusMindLogo";

export const MarketingFooter: React.FC = () => {
  const { navigate } = useIndustry();

  return (
    <footer className="border-t border-slate-800/80 bg-[#070B14] px-6 py-12 text-sm text-slate-400">
      <div className="mx-auto max-w-7xl grid grid-cols-1 gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <IndusMindLogo size="md" />
          <p className="text-xs leading-relaxed text-slate-400">
            Predict Today. Prevent Tomorrow. Produce Smarter. Transforming industrial operations into
            predictive, resilient ecosystems.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-200">Platform</div>
          <ul className="space-y-1.5 text-xs">
            <li>
              <button onClick={() => navigate("platform")} className="hover:text-[#00E5FF]">
                Platform Overview
              </button>
            </li>
            <li>
              <button onClick={() => navigate("solutions")} className="hover:text-[#00E5FF]">
                Solutions
              </button>
            </li>
            <li>
              <button onClick={() => navigate("dashboard")} className="hover:text-[#00E5FF]">
                Command Center
              </button>
            </li>
            <li>
              <button onClick={() => navigate("digital-twin")} className="hover:text-[#00E5FF]">
                3D Digital Twin
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-200">Ecosystem</div>
          <ul className="space-y-1.5 text-xs">
            <li>
              <button onClick={() => navigate("industries")} className="hover:text-[#00E5FF]">
                20 Target Industries
              </button>
            </li>
            <li>
              <button onClick={() => navigate("technology")} className="hover:text-[#00E5FF]">
                Architecture & Research
              </button>
            </li>
            <li>
              <button onClick={() => navigate("predictive")} className="hover:text-[#00E5FF]">
                Predictive Maintenance
              </button>
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-200">Enterprise & Access</div>
          <ul className="space-y-1.5 text-xs">
            <li>Support: Industrial Engineering Desk</li>
            <li>Gateway Ready: MQTT · OPC UA · Modbus</li>
            <li>Privacy Policy · Terms of Use</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-7xl mt-10 border-t border-slate-800/80 pt-6 grid grid-cols-1 gap-3 md:grid-cols-3 md:items-center text-xs text-slate-400">
        <span className="text-left">&copy; 2026 IndusMindAI · All Rights Reserved</span>
        <span className="md:text-center font-medium text-slate-300">
          Developed by Sarowar Suman
        </span>
        <span className="md:text-right text-[#3fd8ff]">
          Predictive Safety · Zero Unplanned Downtime
        </span>
      </div>
    </footer>
  );
};
