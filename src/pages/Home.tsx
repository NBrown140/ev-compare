import MarketSelector from "@/components/MarketSelector";
import { useMarkets } from "@/hooks/useMarketData";

interface HomeProps {
  onSelectMarket: (market: string) => void;
}

export default function Home({ onSelectMarket }: HomeProps) {
  const markets = useMarkets();

  return (
    <div>
      {/* Hero */}
      <div className="animate-fade-in-up text-center py-12 sm:py-16 lg:py-20">
        <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
          Most people buy on vibes.
          <br />
          You buy on evidence.
        </h1>
        <p className="text-lg text-outline max-w-2xl mx-auto">
          Every spec. Every price. Every source cited.
        </p>
      </div>

      {/* Market cards */}
      <div className="mb-16">
        <div className="text-xs font-medium uppercase tracking-widest text-outline mb-4">
          Choose a market
        </div>
        <MarketSelector markets={markets} onSelect={onSelectMarket} />
      </div>

      {/* Contribute & Sponsor */}
      <div className="border-t border-outline-variant pt-8 grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto text-sm text-outline">
        <div>
          <h3 className="font-semibold text-on-surface mb-2">🛠️ Contribute data</h3>
          <p className="mb-2">
            All vehicle data is open-source on GitHub. Spot an error, a missing vehicle, or an entire market? Pull requests are welcome.
          </p>
          <a
            href="https://github.com/NBrown140/ev-compare/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-dim transition-colors"
          >
            Read the contributing guide
          </a>
        </div>
        <div>
          <h3 className="font-semibold text-on-surface mb-2">💜 Sponsor this project</h3>
          <p className="mb-2">
            EV Compare is free, ad-free, and funded by people who care about transparent data. Your support keeps it running.
          </p>
          <a
            href="https://github.com/sponsors/NBrown140"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-dim transition-colors"
          >
            Sponsor on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
