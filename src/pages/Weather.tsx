import React, { useState } from "react";
import {
  CloudRain,
  Compass,
  Droplets,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Truck,
  Wind,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useIndustry } from "../context/IndustryContext";
import { WeatherScenarioState } from "../types/industrial";

const CITIES = [
  { key: "gazipur", label: "Gazipur Industrial Belt", coords: "23.99°N, 90.42°E" },
  { key: "dhaka", label: "Dhaka Metro Hub", coords: "23.81°N, 90.41°E" },
  { key: "chattogram", label: "Chattogram Port & EPZ", coords: "22.36°N, 91.78°E" },
  { key: "narayanganj", label: "Narayanganj Knit Corridor", coords: "23.62°N, 90.50°E" },
  { key: "savar", label: "Savar & Ashulia Zone", coords: "23.86°N, 90.26°E" },
  { key: "khulna", label: "Khulna Shipyard & South", coords: "22.85°N, 89.54°E" },
];

const HAZARDS: Array<{
  id: WeatherScenarioState["simulatedHazard"];
  title: string;
  effect: string;
}> = [
  {
    id: "None",
    title: "Normal Weather Mode",
    effect: "Clears simulated weather disruption flags on transport & production.",
  },
  {
    id: "Heavy Rainfall",
    title: "Heavy Rainfall Corridor",
    effect: "Models wet-road transit delays (+1.5 to +2 days) and elevated humidity.",
  },
  {
    id: "Flood Scenario",
    title: "Flood Scenario",
    effect: "Activates road + weather disruption, supplier delays, and high alert priority.",
  },
  {
    id: "Extreme Heat",
    title: "Extreme Heat Wave",
    effect: "Raises thermal strain warnings for motors, boilers, and cold storage chillers.",
  },
  {
    id: "Transport Disruption",
    title: "Transport Disruption",
    effect: "Simulates corridor blockage delaying inbound material deliveries.",
  },
];

export const Weather: React.FC = () => {
  const {
    weather,
    fetchWeather,
    setSimulatedWeatherHazard,
    activeFacility,
    askCopilot,
    navigate,
  } = useIndustry();

  const [loading, setLoading] = useState(false);
  const [customLat, setCustomLat] = useState("23.9999");
  const [customLon, setCustomLon] = useState("90.4203");

  const handleCitySelect = async (cityKey: string) => {
    setLoading(true);
    await fetchWeather(cityKey);
    setLoading(false);
  };

  const handleCustomFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(customLat);
    const lon = Number(customLon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    setLoading(true);
    await fetchWeather("custom", lat, lon);
    setLoading(false);
  };

  const live = weather.liveData;
  const current = live?.current;

  const rainRiskScore =
    weather.simulatedHazard === "Flood Scenario"
      ? 92
      : weather.simulatedHazard === "Heavy Rainfall"
      ? 78
      : current && current.rainMm > 10
      ? 70
      : current && current.rainMm > 2
      ? 42
      : 18;

  const heatRiskScore =
    weather.simulatedHazard === "Extreme Heat"
      ? 88
      : current && current.temperatureC >= 36
      ? 76
      : current && current.temperatureC >= 32
      ? 48
      : 22;

  const logisticsRiskScore =
    weather.simulatedHazard === "Flood Scenario" || weather.simulatedHazard === "Transport Disruption"
      ? 90
      : weather.simulatedHazard === "Heavy Rainfall"
      ? 68
      : activeFacility.supplyDisruption.weatherDisruption
      ? 64
      : 20;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            Weather & Environmental Risk
          </p>
          <h1 className="text-2xl font-bold text-slate-100">
            Weather Intelligence & Corridor Impact
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live Open-Meteo regional forecasts coupled with industrial logistics hazard modeling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCitySelect(weather.cityKey)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0D1422] border border-[#1E293B] hover:border-cyan-500/40 text-xs font-medium text-slate-200 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing Open-Meteo..." : "Refresh Live Forecast"}
          </button>
          <button
            onClick={() =>
              askCopilot(
                `Assess current weather (${live?.location}, hazard: ${weather.simulatedHazard}) impact on ${activeFacility.name} supply chain and thermal assets.`
              )
            }
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 transition-colors"
          >
            Analyze Weather Risk with AI
          </button>
        </div>
      </div>

      {/* Source transparency banner */}
      <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-slate-100">
              {live?.location ?? "Gazipur, Bangladesh"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Live feed:{" "}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className={`underline decoration-dotted underline-offset-2 ${
                  live?.isSimulated ? "text-amber-300" : "text-emerald-300"
                }`}
              >
                {live?.source ?? "Open-Meteo Live Forecast API"}
              </a>
              {live?.updatedAt ? ` · Updated ${new Date(live.updatedAt).toLocaleTimeString()}` : ""}
              <span className="text-slate-500">
                {" "}
                · Displayed in the 4 weather cards &amp; 5-day forecast chart below
              </span>
            </div>
          </div>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded bg-[#111C2D] border border-[#1E293B] text-slate-300">
          Active Hazard Mode:{" "}
          <span className={weather.simulatedHazard === "None" ? "text-emerald-300" : "text-amber-300"}>
            {weather.simulatedHazard}
          </span>
        </div>
      </div>

      {/* City Selector & Custom Coordinates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">
            Industrial Corridor Selector (Bangladesh Hubs)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {CITIES.map((c) => {
              const active = weather.cityKey === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => handleCitySelect(c.key)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    active
                      ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200"
                      : "bg-[#111C2D] border-[#1E293B] text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="text-xs font-semibold">{c.label}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">{c.coords}</div>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={handleCustomFetch}
          className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-200 mb-1 flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Custom Facility Coordinates
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Query Open-Meteo for any global plant latitude and longitude.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={customLat}
                  onChange={(e) => setCustomLat(e.target.value)}
                  className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-2.5 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={customLon}
                  onChange={(e) => setCustomLon(e.target.value)}
                  className="w-full rounded-lg bg-[#070B14] border border-[#1E293B] px-2.5 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-xs font-medium text-cyan-300 transition-colors"
          >
            Fetch Coordinates Forecast
          </button>
        </form>
      </div>

      {/* Current Conditions KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ambient Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2 tabular-nums">
            {current ? `${current.temperatureC.toFixed(1)} °C` : "30.8 °C"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Impacts motor & chiller thermal headroom
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Relative Humidity</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2 tabular-nums">
            {current ? `${current.humidityPct}%` : "74%"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Relevant to textile yarn & dry storage
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Current Precipitation</span>
            <CloudRain className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2 tabular-nums">
            {current ? `${current.rainMm.toFixed(1)} mm` : "0.4 mm"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Monitored for highway & loading dock impact
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Wind Speed</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2 tabular-nums">
            {current ? `${current.windKmh.toFixed(1)} km/h` : "12.6 km/h"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Port crane & barge transit indicator
          </div>
        </div>
      </div>

      {/* 5-Day Forecast Chart + Operational Risk Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                5-Day Forecast (Max Temp & Rainfall Volume)
              </h2>
              <p className="text-xs text-slate-400">
                Used to flag upcoming heat-stress windows and wet-weather transit delays
              </p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={live?.daily ?? []}>
                <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0D1422",
                    borderColor: "#1E293B",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="rainSumMm" name="Rain (mm)" fill="#00E5FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tempMaxC" name="Max Temp (°C)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Factory Impact Assessment
          </h2>

          {[
            {
              label: "Heavy Rainfall & Drainage Risk",
              score: rainRiskScore,
              detail:
                rainRiskScore >= 70
                  ? "Elevated road surface pooling and loading bay slowdowns expected."
                  : "Normal drainage and loading bay throughput.",
            },
            {
              label: "Extreme Heat / Thermal Load",
              score: heatRiskScore,
              detail:
                heatRiskScore >= 70
                  ? "High ambient temperature narrows cooling margin on critical drives."
                  : "Nominal ambient cooling headroom for plant equipment.",
            },
            {
              label: "Inbound Corridor Disruption",
              score: logisticsRiskScore,
              detail:
                logisticsRiskScore >= 65
                  ? "Supplier transit lead times adjusted upward; check Supply Chain buffer."
                  : "Corridor transit operating within planned schedule.",
            },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-[#111C2D] border border-[#1E293B]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200">{item.label}</span>
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    item.score >= 70
                      ? "text-rose-400"
                      : item.score >= 45
                      ? "text-amber-300"
                      : "text-emerald-300"
                  }`}
                >
                  {item.score}/100
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#070B14] mt-2 overflow-hidden">
                <div
                  className={`h-full ${
                    item.score >= 70
                      ? "bg-rose-500"
                      : item.score >= 45
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">{item.detail}</p>
            </div>
          ))}

          <button
            onClick={() => navigate("supply-chain")}
            className="w-full py-2 rounded-lg bg-[#111C2D] border border-[#1E293B] hover:border-cyan-500/40 text-xs text-slate-200 flex items-center justify-center gap-2 transition-colors"
          >
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            Inspect Coupled Supply Chain Impact
          </button>
        </div>
      </div>

      {/* Interactive Hazard Stress-Test */}
      <div className="rounded-xl bg-[#0D1422] border border-[#1E293B] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Regional Weather Hazard Stress-Test
            </h2>
            <p className="text-xs text-slate-400">
              Trigger corridor weather conditions to verify how supply delays, alerts, and recommendations respond across the platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {HAZARDS.map((h) => {
            const active = weather.simulatedHazard === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setSimulatedWeatherHazard(h.id)}
                className={`text-left p-3.5 rounded-xl border transition-colors ${
                  active
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-100"
                    : "bg-[#111C2D] border-[#1E293B] text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-xs font-semibold">{h.title}</div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{h.effect}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
