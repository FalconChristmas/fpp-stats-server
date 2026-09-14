"use strict";
const fs = require("fs");
const path = require("path");
const { glob } = require('glob');

const { Console } = require("console");

// Clones an Object using Java Script
function simpleClone(a) {
  return JSON.parse(JSON.stringify(a));
}

// A standard counting template that is supported by
// countByAge()
function newCountByAgeObject() {
  let temp = {
    totalCount: 0,
    last7Days: 0,
    last15Days: 0,
    last30Days: 0,
    last60Days: 0,
    last180Days: 0,
    last365Days: 0,
  };

  return simpleClone(temp);
}

// helper function that counts by different time periods
function countByAge(collector, obj) {
  collector.totalCount += 1;
  if ("ts" in obj) {
    let diff_days = (new Date().getTime() - obj.ts) / 86400000;

    if (diff_days < 7) {
      ++collector.last7Days;
    }
    if (diff_days < 15) {
      ++collector.last15Days;
    }
    if (diff_days < 30) {
      ++collector.last30Days;
    }
    if (diff_days < 60) {
      ++collector.last60Days;
    }
    if (diff_days < 180) {
      ++collector.last180Days;
    }
    if (diff_days < 365) {
      ++collector.last365Days;
    }
  }
}

// The same board is reported under more than one spelling depending on the
// FPP version that read it, so charting the raw string splits one model
// across several rows.  Only exact aliases belong here -- "PocketBeagle 2
// Industrial" is a different product and keeps its own row.
const VARIANT_ALIASES = {
  "PocketBeagle2": "PocketBeagle 2"
};

function normalizePlatformVariant(variant) {
  if (typeof variant !== "string") {
    return variant;
  }
  let v = variant.trim();
  return (v in VARIANT_ALIASES) ? VARIANT_ALIASES[v] : v;
}

// A peer with a typeId at or above this is not running FPP.  The split is
// exact in the collected data: FPP hosts occupy 0-15 (Pi), 65-71 (BeagleBone),
// 96 (Armbian) and 112 (MacOS), and everything from 128 up is third party.
const NON_FPP_MIN_TYPEID = 128;

// Falcon occupies this typeId range.  Models not named in CANONICAL_TYPES
// below are collapsed into "Falcon-other".
const FALCON_MIN_TYPEID = 128;
const FALCON_MAX_TYPEID = 159;

const FALCON_OTHER = "Falcon-other";
const ESPIXELSTICK = "ESPixelStick";

// Keyed on typeId rather than the reported "type" string on purpose.  A peer
// running firmware newer than the reporting host shows up as
// "Unknown System Type"; typeIds 138, 139, 144, 160, 162, 163, 164 and 175 all
// do this in the collected data.  Keying on typeId keeps those on the right bar.
const CANONICAL_TYPES = {
    128: FALCON_OTHER,          // Falcon Controller
    129: FALCON_OTHER,          // Falcon F16v2
    131: FALCON_OTHER,          // Falcon F16v2R
    132: FALCON_OTHER,          // Falcon F4v2
    133: "Falcon F16v3",
    134: FALCON_OTHER,          // Falcon F4v3
    135: "Falcon F48",
    136: "Falcon F16v4",
    137: "Falcon F48v4",
    138: "Falcon F16v5",
    139: "Falcon F48v5",
    140: "Falcon F32v5",        // in FPP's enum, not yet seen reporting
    144: "Falcon F16v5",        // not in FPP's enum; some F16v5 firmware sends 0x90
    160: "Genius Pixel 16",
    161: "Genius Pixel 8",
    162: "Genius Long Range",
    163: "Genius PRO 16",
    164: "Genius PRO 32",
    165: "AuroraCore 16",       // in FPP's enum, not yet seen reporting
    166: "YPS VIVID 8",         // also reported as "YPS VIDID 8"
    167: "PixelLink 4",         // in FPP's enum, not yet seen reporting
    175: "Genius Controller",
    192: "Other",               // kSysTypeOtherSystem, a generic third party
    193: "xSchedule",
    194: ESPIXELSTICK,          // ESPixelStick-ESP8266
    195: ESPIXELSTICK,          // ESPixelStick-ESP32
    196: "Baldrick",
    240: "Other",               // kSysTypeNonMultiSyncCapable, found but not a peer
    251: "WLED",
    252: "DIYLEDExpress",
    253: "HinksPix",
    254: "AlphaPix",
    255: "SanDevices",
};

const UNKNOWN_TYPE = "Unknown System Type";

// Reduce a peer to the label it should be charted under.  Keeps the list of
// bars manageable: every ESPixelStick variant lands on one label and the long
// tail of legacy Falcon models lands on "Falcon-other".
function nonFppLabel(peer) {
    let typeId = peer.typeId;
    let type = (typeof peer.type === "string") ? peer.type.trim() : "";

    if (typeof typeId === "number" && typeId in CANONICAL_TYPES) {
        return CANONICAL_TYPES[typeId];
    }

    // Models released after the table above was written
    if (type.startsWith(ESPIXELSTICK)) {
        return ESPIXELSTICK;
    }
    if (type.startsWith("Falcon")) {
        return FALCON_OTHER;
    }
    if (typeof typeId === "number" && typeId >= FALCON_MIN_TYPEID && typeId <= FALCON_MAX_TYPEID) {
        return FALCON_OTHER;
    }

    if (type.length > 0 && type !== UNKNOWN_TYPE) {
        return type;
    }

    // Genuinely new hardware gets its own bar rather than merging into
    // an existing one.
    return "Unknown (typeId " + typeId + ")";
}

// typeId is a single byte on the wire, so anything outside 0-255 is corrupt
// rather than a device -- typeIds 257 and 258 both appear in the collected
// data and would otherwise each earn their own bar.
const MAX_TYPEID = 255;

function isNonFppPeer(peer) {
    return (typeof peer.typeId === "number") &&
        (peer.typeId >= NON_FPP_MIN_TYPEID) &&
        (peer.typeId <= MAX_TYPEID);
}


// uuids that do not identify one device.  A record filed under one of these
// is really many devices overwriting each other, so it is dropped before any
// handler sees it, and a multisync peer carrying one cannot be recognised
// across reporters.
//
// The explicit list is serials shared by a whole batch of boards or by every
// install of a platform that has no serial at all: the history behind each
// one flips between different capes, versions and platforms from one report
// to the next, and hundreds of unrelated shows claim to see it as a peer.
const SHARED_UUIDS = new Set([
  "M1-1741GPB4",          // PocketBeagle batch
  "M1-1741GPB2",          // PocketBeagle batch
  "M1-0000BBWG0000",      // BeagleBone Wireless with no serial programmed
  "M1-0000000000000000",
  "M1-fpu",               // x86 / Docker with no serial
  "M2-Not",               // machine-id "Not Set"
  "M1-", "M2-0", "M3-",
]);

const UNIDENTIFIED_PEER = new Set(["Failed", "Not Set", "Unknown", ""]);

function isInvalidUuid(uuid) {
  let u = (typeof uuid === "string") ? uuid.trim() : "";
  if (UNIDENTIFIED_PEER.has(u) || SHARED_UUIDS.has(u)) {
    return true;
  }
  if (u.endsWith("-Not") || /^M[0-9]-0*$/.test(u)) {
    return true;
  }
  return false;
}

// The uuid of a multisync peer if it names one device, else null.  On top
// of the invalid set this rejects "X-" ids, which are salted per reporting
// host and so never match across two reporters.
function stablePeerUuid(uuid) {
  let u = (typeof uuid === "string") ? uuid.trim() : "";
  if (isInvalidUuid(u) || u.startsWith("X-")) {
    return null;
  }
  return u;
}

// Distinct FPP peer devices visible to a reporting host, excluding itself.
// The multisync array holds one entry per ADDRESS, so a multi-homed or
// dual-stack box appears several times.  FPP 10.1 marks the host's own rows
// with local=1; older payloads have no marker but always include the host,
// so one entry is subtracted instead.

function distinctFppPeers(systems) {
  if (!Array.isArray(systems)) {
    return 0;
  }
  let seen = new Set();
  let unidentified = 0;
  let sawLocal = false;
  systems.forEach(peer => {
    if (peer === null || typeof peer !== "object") {
      return;
    }
    if (peer.local) {
      sawLocal = true;
      return;
    }
    if (isNonFppPeer(peer)) {
      return;
    }
    let uuid = stablePeerUuid(peer.uuid);
    if (uuid === null) {
      unidentified += 1;
      return;
    }
    seen.add(uuid);
  });
  let count = seen.size + unidentified;
  if (!sawLocal) {
    count -= 1;
  }
  return (count > 0) ? count : 0;
}

// Returns the directory where data files are stored
function getBaseDirectory() {
  return process.env.out_dir || "/tmp/output";
}

function isBaseDirectoryValid() {
  return fs.existsSync(getBaseDirectory());
}

function notDocker(obj) {
  let platform = "Unknown";
  let platformVariant = "Unknown";

  if ("systemInfo" in obj) {
    if ("platformVariant" in obj.systemInfo) {
      platformVariant = obj.systemInfo.platformVariant;
    }
    if ("platform" in obj.systemInfo) {
      platform = obj.systemInfo.platform;
    }
  }
  return (platform != "Docker") && (platformVariant != "Docker");
}

function truePredicate() {
  return true;
}

// This is the "main" loop that will run all
// processors over all files and save the final JSON file.
async function processHandlers(handlers) {

  // These can not be in parallel because the counters are reused. 
  console.log('Starting Summary.json')
  await processHandlersReally(handlers, truePredicate, "summary.json");
  console.log('Starting No Docker')
  await processHandlersReally(handlers, notDocker, "summary_noDocker.json");

}

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

// This is the "main" loop that will run all
// processors over all files and save the final JSON file.
async function processHandlersReally(handlers, predicate, filename) {
  // Reset All counters
  console.log('Calling Reset')
  await Promise.all(
    handlers.map(async (h) => {
      await h.reset();
    })
  );

  console.log("Searching for data")

  // Find the current files
  // Don't use glob in this outer loop because of memory leak
  // https://github.com/isaacs/node-glob/issues/435
  for await (const f of walk(getBaseDirectory())) {
    if (!(f.endsWith("current.json"))) {
      continue;
    }

    let obj = JSON.parse(await fs.promises.readFile(f));
    if (isInvalidUuid(obj.uuid) || !predicate(obj)) {
      continue;
    }

    // do all CurrentHandlers
    for (const h of handlers) {
      if ("currentHandler" in h) {
        await h.currentHandler(obj);
      }
    }

    // Read all files for this UUID
    let allFiles = await glob(
      getBaseDirectory() + "/" + obj.uuid + "/*.json"
    );

    // do all CurrentHandlers
    for (const h of handlers) {
      if ("historyHandler" in h) {
        await h.historyHandler(obj, allFiles);
      }
    }
  } // End of Processing all files

  console.log('Starting Gather');

  // Gather Results
  let results = {
    ts: new Date().getTime()
  };
  await Promise.all(
    handlers.map(async (h) => {
      let obj = await h.results();
      results[h.name] = {
        description: h.description,
        data: obj,
      };
    })
  );

  // Write the Resulting JSON file.
  let asJson = JSON.stringify(results, null, 4);
  await fs.promises.writeFile(getBaseDirectory() + "/" + filename, asJson);
}


module.exports.getBaseDirectory = getBaseDirectory;
module.exports.isBaseDirectoryValid = isBaseDirectoryValid;
module.exports.processHandlers = processHandlers;
module.exports.simpleClone = simpleClone;
module.exports.newCountByAgeObject = newCountByAgeObject;
module.exports.countByAge = countByAge;
module.exports.normalizePlatformVariant = normalizePlatformVariant;
module.exports.nonFppLabel = nonFppLabel;
module.exports.isNonFppPeer = isNonFppPeer;
module.exports.distinctFppPeers = distinctFppPeers;
module.exports.isInvalidUuid = isInvalidUuid;
module.exports.stablePeerUuid = stablePeerUuid;
