#!/usr/bin/env node
/*
 * Self-test for lib/scrub.js -- the control.
 *
 * A scrub run that reports zero canary hits is meaningless unless we have shown
 * the checks fire on a record that does contain the fields.  This builds one
 * specimen carrying every category the policy knows about, plus one it does
 * not, and asserts that each removal happens, each deliberate keep survives,
 * the canaries fire on unhandled data, stay silent on handled data and on
 * dotted-quad version strings, a non-payload file is untouched, and a second
 * pass is a no-op.
 *
 * run.sh runs this before the loop starts: if the policy is broken, the
 * container should fail rather than rewrite five years of records with it.
 *
 *   node lib/scrub.selftest.js     # or: npm test
 */

"use strict";

const scrub = require("./scrub.js");

const SPECIMEN = {
  uuid: "M1-000000001234abcd",
  // A field nobody classified, inside a block that is kept wholesale.  Unknown
  // top-level blocks are dropped outright, so this -- not the dropped block --
  // is what the canaries have to catch.
  systemInfo: {
    Platform: "Pi",
    someFieldNobodyClassified: "ops@example.invalid via 192.168.4.11 and 203.0.113.42",
  },
  capeInfo: {
    name: "K16A-B",
    id: "k16A-B",
    serialNumber: "2320SBI00232",
    cs: "abcdefghijklmnopqrstuv",
    verifiedKeyId: "xx",
    designer: "Someone",
    vendor: {
      name: "Example Lights",
      email: "sales@example.invalid",
      phone: "+1-555-0100",
      url: "https://example.invalid",
    },
  },
  multisync: [
    {
      uuid: "M1-00000000deadbeef",
      type: "Falcon F16v4",
      capeInfo: { name: "K8-B", serialNumber: "SHOULDNOTBEHERE" },
    },
    { uuid: "MH-0123456789abcdef", type: "WLED" },
  ],
  // An unrecognised top-level block, of exactly the kind the corpus turned out
  // to contain (`interfaces`, `advancedView`).  Must be dropped wholesale.
  somethingNobodyClassified: {
    contact: "leaked@example.invalid",
    reachedVia: "203.0.113.42",
    lanPeers: "192.168.4.11,10.0.0.7",
  },
  settings: {
    KioskUrl: "https://someones-show.example.invalid/",
    ForceAudioId: "Firstname's USB Audio", // personal name -> denylisted value
    FPP_UUID: "my-hand-typed-id",
    MultiSyncExternalIPAddress: "203.0.113.7",
    MultiSyncExtraRemotes: "192.168.9.20,192.168.9.21", // LAN topology (declared pii)
    // Declared `text` but NOT declared pii -- the branch that withholds free
    // text by declaration alone.  Every text key in this specimen that is also
    // pii takes the pii branch first, so without a key like this one that rule
    // is never exercised and could rot unnoticed.
    MultiSyncHTTPSubnets: "192.168.9.0/24,10.4.0.0/16",
    AudioOutput: "CapeAudiopcm510", // hardware string -> KEPT
    TimeZone: "Australia/Adelaide",
    MQTTFrequency: 0,
    MultiSyncEnabled: "1",
    fppMode: "player", // declared select -> must survive
    LogLevel_General: "info", // declared select -> must survive
    SomeFutureFreeTextKey: "a hostname or a person",
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

const failures = [];

function check(label, ok) {
  console.log("  %s %s", label.padEnd(48), ok ? "pass" : "FAIL <-- BROKEN");
  if (!ok) failures.push(label);
}

function main() {
  console.log("Self-test: confirming the checks can come back red.");
  console.log("Policy source: settings.json @ %s\n", String(scrub.POLICY_SOURCE).slice(0, 8));

  // 1. The scrubber must REMOVE every category in the specimen, and must report
  //    having done so.
  const stats = {};
  const rec = clone(SPECIMEN);
  const changed = scrub.scrubRecord(rec, stats);
  check("scrubber reported a change", changed === true);

  console.log();
  const seen = [
    "capeInfo.serialNumber",
    "capeInfo.cs",
    "capeInfo.vendor.<contact>",
    "settings.KioskUrl",
    "settings.FPP_UUID",
    "settings.MultiSyncExternalIPAddress",
    "settings.ForceAudioId (denylisted value)",
    "settings.<declared free text>",
    "settings.<undeclared free text>",
    "<unknown top-level block> somethingNobodyClassified",
  ];
  for (const key of seen) {
    check("counted " + key, (stats[key] || 0) > 0);
  }

  console.log();
  const removed = [
    ["capeInfo.serialNumber gone", !("serialNumber" in rec.capeInfo)],
    ["capeInfo.cs gone", !("cs" in rec.capeInfo)],
    ["vendor reduced to name", JSON.stringify(Object.keys(rec.capeInfo.vendor)) === '["name"]'],
    ["peer cape serial gone", !("serialNumber" in rec.multisync[0].capeInfo)],
    ["unknown top-level block dropped", !("somethingNobodyClassified" in rec)],
    ["KioskUrl scrubbed", rec.settings.KioskUrl === scrub.SCRUB_MARKER],
    ["FPP_UUID scrubbed", rec.settings.FPP_UUID === scrub.SCRUB_MARKER],
    [
      "MultiSyncExtraRemotes (LAN list) scrubbed",
      rec.settings.MultiSyncExtraRemotes === scrub.SCRUB_MARKER,
    ],
    [
      "declared free text (non-pii) scrubbed",
      rec.settings.MultiSyncHTTPSubnets === scrub.SCRUB_MARKER,
    ],
    [
      "ForceAudioId denylisted value scrubbed",
      rec.settings.ForceAudioId === scrub.SCRUB_MARKER,
    ],
    [
      "undeclared free-text key scrubbed",
      rec.settings.SomeFutureFreeTextKey === scrub.SCRUB_MARKER,
    ],
  ];
  for (const [label, ok] of removed) check(label, ok);

  // 2. And the things we are keeping must survive.
  console.log();
  const kept = [
    ["device uuid KEPT", rec.uuid === SPECIMEN.uuid],
    [
      "peer uuids KEPT",
      JSON.stringify(rec.multisync.map((p) => p.uuid)) ===
        JSON.stringify(SPECIMEN.multisync.map((p) => p.uuid)),
    ],
    ["verifiedKeyId KEPT", rec.capeInfo.verifiedKeyId === "xx"],
    ["cape name KEPT", rec.capeInfo.name === "K16A-B"],
    ["vendor name KEPT", rec.capeInfo.vendor.name === "Example Lights"],
    ["TimeZone KEPT", rec.settings.TimeZone === "Australia/Adelaide"],
    ["AudioOutput hardware string KEPT", rec.settings.AudioOutput === "CapeAudiopcm510"],
    ["numeric setting KEPT", rec.settings.MQTTFrequency === 0],
    ["checkbox setting KEPT", rec.settings.MultiSyncEnabled === "1"],
    ["declared enumerable KEPT (fppMode)", rec.settings.fppMode === "player"],
    ["declared enumerable KEPT (LogLevel_General)", rec.settings.LogLevel_General === "info"],
  ];
  for (const [label, ok] of kept) check(label, ok);

  // 3. The canaries must fire on the UNHANDLED block, or their silence on the
  //    real corpus means nothing.  They run on the scrubbed record, so the
  //    unhandled string inside systemInfo -- which survives -- is what they have
  //    to catch.
  console.log();
  const hits = scrub.canaryRecord(rec);
  for (const name of ["email_address", "public_ipv4", "private_ipv4"]) {
    check("canary fires on UNhandled data: " + name, hits.some((h) => h.startsWith(name + " ")));
  }

  // They must NOT fire on the vendor contact e-mail, which the policy removes.
  // A canary that reports correctly-handled data is noise, and on the real
  // corpus that fired on 38% of files.
  const handled = clone(SPECIMEN);
  delete handled.somethingNobodyClassified;
  handled.systemInfo = { Platform: "Pi" };
  scrub.scrubRecord(handled, {});
  const handledHits = scrub.canaryRecord(handled);
  check(
    "canary SILENT on handled vendor e-mail",
    !handledHits.some((h) => h.startsWith("email_address "))
  );
  if (handledHits.length > 0) {
    console.log("    (unexpected hits: %s)", handledHits.join(", "));
  }

  // A dotted-quad VERSION must not read as an address -- 620 false positives on
  // the real corpus came from exactly this.
  const versioned = clone(SPECIMEN);
  delete versioned.somethingNobodyClassified;
  versioned.systemInfo = { Kernel: "5.10.103.4", version: "10.1.2.3" };
  scrub.scrubRecord(versioned, {});
  const versionHits = scrub.canaryRecord(versioned);
  check(
    "canary SILENT on dotted-quad version strings",
    !versionHits.some((h) => h.startsWith("public_ipv4 ") || h.startsWith("private_ipv4 "))
  );

  // 4. A non-payload file (the published summary lives in the same tree) must be
  //    left completely alone, not stripped to an empty object.
  console.log();
  const summaryLike = {
    Instances: { totalCount: 20296 },
    settingsValues: { KioskUrl: { "http://192.168.1.5/": 3 } },
  };
  const before = JSON.stringify(summaryLike);
  const summaryChanged = scrub.scrubRecord(summaryLike, {});
  check(
    "non-payload file left untouched",
    summaryChanged === false && JSON.stringify(summaryLike) === before
  );

  // A real payload that happens to carry no systemInfo block must still be
  // scrubbed.  Five such records exist in the live corpus, and an earlier guard
  // that required systemInfo skipped every one of them -- serial, cs and vendor
  // contact intact.  The canary caught it; this keeps it caught.
  const noSysInfo = clone(SPECIMEN);
  delete noSysInfo.systemInfo;
  delete noSysInfo.somethingNobodyClassified;
  const noSysChanged = scrub.scrubRecord(noSysInfo, {});
  check(
    "payload without systemInfo IS scrubbed",
    noSysChanged === true &&
      !("serialNumber" in noSysInfo.capeInfo) &&
      JSON.stringify(Object.keys(noSysInfo.capeInfo.vendor)) === '["name"]' &&
      noSysInfo.settings.KioskUrl === scrub.SCRUB_MARKER
  );

  // A real payload reporting a null or empty uuid must still be scrubbed.  37
  // such records exist in the live corpus; a guard that required a non-empty
  // string uuid skipped every one of them with their cape serials intact.
  for (const badUuid of [null, ""]) {
    const r = clone(SPECIMEN);
    r.uuid = badUuid;
    delete r.somethingNobodyClassified;
    const ch = scrub.scrubRecord(r, {});
    check(
      "payload with uuid=" + JSON.stringify(badUuid) + " IS scrubbed",
      ch === true && !("serialNumber" in r.capeInfo) && r.settings.KioskUrl === scrub.SCRUB_MARKER
    );
  }

  // 5. Idempotence: a second pass must change nothing.  This is what makes it
  //    safe to run over the whole archive every four hours.
  const againStats = {};
  const again = scrub.scrubRecord(rec, againStats);
  check("second pass is a no-op", again === false && Object.keys(againStats).length === 0);

  console.log();
  if (failures.length > 0) {
    console.log("SELF-TEST FAILED (%d):", failures.length);
    for (const f of failures) console.log("  - " + f);
    return 1;
  }
  console.log("Self-test passed.  The scrub and canary checks demonstrably fire on a");
  console.log("record that contains the fields, so a clean run on the real archive is");
  console.log("evidence rather than an artifact.");
  return 0;
}

process.exit(main());
