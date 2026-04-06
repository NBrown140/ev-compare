import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import MarketDashboard from "@/pages/MarketDashboard";

type NavState = {
  market: string | null;
  vehicle: string | null;
  tab: "table" | "charts";
  compare: string[];
  comparePage: boolean;
  regions: string[];
};

function readUrlState(): NavState {
  const p = new URLSearchParams(location.search);
  const compareRaw = p.get("compare");
  const regionsRaw = p.get("regions");
  return {
    market: p.get("market"),
    vehicle: p.get("vehicle"),
    tab: (p.get("tab") as "table" | "charts") ?? "table",
    compare: compareRaw ? compareRaw.split(",").filter(Boolean) : [],
    comparePage: p.get("view") === "compare",
    regions: regionsRaw ? regionsRaw.split(",").filter(Boolean) : [],
  };
}

function writeUrl(state: NavState, push: boolean) {
  const p = new URLSearchParams();
  if (state.market) p.set("market", state.market);
  if (state.vehicle) p.set("vehicle", state.vehicle);
  if (state.tab !== "table") p.set("tab", state.tab);
  if (state.compare.length > 0) p.set("compare", state.compare.join(","));
  if (state.comparePage) p.set("view", "compare");
  if (state.regions.length > 0) p.set("regions", state.regions.join(","));
  const qs = p.toString();
  if (push) history.pushState(null, "", qs ? `?${qs}` : "/");
  else history.replaceState(null, "", qs ? `?${qs}` : "/");
}

export default function App() {
  const [nav, setNav] = useState<NavState>(readUrlState);

  useEffect(() => {
    const onPop = () => setNav(readUrlState());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function navigate(next: NavState, push = true) {
    writeUrl(next, push);
    setNav(next);
  }

  function toggleCompare(id: string) {
    const next = nav.compare.includes(id)
      ? nav.compare.filter((c) => c !== id)
      : nav.compare.length < 5
        ? [...nav.compare, id]
        : nav.compare;
    navigate({ ...nav, compare: next }, false);
  }

  function clearCompare() {
    navigate({ ...nav, compare: [], comparePage: false }, false);
  }

  return (
    <Layout
      onNavigateHome={() =>
        navigate({ market: null, vehicle: null, tab: "table", compare: [], comparePage: false, regions: [] })
      }
    >
      {nav.market ? (
        <MarketDashboard
          market={nav.market}
          selectedVehicleId={nav.vehicle}
          activeTab={nav.tab}
          compareIds={nav.compare}
          comparePage={nav.comparePage}
          selectedRegions={nav.regions}
          onBack={() => navigate({ market: null, vehicle: null, tab: "table", compare: [], comparePage: false, regions: [] })}
          onSelectVehicle={(id) =>
            navigate({ ...nav, vehicle: id, tab: "table", comparePage: false })
          }
          onTabChange={(tab) => navigate({ ...nav, tab }, false)}
          onToggleCompare={toggleCompare}
          onClearCompare={clearCompare}
          onCompare={() => navigate({ ...nav, vehicle: null, comparePage: true })}
          onBackFromCompare={() => navigate({ ...nav, comparePage: false })}
          onRegionsChange={(regions) => navigate({ ...nav, regions }, false)}
        />
      ) : (
        <Home
          onSelectMarket={(market) =>
            navigate({ market, vehicle: null, tab: "table", compare: [], comparePage: false, regions: [] })
          }
        />
      )}
      <Analytics />
      <SpeedInsights />
    </Layout>
  );
}
