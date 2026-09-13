/*
 * Scrub identifying fields from a stats record, preserving the record.
 *
 * This removes the fields the stats server never reads and the small free-text
 * surface that leaks household detail, and leaves everything analytically
 * useful -- including the device uuid (collision detection) and peer uuids
 * (show deduplication), which are deliberately KEPT.
 *
 * What it removes
 *   capeInfo.serialNumber   ) together these are the join key to a purchase record
 *   capeInfo.cs             )
 *   capeInfo.vendor.*       reduced to just `name` -- the block carries sole
 *                           traders' personal names and in one case a street
 *                           address.  Matches what the live client already does
 *                           for peer capes.
 *   multisync[].capeInfo.*  same treatment, defensively -- peer cape records
 *                           should never have carried a serial, but old clients
 *                           are old.
 *   settings.<free text>    only the household-identifying ones.  Audio/video
 *                           DEVICE names are kept -- see SETTING_HARDWARE_KEEP.
 *                           Values replaced with "__SET__", which keeps
 *                           set-vs-unset analytics and drops the string.
 *   <unknown top-level>     anything outside TOP_LEVEL_KEEP, wholesale.
 *
 * What it deliberately KEEPS
 *   uuid / the directory name   collision detection.  A rotating id would hide
 *                               collided directories entirely.
 *   capeInfo.verifiedKeyId      licence-abuse detection; one of seven
 *                               compiled-in values, coarser than the vendor
 *                               name.  See CAPE_KEEP.
 *   multisync[].uuid            the deduplication key.  Dropping it makes the
 *                               published show-size distribution wrong by a
 *                               third.
 *   TimeZone, Locale, and the   analytically load-bearing (the show-graph
 *   resolution/RTC selects      validation runs on UTC offset) and not free
 *                               text in practice.
 *   every checkbox and number   cannot carry a hostname or a person's name.
 *
 * scrubRecord() is idempotent: a second pass over an already-scrubbed record
 * changes nothing and reports no change.
 */

"use strict";

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Field policy.  Edit these lists rather than the code below.
// ---------------------------------------------------------------------------

// Removed from capeInfo wherever it appears (own record and peer records).
// `verifiedKeyId` is deliberately NOT here -- see CAPE_KEEP below.
const CAPE_DROP = ["serialNumber", "cs"];

// Kept on purpose, documented so nobody "tidies" it into CAPE_DROP later.
//
//   verifiedKeyId -- the signing key id.  Retained for licence-abuse detection:
//   a cape signed by a key that does not match its claimed vendor is only
//   visible if this field is present.  Safe to keep on three grounds: seven
//   distinct values across the corpus (coarser than vendor.name, which we also
//   keep); bounded by construction, since CapeUtils.cpp sets it from a
//   compiled-in map and removes it outright when the signature does not verify,
//   so an EEPROM cannot inject an arbitrary string; and the join risk is
//   serialNumber + cs, which this module does remove.
const CAPE_KEEP = ["verifiedKeyId"];

// The vendor block is reduced to these keys.  Everything else (url, email,
// phone, forum, image, address) goes.
const VENDOR_KEEP = ["name"];

// Top-level blocks the payload is allowed to contain.  Anything else is dropped.
//
// This is an allowlist because a denylist only removes what someone thought to
// name.  The corpus contains historical shapes nobody remembered: `interfaces`
// (full `ip addr` output, including addr_info[].local and .broadcast) and
// `advancedView.IPs[]` both carry real LAN addresses.  An allowlist drops those,
// and drops whatever the next one turns out to be.
//
// Derived from every top-level key present across the corpus, so nothing in use
// today is lost.
const TOP_LEVEL_KEEP = new Set([
  "uuid", "uuidSource", "ts", "statsReason", "timezone", "installAge",
  "systemInfo", "capeInfo", "outputProcessors", "files", "models",
  "multisync", "multisyncShape", "plugins", "schedule", "settings",
  "network", "memory", "sequenceShape",
  "universe_input", "output_e131", "output_panel", "output_pannel",
  "output_other", "output_pixel_pi", "output_pixel_bbb", "output_pwm",
  // The record of the user's consent to stats collection: {value, date, via,
  // version, textHash}, or [] when the client has nothing to report.  It is the
  // evidence that collection was agreed to, which is precisely what a
  // compliance cleanup must not destroy -- an allowlist derived before this
  // block existed would have deleted it from 786 records.  It carries no
  // household detail: a timestamp, an enumerable source, and a hash of the
  // consent text shown.
  "consent",
]);

// Audio/video device identifiers are KEPT.  They are hardware strings --
// pcm510x, SoundBlaster Play! 3 -- and they are how the project knows which
// kernel modules, plugins and USB devices an image has to support.  The harm is
// public republication on an unauthenticated endpoint, which is fixed in the
// summary, not by destroying the field here.  ForceAudioId is the one with a
// known bad value (a first name); it has 17 distinct values in total, so the fix
// is a value-level review of that short list -- see VALUE_DENYLIST -- not
// blanking a field the project needs.
const SETTING_HARDWARE_KEEP = new Set([
  "AudioOutput", "AudioMixerDevice", "ForceAudioId", "VideoOutput",
  "AES67Interface",
]);

// Non-enumerable settings kept anyway because they are analytically
// load-bearing and cannot carry household detail.  Everything else without a
// declaration is kept only if its value is numeric or boolean (see
// valueIsSafe).
const SETTING_KEEP_ANYWAY = new Set([
  "TimeZone",
  "Locale",
  "piRTC",
  "ForceHDMIResolution",
  "ForceHDMIResolutionPort2",
  "gitBranch",
  // Undeclared in settings.json but enumerable in fact, verified against the
  // live corpus.  Without these the undeclared-free-text backstop blanks them:
  // wifiDrivers alone appears in 109,603 records and has exactly three values
  // ("Kernel", "External", ""), which is fleet data, not household detail.
  // AudioBackend has two ("pipewire", "alsa").  Re-check with a value survey if
  // fpp ever starts setting them from user input.
  "wifiDrivers",
  "AudioBackend",
]);

// Specific values found to carry a personal name.  These are settings we keep
// as a field but must blank for particular values.
//
// TODO: populate from a review of the distinct values in the live corpus.  The
// entry below is the specimen the self-test uses; it is not a real value.
const VALUE_DENYLIST = {
  ForceAudioId: new Set(["Firstname's USB Audio"]),
};

const SCRUB_MARKER = "__SET__";

// ---------------------------------------------------------------------------
// Declarations, loaded from the vendored snapshot of fpp's www/settings.json.
//
// There is deliberately no fallback.  An earlier Python version fell back to a
// five-key hardcoded list when settings.json was missing, which left the
// "declared" set empty -- and an empty declared set flips the undeclared
// free-text heuristic into blanking every non-numeric string, including
// fppMode, LogLevel_*, MediaBackend, WifiRegulatoryDomain and a dozen other
// enumerable selects that are basic fleet data.  On an unattended job that
// rewrites records in place, failing loudly beats silently destroying columns.
// ---------------------------------------------------------------------------

function loadDeclarations() {
  const doc = require("./settings-policy.json");
  const settings = doc && doc.settings;
  if (!settings || Object.keys(settings).length === 0) {
    throw new Error(
      "lib/settings-policy.json is missing or empty. Regenerate it with " +
      "`node statsCollector/tools/gen-settings-policy.js`. Refusing to scrub " +
      "without the declarations: an empty policy would blank every enumerable setting."
    );
  }

  const declared = new Set(Object.keys(settings));
  const sensitive = new Set();
  const freetext = new Set();
  for (const [key, def] of Object.entries(settings)) {
    if (!def || typeof def !== "object") continue;
    if (def.pii || def.type === "password") sensitive.add(key);
    if (def.type === "text") freetext.add(key);
  }
  return { declared, sensitive, freetext, source: doc._sourceCommit };
}

const DECLARATIONS = loadDeclarations();

// Values that must never survive: declared pii or a credential.
const SETTING_SCRUB = DECLARATIONS.sensitive;

// Every key settings.json knows about at all.  This is what tells a historical
// key apart from a current one.
const SETTING_DECLARED = DECLARATIONS.declared;

// Free text that is withheld: everything declared `type: text` except the
// hardware identifiers and load-bearing selects kept on purpose above.
//
// Being described by settings.json says what a field IS, not that it is safe.
// MultiSyncExtraRemotes is `type: text` carrying a list of LAN addresses, and an
// earlier rule kept it precisely because it was declared.  Free text is withheld
// unless allowlisted, so a text setting added later is withheld by default.
const SETTING_FREETEXT = new Set(
  [...DECLARATIONS.freetext].filter(
    (k) => !SETTING_HARDWARE_KEEP.has(k) && !SETTING_KEEP_ANYWAY.has(k)
  )
);

// ---------------------------------------------------------------------------
// Canaries -- run against the record AFTER scrubbing it, to catch categories
// this policy does not know about.
//
// Running them on the raw record is the wrong question and gives a useless
// answer: on the real corpus the e-mail canary fired on 38% of files, every one
// of them capeInfo.vendor.email -- the vendor's own business contact, which the
// vendor-block reduction already removes.  A canary that fires on data the
// policy handles correctly trains you to ignore it.
//
// Asking instead "does anything sensitive SURVIVE the scrub" makes a hit mean
// something: the policy is incomplete and the scrub should not be trusted until
// it is updated.
// ---------------------------------------------------------------------------

const CANARY = {
  psk_or_passphrase: /\b(psk|passphrase|wpa_?key)\b/i,
  password_like: /\b(password|passwd|pwd|emailpass)\b/i,
  email_address: /[\w.+-]+@[\w-]+\.[\w.-]+/,
  coordinates: /\b(latitude|longitude)\b/i,
  public_ipv4: new RegExp(
    "\\b(?!10\\.|127\\.|169\\.254\\.|192\\.168\\.|172\\.(?:1[6-9]|2\\d|3[01])\\.|0\\.|22[4-9]\\.|23\\d\\.|24\\d\\.|25[0-5]\\.)" +
    "(?:\\d{1,3}\\.){3}\\d{1,3}\\b"
  ),
  // LAN addresses matter as much as public ones.  The payload deliberately
  // carries no addresses at all -- the client drops peer addresses for exactly
  // this reason -- so a private address surviving the scrub is a leak, not
  // noise.  The absence of this canary is why MultiSyncExtraRemotes went
  // unnoticed through two audits that both reported clean.
  //
  // Exactly four octets.  A three-or-four version matched "10.15.7" -- macOS
  // Catalina in systemInfo.platformVariant -- on 137 records.  A version is not
  // an address and a dotted-quad has four parts.
  private_ipv4: new RegExp(
    "\\b(?:10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" +
    "|192\\.168\\.\\d{1,3}\\.\\d{1,3}" +
    "|172\\.(?:1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3})\\b"
  ),
};

// Field names whose value is a version, not an address.  Dotted-quad version
// strings are indistinguishable from IPv4 by pattern alone -- a kernel string
// like "5.10.103.4" is a valid dotted-quad with every octet under 256, and on
// the real corpus that produced 620 false positives.
const VERSION_FIELDS = new Set([
  "Kernel", "kernel", "version", "osVersion", "OSVersion", "osRelease",
  "OSRelease", "majorVersion", "minorVersion", "fppVersion",
]);

const IP_CANARIES = new Set(["public_ipv4", "private_ipv4"]);

// Yield [path, string] for every string leaf, so a canary hit names a field.
// Walking structurally rather than regexing the serialised blob is what makes a
// hit actionable and what lets version fields be skipped.
function* walkStrings(obj, prefix) {
  const at = prefix || "";
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    for (const v of obj) yield* walkStrings(v, at + "[]");
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      yield* walkStrings(v, at ? at + "." + k : k);
    }
    return;
  }
  if (typeof obj === "string") yield [at, obj];
}

// Report canary hits on an ALREADY-SCRUBBED record, as ["name @ path", ...].
function canaryRecord(scrubbed) {
  const hits = [];
  for (const [p, text] of walkStrings(scrubbed)) {
    const leaf = p.split(".").pop().replace(/\[\]$/, "");
    for (const [name, pattern] of Object.entries(CANARY)) {
      if (IP_CANARIES.has(name) && VERSION_FIELDS.has(leaf)) continue;
      if (pattern.test(text)) hits.push(name + " @ " + p);
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Scrubbing
// ---------------------------------------------------------------------------

// True if a settings value cannot carry free-form household detail.
function valueIsSafe(value) {
  if (typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return true;
    // "0"/"1" checkboxes and plain numbers arrive as strings.  Matched with a
    // pattern rather than Number(), which also accepts "0x41" and "Infinity" --
    // neither is a number a settings field would hold, and the first would let a
    // hex-looking string through as "safe".
    return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s);
  }
  return false;
}

// Blocks that only a device statistics payload carries.  Any one of them,
// alongside a uuid, identifies a record as a payload.
const PAYLOAD_BLOCKS = [
  "systemInfo", "capeInfo", "settings", "multisync", "files", "plugins",
  "schedule", "network", "memory", "outputProcessors",
];

// True only for an actual device statistics payload.
//
// The tree is not uniformly one kind of file.  Alongside the per-device records
// it holds summary.json / summary_noDocker.json -- the published public summary
// -- and a handful of very old uploads that are fppd *status* dumps rather than
// statistics.  Without this guard the top-level allowlist would strip every key
// from those and leave empty objects behind, which is destructive and would be
// discovered far too late.
//
// The guard is the PRESENCE of a `uuid` key plus any one payload block.
//
// Two narrower versions were both wrong against the live corpus, and the canary
// caught each of them:
//
//   `uuid` plus `systemInfo` skipped five real payloads outright -- records
//   carrying settings, multisync, plugins, schedule and a full capeInfo but no
//   systemInfo block -- leaving serialNumber, cs and vendor contact untouched.
//
//   Requiring uuid to be a non-empty STRING skipped another 37: real payloads
//   that report `"uuid": null` or `"uuid": ""`.  A device that fails to read its
//   own uuid still uploads everything else, including its cape serial.
//
// Presence of the key is what actually separates the two kinds of file: the
// published summaries carry no uuid at all.  Value-shape is not part of the
// question, and treating it as part of the question is what leaked twice.
function looksLikeStatsRecord(rec) {
  if (rec === null || typeof rec !== "object" || Array.isArray(rec)) return false;
  if (!("uuid" in rec)) return false;
  return PAYLOAD_BLOCKS.some((k) => k in rec);
}

function count(stats, key) {
  if (stats) stats[key] = (stats[key] || 0) + 1;
}

// Scrub one capeInfo block in place.  Returns true if anything changed.
function scrubCape(cape, stats) {
  if (cape === null || typeof cape !== "object" || Array.isArray(cape)) return false;
  let changed = false;

  for (const key of CAPE_DROP) {
    if (key in cape) {
      delete cape[key];
      count(stats, "capeInfo." + key);
      changed = true;
    }
  }

  const vendor = cape.vendor;
  if (vendor !== null && typeof vendor === "object" && !Array.isArray(vendor)) {
    const extra = Object.keys(vendor).filter((k) => !VENDOR_KEEP.includes(k));
    if (extra.length > 0) {
      for (const k of extra) delete vendor[k];
      count(stats, "capeInfo.vendor.<contact>");
      changed = true;
    }
  }
  // Newer clients send vendor as a bare name string.  Nothing to do there.

  return changed;
}

// Scrub one parsed stats record in place.  Returns true if anything changed.
function scrubRecord(rec, stats) {
  if (!looksLikeStatsRecord(rec)) {
    count(stats, "skipped: not a statistics payload");
    return false;
  }
  let changed = false;

  // Unknown top-level blocks go first, before anything looks inside them.
  for (const key of Object.keys(rec)) {
    if (!TOP_LEVEL_KEEP.has(key)) {
      delete rec[key];
      count(stats, "<unknown top-level block> " + key);
      changed = true;
    }
  }

  if (scrubCape(rec.capeInfo, stats)) changed = true;

  if (Array.isArray(rec.multisync)) {
    for (const peer of rec.multisync) {
      if (peer !== null && typeof peer === "object" && scrubCape(peer.capeInfo, stats)) {
        changed = true;
      }
    }
  }

  const settings = rec.settings;
  if (settings !== null && typeof settings === "object" && !Array.isArray(settings)) {
    for (const [key, value] of Object.entries(settings)) {
      if (value === SCRUB_MARKER) continue; // already scrubbed; keeps the run idempotent

      if (SETTING_HARDWARE_KEEP.has(key)) {
        const bad = VALUE_DENYLIST[key];
        if (bad && bad.has(String(value))) {
          settings[key] = SCRUB_MARKER;
          count(stats, "settings." + key + " (denylisted value)");
          changed = true;
        }
        continue;
      }

      // Declaration first, heuristic only as a backstop.  An earlier version
      // decided purely on the shape of the value -- keep numbers and booleans,
      // blank every other string.  Against the real corpus that blanked
      // LogLevel_*, fppMode, MediaBackend, WifiRegulatoryDomain, DateFormat and
      // a dozen more: all declared `select` with an options map, all enumerable,
      // all analytically useful.  The client never had this problem because it
      // decides on declarations; the two now agree.
      let drop = SETTING_SCRUB.has(key);

      if (!drop && SETTING_FREETEXT.has(key)) {
        drop = true;
        count(stats, "settings.<declared free text>");
      } else if (
        !drop &&
        !SETTING_DECLARED.has(key) &&
        !SETTING_KEEP_ANYWAY.has(key) &&
        !valueIsSafe(value)
      ) {
        // settings.json has never heard of this key, so it is from an older
        // client and nothing describes it.  Fall back to shape.
        drop = true;
        count(stats, "settings.<undeclared free text>");
      }

      if (drop) {
        settings[key] = SCRUB_MARKER;
        count(stats, "settings." + key);
        changed = true;
      }
    }
  }

  return changed;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

// Replace a file's contents without ever leaving a truncated record on disk:
// write a sibling temp file, match the original's mode and owner, then rename.
// rename(2) within a directory is atomic, so a reader either sees the old record
// or the new one.
async function writeAtomic(file, obj) {
  const dir = path.dirname(file);
  const tmp = path.join(dir, ".scrub-" + process.pid + "-" + Math.random().toString(36).slice(2) + ".json");
  try {
    await fs.promises.writeFile(tmp, JSON.stringify(obj));
    const st = await fs.promises.stat(file);
    await fs.promises.chmod(tmp, st.mode & 0o7777);
    try {
      await fs.promises.chown(tmp, st.uid, st.gid);
    } catch (e) {
      if (e.code !== "EPERM") throw e;
    }
    await fs.promises.rename(tmp, file);
  } catch (e) {
    await fs.promises.unlink(tmp).catch(() => {});
    throw e;
  }
}

module.exports = {
  scrubRecord,
  scrubCape,
  looksLikeStatsRecord,
  valueIsSafe,
  canaryRecord,
  walkStrings,
  writeAtomic,
  SCRUB_MARKER,
  CAPE_DROP,
  CAPE_KEEP,
  VENDOR_KEEP,
  TOP_LEVEL_KEEP,
  SETTING_SCRUB,
  SETTING_DECLARED,
  SETTING_FREETEXT,
  SETTING_HARDWARE_KEEP,
  SETTING_KEEP_ANYWAY,
  VALUE_DENYLIST,
  CANARY,
  VERSION_FIELDS,
  PAYLOAD_BLOCKS,
  POLICY_SOURCE: DECLARATIONS.source,
};
