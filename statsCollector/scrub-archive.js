#!/usr/bin/env node
/*
 * Scrub the stats archive in place, then report what was removed.
 *
 * run.sh runs this immediately before building all_files.tar.gz, so the
 * published archive never contains identifying fields.  It walks every *.json
 * under out_dir, scrubs, and rewrites only the records that actually changed --
 * scrubRecord() is idempotent, so on a steady-state run that is just the
 * records that arrived since the last pass.
 *
 * Canaries run on the scrubbed record, in memory, as part of the same pass.
 * That costs no extra I/O and answers the only question worth asking on an
 * unattended job: does anything sensitive SURVIVE the scrub?  A hit means the
 * policy has gone stale -- a setting or block shape nobody has classified
 * started arriving -- and the archive should not be trusted until it is
 * updated.  It is reported loudly and does not fail the run, because a stale
 * policy is not a reason to stop publishing a mostly-scrubbed archive.
 *
 *   node scrub-archive.js            # scrub $out_dir in place
 *   node scrub-archive.js --dry-run  # report only, write nothing
 */

"use strict";

const fs = require("fs");
const path = require("path");
const utils = require("./lib/util.js");
const scrub = require("./lib/scrub.js");

// Cap on distinct canary paths reported, so a systemic miss cannot print a
// million lines into the container log.
const MAX_CANARY_PATHS = 40;

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (!utils.isBaseDirectoryValid()) {
    console.error("Invalid output directory: " + utils.getBaseDirectory());
    return 1;
  }
  const root = utils.getBaseDirectory();

  console.log(
    "Scrubbing %s%s (policy: settings.json @ %s)",
    root,
    dryRun ? " [DRY RUN - nothing will be written]" : "",
    String(scrub.POLICY_SOURCE).slice(0, 8)
  );
  console.time("scrub");

  const stats = {};
  const canaries = {};
  let files = 0;
  let touched = 0;
  let errors = 0;

  for await (const file of walk(root)) {
    if (!file.endsWith(".json")) continue;
    files += 1;

    let rec;
    try {
      rec = JSON.parse(await fs.promises.readFile(file));
    } catch (e) {
      errors += 1;
      // Don't let a corrupt file bury the summary; the first few name the
      // problem and the count carries the rest.
      if (errors <= 10) console.error("  unreadable: %s (%s)", file, e.message);
      continue;
    }

    const changed = scrub.scrubRecord(rec, stats);

    if (changed && !dryRun) {
      try {
        await scrub.writeAtomic(file, rec);
      } catch (e) {
        errors += 1;
        if (errors <= 10) console.error("  unwritable: %s (%s)", file, e.message);
        continue;
      }
    }
    if (changed) touched += 1;

    // The scrubbed record is already in hand -- canary it here rather than
    // re-reading and re-scrubbing the corpus in a second pass.
    for (const hit of scrub.canaryRecord(rec)) {
      canaries[hit] = (canaries[hit] || 0) + 1;
    }

    if (files % 100000 === 0) console.log("  ... %d files", files);
  }

  console.timeEnd("scrub");
  console.log("  files scanned  : %d", files);
  console.log("  unreadable     : %d", errors);
  console.log("  files %s: %d", dryRun ? "needing work " : "rewritten    ", touched);

  const keys = Object.keys(stats).sort();
  if (keys.length > 0) {
    console.log("\n  Removed:");
    const width = Math.max(...keys.map((k) => k.length));
    for (const key of keys) {
      console.log("    %s %s", key.padEnd(width), String(stats[key]).padStart(10));
    }
  }

  const canaryKeys = Object.keys(canaries).sort(
    (a, b) => canaries[b] - canaries[a] || a.localeCompare(b)
  );
  if (canaryKeys.length > 0) {
    console.log("\n  !! CANARIES FIRED -- the field policy is incomplete.");
    console.log("     Something sensitive SURVIVED the scrub. Do not trust this");
    console.log("     archive until these are understood and lib/scrub.js updated.");
    for (const key of canaryKeys.slice(0, MAX_CANARY_PATHS)) {
      console.log("     %s %s", key.padEnd(56), String(canaries[key]).padStart(10));
    }
    if (canaryKeys.length > MAX_CANARY_PATHS) {
      console.log("     ... and %d more distinct paths", canaryKeys.length - MAX_CANARY_PATHS);
    }
  } else {
    console.log("\n  No canaries fired: nothing matching a Wi-Fi key, coordinate pair,");
    console.log("  e-mail address or IP address survives the scrub.");
  }

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error("Scrub failed:", e);
    process.exit(1);
  });
