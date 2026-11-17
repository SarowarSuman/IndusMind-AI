import React from "react";
import { useIndustry } from "../../context/IndustryContext";
import { PageRoute } from "../../types/industrial";
import { IndusMindLogo } from "../shared/IndusMindLogo";

interface MarketingNavbarProps {
  overlay?: boolean;
  scrolledPastHero?: boolean;
}

export const MarketingNavbar: React.FC<MarketingNavbarProps> = ({
  overlay = false,
  scrolledPastHero = false,
}) => {
  const { route, navigate } = useIndustry();

  const leftNavItems: Array<{ label: string; target: PageRoute }> = [
    { label: "OUR PLATFORM", target: "platform" },
    { label: "INDUSTRIES", target: "industries" },
    { label: "TECHNOLOGY", target: "technology" },
  ];

  return (
    <header
      style={{ height: "calc(58 * var(--u))" }}
      className={`${
        overlay
          ? `fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
              scrolledPastHero
                ? "bg-[#0f1626]/95 border-b border-white/10"
                : "bg-[#0f1626]/40 border-b border-white/5"
            }`
          : "sticky top-0 z-40 bg-[#0f1626]/95 border-b border-white/10"
      } w-full font-tight`}
    >
      <div
        style={{
          paddingLeft: "calc(36 * var(--u))",
          paddingRight: "calc(36 * var(--u))",
        }}
        className="h-full w-full grid grid-cols-2 md:grid-cols-3 items-center max-[760px]:px-[18px]"
      >
        {/* Left Navigation Links (hidden on <= 760px) */}
        <nav className="hidden min-[761px]:flex items-center gap-[calc(28*var(--u))]">
          {leftNavItems.map((item) => {
            const active = route === item.target;
            return (
              <button
                key={item.target}
                onClick={() => navigate(item.target)}
                style={{
                  fontSize: "calc(14.5 * var(--u))",
                  letterSpacing: "0.055em",
                }}
                className={`font-semibold uppercase whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? "text-[#f4f6fa]"
                    : "text-[#f4f6fa]/80 hover:text-[#f4f6fa]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Center Logo & Brand Wordmark */}
        <div className="flex items-center justify-start min-[761px]:justify-center">
          <button
            onClick={() => navigate("home")}
            className="hover:opacity-90 transition-opacity shrink-0"
          >
            <IndusMindLogo size="md" />
          </button>
        </div>

        {/* Right Action Pills: Login (only here) + Open Command */}
        <div className="flex items-center justify-end gap-[calc(10*var(--u))] max-[760px]:gap-[8px]">
          <button
            onClick={() => navigate("signin")}
            style={{
              height: "calc(42 * var(--u))",
              paddingLeft: "calc(22 * var(--u))",
              paddingRight: "calc(22 * var(--u))",
              fontSize: "calc(13.5 * var(--u))",
              letterSpacing: "0.055em",
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#2a3245] text-[#f4f6fa] font-semibold uppercase whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-px hover:bg-[#343d54] max-[760px]:h-[36px] max-[760px]:px-[14px] max-[760px]:text-[12px]"
          >
            LOGIN
          </button>
          <button
            onClick={() => navigate("dashboard")}
            style={{
              height: "calc(42 * var(--u))",
              paddingLeft: "calc(24 * var(--u))",
              paddingRight: "calc(24 * var(--u))",
              fontSize: "calc(13.5 * var(--u))",
              letterSpacing: "0.055em",
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#c6ff2e] text-[#0f1626] font-semibold uppercase whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-px hover:brightness-105 max-[760px]:h-[36px] max-[760px]:px-[15px] max-[760px]:text-[12px]"
          >
            OPEN COMMAND
          </button>
        </div>
      </div>
    </header>
  );
};
