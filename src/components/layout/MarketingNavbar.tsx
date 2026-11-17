import React, { useState } from "react";
import { Menu, X } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const leftNavItems: Array<{ label: string; target: PageRoute }> = [
    { label: "OUR PLATFORM", target: "platform" },
    { label: "INDUSTRIES", target: "industries" },
    { label: "TECHNOLOGY", target: "technology" },
  ];

  const handleMobileNavigate = (target: PageRoute) => {
    setMobileMenuOpen(false);
    navigate(target);
  };

  return (
    <header
      className={`${
        overlay
          ? `fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${
              scrolledPastHero || mobileMenuOpen
                ? "bg-[#0f1626]/95 border-b border-white/10"
                : "bg-[#0f1626]/55 border-b border-white/5"
            }`
          : "sticky top-0 z-40 bg-[#0f1626]/95 border-b border-white/10"
      } w-full font-tight`}
    >
      <div
        className="h-[58px] w-full flex items-center justify-between md:grid md:grid-cols-3 px-4 sm:px-6 lg:px-9"
      >
        {/* Left Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7">
          {leftNavItems.map((item) => {
            const active = route === item.target;
            return (
              <button
                key={item.target}
                onClick={() => navigate(item.target)}
                className={`text-[13px] lg:text-[14px] tracking-[0.055em] font-semibold uppercase whitespace-nowrap shrink-0 transition-colors ${
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

        {/* Center Logo & Brand Wordmark (Left-aligned on mobile, centered on desktop) */}
        <div className="flex items-center justify-start md:justify-center min-w-0">
          <button
            onClick={() => handleMobileNavigate("home")}
            className="hover:opacity-90 transition-opacity shrink-0"
          >
            <IndusMindLogo size="md" />
          </button>
        </div>

        {/* Right Action Pills + Mobile Menu Toggle */}
        <div className="flex items-center justify-end gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => handleMobileNavigate("signin")}
            className="hidden sm:inline-flex items-center justify-center h-[38px] lg:h-[40px] px-4 lg:px-5 rounded-full bg-[#2a3245] text-[#f4f6fa] text-[12px] lg:text-[13px] tracking-[0.055em] font-semibold uppercase whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-px hover:bg-[#343d54]"
          >
            LOGIN
          </button>
          <button
            onClick={() => handleMobileNavigate("dashboard")}
            className="inline-flex items-center justify-center h-[36px] sm:h-[38px] lg:h-[40px] px-3.5 sm:px-4 lg:px-5 rounded-full bg-[#c6ff2e] text-[#0f1626] text-[11px] sm:text-[12px] lg:text-[13px] tracking-[0.055em] font-semibold uppercase whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-px hover:brightness-105"
          >
            <span className="sm:hidden">COMMAND</span>
            <span className="hidden sm:inline">OPEN COMMAND</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/15 bg-[#1a2234] text-[#f4f6fa] hover:border-[#3fd8ff]"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0f1626]/98 px-4 py-4 space-y-2">
          <nav className="flex flex-col space-y-1">
            {leftNavItems.map((item) => {
              const active = route === item.target;
              return (
                <button
                  key={item.target}
                  onClick={() => handleMobileNavigate(item.target)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
                    active
                      ? "bg-[#3fd8ff]/15 text-[#3fd8ff]"
                      : "text-[#f4f6fa]/85 hover:bg-white/5"
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleMobileNavigate("signin")}
              className="inline-flex items-center justify-center h-11 rounded-full bg-[#2a3245] text-[#f4f6fa] text-xs font-semibold uppercase tracking-wider"
            >
              LOGIN
            </button>
            <button
              onClick={() => handleMobileNavigate("dashboard")}
              className="inline-flex items-center justify-center h-11 rounded-full bg-[#c6ff2e] text-[#0f1626] text-xs font-bold uppercase tracking-wider"
            >
              OPEN COMMAND
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
