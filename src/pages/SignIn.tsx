import React, { useState } from "react";
import { ArrowRight, Lock } from "lucide-react";
import { useIndustry } from "../context/IndustryContext";
import { MarketingNavbar } from "../components/layout/MarketingNavbar";
import { MarketingFooter } from "../components/layout/MarketingFooter";
import { IndusMindLogo } from "../components/shared/IndusMindLogo";

export const SignIn: React.FC = () => {
  const { userName, setUserName, navigate } = useIndustry();

  const [nameInput, setNameInput] = useState(userName);
  const [emailInput, setEmailInput] = useState("operator@indusmind.ai");
  const [passwordInput, setPasswordInput] = useState("••••••••");

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) setUserName(nameInput.trim());
    navigate("dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0f1626] text-[#f4f6fa] flex flex-col">
      <MarketingNavbar />
      <main className="flex-1 mx-auto max-w-md w-full px-6 py-16 flex items-center">
        <div className="w-full rounded-2xl border border-white/15 bg-[#111C2D] p-7 sm:p-8 space-y-6">
          <div className="space-y-3 text-center">
            <div className="flex justify-center">
              <IndusMindLogo size="lg" />
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#3fd8ff]">
              <Lock className="h-3.5 w-3.5" />
              <span>Workspace Access</span>
            </div>
            <h1 className="font-tight text-2xl font-semibold text-[#f4f6fa]">
              Login to IndusMindAI
            </h1>
          </div>

          <form onSubmit={handleEnter} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0f1626] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#3fd8ff] focus:outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0f1626] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#3fd8ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0f1626] px-3.5 py-2.5 text-sm text-slate-100 focus:border-[#3fd8ff] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#c6ff2e] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#0f1626] hover:brightness-105 transition-all"
            >
              Login
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};
