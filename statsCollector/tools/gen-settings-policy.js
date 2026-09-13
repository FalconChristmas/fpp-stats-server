#!/usr/bin/env node
/*
 * Regenerate lib/settings-policy.json from FPP's www/settings.json.
 *
 * The scrubber decides what to keep from a declaration -- a setting says it is
 * `pii` or `password` (value must never survive) or `text` (free text, withheld
 * unless allowlisted).  That declaration lives in the fpp client repo, not here,
 * so we vendor a trimmed snapshot rather than depend on a network fetch inside a
 * container that runs unattended every four hours.
 *
 * Run this when fpp adds settings.  A setting fpp knows about but this snapshot
 * does not is treated as undeclared and falls back to the value-shape heuristic,
 * which withholds free text -- so a stale snapshot errs toward removing data,
 * never toward leaking it.
 *
 *   node statsCollector/tools/gen-settings-policy.js
 */

"use strict";
const fs = require("fs");
const path = require("path");

const SOURCE = "https://raw.githubusercontent.com/FalconChristmas/fpp/master/www/settings.json";
const COMMITS = "https://api.github.com/repos/FalconChristmas/fpp/commits?path=www/settings.json&per_page=1";
const OUT = path.join(__dirname, "..", "lib", "settings-policy.json");

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "fpp-stats-server" } });
  if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
  return res.json();
}

async function main() {
  const source = await getJson(SOURCE);
  const commit = (await getJson(COMMITS))[0];

  const settings = source.settings;
  if (!settings || Object.keys(settings).length === 0) {
    throw new Error("settings.json carried no settings block");
  }

  // Keep only what the policy reads.  The rest of settings.json is UI layout:
  // labels, help text, option maps, restart flags.  None of it affects what is
  // removed from a record, and carrying it would make the snapshot a 100KB diff
  // every time someone rewords a tooltip.
  const out = {};
  for (const key of Object.keys(settings).sort()) {
    const def = settings[key];
    if (!def || typeof def !== "object") continue;
    const entry = {};
    if (def.type) entry.type = def.type;
    if (def.pii) entry.pii = true;
    out[key] = entry;
  }

  const doc = {
    _comment: "GENERATED - do not edit by hand. Trimmed snapshot of www/settings.json from FalconChristmas/fpp, reduced to the type/pii declarations lib/scrub.js needs. Regenerate with: node statsCollector/tools/gen-settings-policy.js",
    _source: "https://github.com/FalconChristmas/fpp/blob/master/www/settings.json",
    _sourceCommit: commit.sha,
    _sourceCommitDate: commit.commit.committer.date,
    settings: out,
  };

  fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log("Wrote %s (%d settings, source %s)", OUT, Object.keys(out).length, commit.sha.slice(0, 8));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
