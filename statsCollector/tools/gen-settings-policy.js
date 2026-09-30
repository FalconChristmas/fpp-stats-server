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
 * The snapshot also carries each setting's effective default, so the
 * settingsPopular handler can count only values someone actually changed.  FPP's
 * first-boot wizard writes several settings on every install, so "present in the
 * settings file" no longer means "changed by the user".
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

// Defaults for selects whose options come from an API call rather than
// settings.json, so the first-option rule below cannot see them.  Taken from the
// value FPP writes/assumes when nothing is chosen.
const DEFAULT_OVERRIDES = {
  piRTC: "N",
};

// The value a setting has when nobody touched it, mirroring what PrintSetting()
// in fpp's www/common.php renders for an unset key: the declared default, else an
// unchecked checkbox, else the first entry of a select's static option list.
// Returns undefined when that cannot be known from the declaration alone.
function effectiveDefault(key, def) {
  if (key in DEFAULT_OVERRIDES) return DEFAULT_OVERRIDES[key];
  if ("default" in def) return String(def.default);
  if (def.type === "checkbox") return "uncheckedValue" in def ? String(def.uncheckedValue) : "0";
  if (def.type === "select" && def.options && typeof def.options === "object") {
    const values = Object.values(def.options);
    if (values.length > 0) return String(values[0]);
  }
  return undefined;
}

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

  // Keep only what the scrub policy and settingsPopular read.  The rest of
  // settings.json is UI layout: labels, help text, option maps, restart flags.
  // Carrying it would make the snapshot a 100KB diff every time someone rewords
  // a tooltip.
  const out = {};
  for (const key of Object.keys(settings).sort()) {
    const def = settings[key];
    if (!def || typeof def !== "object") continue;
    const entry = {};
    if (def.type) entry.type = def.type;
    if (def.pii) entry.pii = true;
    const dflt = effectiveDefault(key, def);
    if (dflt !== undefined) entry.default = dflt;
    out[key] = entry;
  }

  const doc = {
    _comment: "GENERATED - do not edit by hand. Trimmed snapshot of www/settings.json from FalconChristmas/fpp, reduced to the type/pii declarations lib/scrub.js needs and the effective defaults handlers/settingsPopular.js compares against. Regenerate with: node statsCollector/tools/gen-settings-policy.js",
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
