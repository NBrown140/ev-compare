import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MARKETS_DIR = path.join(ROOT, "data", "markets");
const WAYBACK_PREFIX = "https://web.archive.org/web/";
const CDX_API = "https://web.archive.org/cdx/search/cdx";
const SAVE_API = "https://web.archive.org/save";
const SAVE_STATUS_API = "https://web.archive.org/save/status";

// Rate limit: 15s between save attempts to avoid getting throttled
const SAVE_DELAY_MS = 15_000;
// Max time to wait for a save job to complete (official max is 2min, add buffer)
const SAVE_POLL_TIMEOUT_MS = 240_000;
const SAVE_POLL_INTERVAL_MS = 5_000;

// Reject snapshots more than 30 days away from date_viewed
const MAX_SNAPSHOT_AGE_DAYS = 30;

interface Source {
  url: string;
  date_viewed: string;
  fields: string[];
}

type SourcesMap = Record<string, Source[]>;

interface Stats {
  verified: number;
  updated: number;
  saved: number;
  failed: number;
  dead: number;
  skipped: number;
}

function parseWaybackUrl(url: string): { timestamp: string; original: string } | null {
  if (!url.startsWith(WAYBACK_PREFIX)) return null;
  const rest = url.slice(WAYBACK_PREFIX.length);
  const slashIndex = rest.indexOf("/");
  if (slashIndex === -1) return null;
  return {
    timestamp: rest.slice(0, slashIndex),
    original: rest.slice(slashIndex + 1),
  };
}

function parseTimestamp(ts: string): Date {
  // Wayback timestamps: YYYYMMDDHHmmss (or shorter, e.g. YYYYMMDD)
  const y = parseInt(ts.slice(0, 4));
  const m = parseInt(ts.slice(4, 6) || "1") - 1;
  const d = parseInt(ts.slice(6, 8) || "1");
  const h = parseInt(ts.slice(8, 10) || "0");
  const min = parseInt(ts.slice(10, 12) || "0");
  const s = parseInt(ts.slice(12, 14) || "0");
  return new Date(y, m, d, h, min, s);
}

function isSnapshotTooFar(found: string, viewedDate: Date): boolean {
  const foundDate = parseTimestamp(found);
  const diffMs = Math.abs(viewedDate.getTime() - foundDate.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > MAX_SNAPSHOT_AGE_DAYS;
}

async function queryClosestSnapshot(
  originalUrl: string,
  timestamp: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      url: originalUrl,
      output: "json",
      limit: "1",
      closest: timestamp,
      sort: "closest",
    });
    const res = await fetch(`${CDX_API}?${params}`);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.trim()) return null;
    const rows = JSON.parse(text);
    // First row is headers, second is data
    if (rows.length < 2) return null;
    // Timestamp is at index 1
    return rows[1][1] as string;
  } catch {
    return null;
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return res.ok;
  } catch {
    // Network error — assume reachable (don't skip on transient failures)
    return true;
  }
}

function getAuthHeader(): string | null {
  const accessKey = process.env.WAYBACK_ACCESS_KEY;
  const secretKey = process.env.WAYBACK_SECRET_KEY;
  if (!accessKey || !secretKey) return null;
  return `LOW ${accessKey}:${secretKey}`;
}

async function saveToWayback(originalUrl: string): Promise<string | null> {
  const auth = getAuthHeader();
  if (!auth) return null;

  try {
    const res = await fetch(SAVE_API, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: originalUrl }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`    Save API returned ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }
    const data = await res.json() as { job_id?: string; message?: string };
    if (!data.job_id) {
      console.warn(`    Save API returned no job_id: ${JSON.stringify(data).slice(0, 200)}`);
      return null;
    }

    // Poll for job completion with exponential backoff
    console.log(`    Waiting for job ${data.job_id}...`);
    const deadline = Date.now() + SAVE_POLL_TIMEOUT_MS;
    let pollInterval = SAVE_POLL_INTERVAL_MS;
    while (Date.now() < deadline) {
      await sleep(pollInterval);
      try {
        const statusRes = await fetch(`${SAVE_STATUS_API}/${data.job_id}`, {
          headers: { "Authorization": auth },
        });
        if (!statusRes.ok) {
          pollInterval = Math.min(pollInterval * 2, 30_000);
          continue;
        }
        // Reset backoff on successful poll
        pollInterval = SAVE_POLL_INTERVAL_MS;
        const status = await statusRes.json() as { status?: string; timestamp?: string; message?: string };
        if (status.status === "success" && status.timestamp) {
          return status.timestamp;
        }
        if (status.status === "error") {
          console.warn(`    Save job failed: ${status.message ?? "unknown error"}`);
          return null;
        }
      } catch (e) {
        console.warn(`    Poll error (retrying in ${pollInterval / 1000}s): ${e instanceof Error ? e.message : e}`);
        pollInterval = Math.min(pollInterval * 2, 30_000);
      }
    }

    console.warn(`    Save job timed out after ${SAVE_POLL_TIMEOUT_MS / 1000}s`);
    return null;
  } catch (e) {
    console.warn(`    Save request failed: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processUrl(
  url: string,
  dateViewed: Date,
  checkOnly: boolean,
  stats: Stats
): Promise<string> {
  const parsed = parseWaybackUrl(url);
  if (!parsed) {
    console.warn(`  SKIP: not a Wayback URL: ${url}`);
    stats.skipped++;
    return url;
  }

  const { original } = parsed;

  // Query CDX for the closest snapshot to when the page was viewed
  const viewedTimestamp = dateViewed.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const existingTimestamp = await queryClosestSnapshot(original, viewedTimestamp);
  const hasRecentSnapshot = existingTimestamp && !isSnapshotTooFar(existingTimestamp, dateViewed);

  if (hasRecentSnapshot) {
    const newUrl = `${WAYBACK_PREFIX}${existingTimestamp}/${original}`;
    if (newUrl === url) {
      console.log(`  OK: ${original} (timestamp already correct)`);
      stats.verified++;
    } else {
      if (checkOnly) {
        console.log(`  UPDATE NEEDED: ${original} (-> ${existingTimestamp})`);
      } else {
        console.log(`  UPDATED: ${original} (-> ${existingTimestamp})`);
      }
      stats.updated++;
    }
    return checkOnly ? url : newUrl;
  }

  // No recent snapshot — report why
  if (existingTimestamp) {
    console.log(`  TOO FAR: ${original} (closest snapshot ${existingTimestamp} is >${MAX_SNAPSHOT_AGE_DAYS} days from date_viewed)`);
  }

  if (checkOnly) {
    console.log(`  NO SNAPSHOT: ${original}`);
    stats.failed++;
    return url;
  }

  // Check if the original URL is still live before attempting to save
  const reachable = await isUrlReachable(original);
  if (!reachable) {
    console.warn(`  DEAD URL: ${original} (returns 404 or unreachable)`);
    stats.dead++;
    return url;
  }

  // Save a fresh snapshot
  if (!getAuthHeader()) {
    console.warn(`  NO CREDENTIALS: ${original} (set WAYBACK_ACCESS_KEY and WAYBACK_SECRET_KEY)`);
    stats.failed++;
    return url;
  }

  console.log(`  SAVING: ${original}...`);
  const newTimestamp = await saveToWayback(original);

  if (!newTimestamp) {
    console.warn(`  SAVE FAILED: ${original}`);
    stats.failed++;
    return url;
  }

  const newUrl = `${WAYBACK_PREFIX}${newTimestamp}/${original}`;
  console.log(`  SAVED: ${original} (${newTimestamp})`);
  stats.saved++;
  return newUrl;
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check-only");
  const marketIndex = args.indexOf("--market");
  const marketFilter = marketIndex !== -1 ? args[marketIndex + 1] : null;

  if (checkOnly) {
    console.log("Running in check-only mode (no saves, no file modifications)\n");
  } else if (!getAuthHeader()) {
    console.warn(
      "Warning: WAYBACK_ACCESS_KEY and WAYBACK_SECRET_KEY not set.\n" +
      "Existing snapshots will be updated, but new pages cannot be saved.\n" +
      "Get credentials at https://archive.org/account/s3.php\n"
    );
  }

  const sourceFiles = fs
    .readdirSync(MARKETS_DIR)
    .filter((f) => f.endsWith(".sources.json"))
    .filter((f) => !marketFilter || f === `${marketFilter}.sources.json`)
    .sort();

  if (sourceFiles.length === 0) {
    console.error("No source files found" + (marketFilter ? ` for market "${marketFilter}"` : ""));
    process.exit(1);
  }

  const totalStats: Stats = { verified: 0, updated: 0, saved: 0, failed: 0, dead: 0, skipped: 0 };

  for (const file of sourceFiles) {
    const market = path.basename(file, ".sources.json");
    console.log(`\n=== Market: ${market} ===\n`);

    const filePath = path.join(MARKETS_DIR, file);
    const sources: SourcesMap = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Collect all source entries with their locations
    const sourceEntries: { vehicleId: string; sourceIndex: number; source: Source }[] = [];
    for (const [vehicleId, entries] of Object.entries(sources)) {
      for (let i = 0; i < entries.length; i++) {
        sourceEntries.push({ vehicleId, sourceIndex: i, source: entries[i] });
      }
    }

    // Deduplicate by url+date_viewed (same URL viewed on the same date only needs one check)
    const urlDateResults = new Map<string, string>();
    const uniqueKeys = [...new Set(sourceEntries.map((e) => `${e.source.date_viewed}|${e.source.url}`))];

    console.log(`Processing ${uniqueKeys.length} unique URL+date pairs...\n`);

    let lastSaveAttempt = 0;
    for (const key of uniqueKeys) {
      const [dateViewed, url] = [key.slice(0, 10), key.slice(11)];
      // Rate limit: wait between save attempts (not just successes)
      if (lastSaveAttempt > 0) {
        const sinceLast = Date.now() - lastSaveAttempt;
        if (sinceLast < SAVE_DELAY_MS) {
          await sleep(SAVE_DELAY_MS - sinceLast);
        }
      }
      const prevFailed = totalStats.failed;
      const prevSaved = totalStats.saved;
      const newUrl = await processUrl(url, new Date(dateViewed), checkOnly, totalStats);
      // Track any save attempt (saved or failed, but not skipped/updated/verified)
      const attempted = (totalStats.saved + totalStats.failed) > (prevSaved + prevFailed);
      if (attempted) lastSaveAttempt = Date.now();
      urlDateResults.set(key, newUrl);
    }

    if (!checkOnly) {
      // Apply results back to sources
      let modified = false;
      for (const entry of sourceEntries) {
        const key = `${entry.source.date_viewed}|${entry.source.url}`;
        const newUrl = urlDateResults.get(key);
        if (newUrl && newUrl !== entry.source.url) {
          sources[entry.vehicleId][entry.sourceIndex].url = newUrl;
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(sources, null, 2) + "\n");
        console.log(`\nWrote updated ${file}`);
      } else {
        console.log(`\nNo changes needed for ${file}`);
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`  Verified (already correct): ${totalStats.verified}`);
  console.log(`  Updated (timestamp fixed):  ${totalStats.updated}`);
  console.log(`  Saved (new snapshot):       ${totalStats.saved}`);
  console.log(`  Dead (original URL gone):   ${totalStats.dead}`);
  console.log(`  Failed:                     ${totalStats.failed}`);
  console.log(`  Skipped (not Wayback URL):  ${totalStats.skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
