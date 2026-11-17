import React from "react";
import { AppShell } from "./components/layout/AppShell";
import { IndustryProvider, useIndustry } from "./context/IndustryContext";
import { Alerts } from "./pages/Alerts";
import { Analytics } from "./pages/Analytics";
import { Copilot } from "./pages/Copilot";
import { Dashboard } from "./pages/Dashboard";
import { DigitalTwin } from "./pages/DigitalTwin";
import { Home } from "./pages/Home";
import { Industries } from "./pages/Industries";
import { Machines } from "./pages/Machines";
import { MaintenancePlanner } from "./pages/MaintenancePlanner";
import { Platform } from "./pages/Platform";
import { PredictiveMaintenance } from "./pages/PredictiveMaintenance";
import { Production } from "./pages/Production";
import { Settings } from "./pages/Settings";
import { SignIn } from "./pages/SignIn";
import { Solutions } from "./pages/Solutions";
import { SupplyChain } from "./pages/SupplyChain";
import { Technology } from "./pages/Technology";
import { Weather } from "./pages/Weather";

const RouteView: React.FC = () => {
  const { route } = useIndustry();

  switch (route) {
    case "home":
      return <Home />;
    case "platform":
      return <Platform />;
    case "solutions":
      return <Solutions />;
    case "industries":
      return <Industries />;
    case "technology":
      return <Technology />;
    case "signin":
      return <SignIn />;
    case "dashboard":
      return (
        <AppShell>
          <Dashboard />
        </AppShell>
      );
    case "digital-twin":
      return (
        <AppShell>
          <DigitalTwin />
        </AppShell>
      );
    case "machines":
      return (
        <AppShell>
          <Machines />
        </AppShell>
      );
    case "predictive":
      return (
        <AppShell>
          <PredictiveMaintenance />
        </AppShell>
      );
    case "production":
      return (
        <AppShell>
          <Production />
        </AppShell>
      );
    case "supply-chain":
      return (
        <AppShell>
          <SupplyChain />
        </AppShell>
      );
    case "weather":
      return (
        <AppShell>
          <Weather />
        </AppShell>
      );
    case "copilot":
      return (
        <AppShell>
          <Copilot />
        </AppShell>
      );
    case "maintenance":
      return (
        <AppShell>
          <MaintenancePlanner />
        </AppShell>
      );
    case "alerts":
      return (
        <AppShell>
          <Alerts />
        </AppShell>
      );
    case "analytics":
      return (
        <AppShell>
          <Analytics />
        </AppShell>
      );
    case "settings":
      return (
        <AppShell>
          <Settings />
        </AppShell>
      );
    default:
      return <Home />;
  }
};

export default function App() {
  return (
    <IndustryProvider>
      <RouteView />
    </IndustryProvider>
  );
}
