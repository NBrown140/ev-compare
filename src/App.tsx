import { useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import MarketDashboard from "@/pages/MarketDashboard";

export default function App() {
  const [market, setMarket] = useState<string | null>(null);

  return (
    <Layout>
      {market ? (
        <MarketDashboard market={market} onBack={() => setMarket(null)} />
      ) : (
        <Home onSelectMarket={setMarket} />
      )}
      <Analytics />
      <SpeedInsights />
    </Layout>
  );
}
