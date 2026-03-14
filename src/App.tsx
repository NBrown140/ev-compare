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
};

function readUrlState(): NavState {
  const p = new URLSearchParams(location.search);
  return {
    market: p.get("market"),
    vehicle: p.get("vehicle"),
    tab: (p.get("tab") as "table" | "charts") ?? "table",
  };
}

function writeUrl(state: NavState, push: boolean) {
  const p = new URLSearchParams();
  if (state.market) p.set("market", state.market);
  if (state.vehicle) p.set("vehicle", state.vehicle);
  if (state.tab !== "table") p.set("tab", state.tab);
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

  return (
    <Layout
      onNavigateHome={() =>
        navigate({ market: null, vehicle: null, tab: "table" })
      }
    >
      {nav.market ? (
        <MarketDashboard
          market={nav.market}
          selectedVehicleId={nav.vehicle}
          activeTab={nav.tab}
          onBack={() => navigate({ market: null, vehicle: null, tab: "table" })}
          onSelectVehicle={(id) =>
            navigate({ ...nav, vehicle: id, tab: "table" })
          }
          onTabChange={(tab) => navigate({ ...nav, tab }, false)}
        />
      ) : (
        <Home
          onSelectMarket={(market) =>
            navigate({ market, vehicle: null, tab: "table" })
          }
        />
      )}
      <Analytics />
      <SpeedInsights />
    </Layout>
  );
}
