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
