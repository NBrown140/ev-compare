const currencyFormatters = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
    );
  }
  return currencyFormatters.get(currency)!;
}

export function formatCurrency(value: number, currency: string): string {
  return getCurrencyFormatter(currency).format(value);
}

export function formatNumber(value: number | null, decimals = 0): string {
  if (value == null) return "—";
  return value.toLocaleString("en", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatMarketName(market: string): string {
  return market.toUpperCase();
}

const VARIANT_ABBREVIATIONS: Record<string, string> = {
  "Long Range": "LR",
  "All-Wheel Drive": "AWD",
  "Extra-Long": "XL",
  "Rear-Wheel Drive": "RWD",
  "Front-Wheel Drive": "FWD",
  Performance: "Perf",
  Standard: "Std",
  Extended: "Ext",
  Comfort: "Comf",
};

/** Shorten a variant name to fit in a tooltip (max ~30 chars). */
export function shortenVariant(variant: string | null, maxLen = 30): string | null {
  if (!variant) return null;
  if (variant.length <= maxLen) return variant;

  let short = variant;
  for (const [long, abbr] of Object.entries(VARIANT_ABBREVIATIONS)) {
    short = short.replace(new RegExp(long, "gi"), abbr);
    if (short.length <= maxLen) return short;
  }

  // Truncate with ellipsis as last resort
  if (short.length > maxLen) {
    return short.slice(0, maxLen - 1) + "\u2026";
  }
  return short;
}
