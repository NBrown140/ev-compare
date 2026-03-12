import MarketSelector from "@/components/MarketSelector";
import { useMarkets } from "@/hooks/useMarketData";

interface HomeProps {
  onSelectMarket: (market: string) => void;
}

export default function Home({ onSelectMarket }: HomeProps) {
  const markets = useMarkets();

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Compare Electric Vehicles</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Community-maintained data on EVs across markets. Choose a market to
          explore.
        </p>
      </div>
      <MarketSelector markets={markets} onSelect={onSelectMarket} />
    </div>
  );
}
