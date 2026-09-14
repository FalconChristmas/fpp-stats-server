"use strict";
const util = require("../lib/util.js");

// Every piece of hardware that drives pixels or panels, capes and third
// party controllers together, each counted once.
//
// A cape is easy: it is reported by the device it is fitted to, so keying
// on the device uuid counts it once.  A controller is not: every FPP host
// in a show sees it via multisync, so summing sightings counts one Falcon
// as many times as the show has FPP hosts.  The peer record carries no
// address or hostname and most controllers report no usable uuid, so the
// individual unit cannot be recognised across reporters either.
//
// What CAN be recognised is the show.  FPP hosts see each other by uuid, so
// reporters that list one another are grouped into a show, and within a
// show the number of units of a model is the most that any one member sees.
// Two members that each see three F16v4s are looking at the same three.
//
// That needs every record before anything can be counted, so the handler
// gathers per-record summaries and does the grouping in results().

// Names that mean no cape was identified
const NO_CAPE = new Set(["Unknown", "None", ""]);

// A Pi with no EEPROM cape reports the pixel string base type as its cape.
// That is a generic hat rather than a product, but it drives pixels all
// the same, so it counts when strings are actually configured behind it.
const GENERIC_HATS = new Set(["PiHat", "spixels"]);

// Capes that drive nothing: displays, buttons and fan control for the host
// itself.  This chart is output hardware, so they are left out.
const DISPLAY_CAPES = new Set([
    "Pi-OLED", "BBB-OLED", "MOLED-PI", "rPi-28D", "rPi-MFC",
    "ShowPlayer", "ShowPlayerTouch", "Pi-Stepper-I2C"
]);

// Same windows as util.countByAge, as (key, days) pairs
const WINDOWS = [
    ["last7Days", 7],
    ["last15Days", 15],
    ["last30Days", 30],
    ["last60Days", 60],
    ["last180Days", 180],
    ["last365Days", 365],
    ["totalCount", Infinity],
];

function isMap(v) {
    return (v !== null) && (typeof v === "object") && !Array.isArray(v);
}

// obj is the stats record when the cape is the reporter's own; a peer's
// cape comes with no output config, so a generic hat there is taken on
// its name alone.
function capeName(cape, obj) {
    if (!isMap(cape)) {
        return null;
    }
    let name = (typeof cape.name === "string") ? cape.name.trim() : "";
    if (("present" in cape) && !cape.present) {
        return null;
    }
    if (NO_CAPE.has(name) || DISPLAY_CAPES.has(name)) {
        return null;
    }
    if (GENERIC_HATS.has(name) && obj !== undefined) {
        let pixels = isMap(obj.output_pixel_pi) ? obj.output_pixel_pi.pixelCount : 0;
        if (!(pixels > 0)) {
            return null;
        }
    }
    return name;
}

// Per-record summaries, in arrival order
let records = [];
// Device uuid -> {label, ts}; capes are counted once per device
let capes = new Map();

function noteCape(uuid, label, ts) {
    if (uuid === null || label === null) {
        return;
    }
    let prior = capes.get(uuid);
    if (prior === undefined || ts > prior.ts) {
        capes.set(uuid, { label: label, ts: ts });
    }
}

// Union-find over show membership
function find(parent, x) {
    while (parent.get(x) !== x) {
        parent.set(x, parent.get(parent.get(x)));
        x = parent.get(x);
    }
    return x;
}

function union(parent, a, b) {
    if (!parent.has(a)) {
        parent.set(a, a);
    }
    if (!parent.has(b)) {
        parent.set(b, b);
    }
    let ra = find(parent, a);
    let rb = find(parent, b);
    if (ra !== rb) {
        parent.set(ra, rb);
    }
}

module.exports = [
    {
        name: "outputHardware",
        description:
            "Every cape and third party controller driving a show, counted once per unit.  Capes are counted per device; controllers are counted per show, as the most any one FPP host in that show can see.",

        reset: async () => {
            records = [];
            capes = new Map();
        },
        results: async () => {
            let now = new Date().getTime();
            let gear = {};
            let kind = {};

            function ageCounts(label, k) {
                if (!(label in gear)) {
                    gear[label] = util.newCountByAgeObject();
                    kind[label] = k;
                }
                return gear[label];
            }

            capes.forEach(c => {
                util.countByAge(ageCounts(c.label, "Cape"), { ts: c.ts });
            });

            // Group reporters into shows.  A peer that never reports stats
            // still joins the two reporters that both see it.
            let parent = new Map();
            records.forEach((r, i) => {
                union(parent, i, i);
                r.peers.forEach(p => union(parent, i, "u:" + p));
            });
            let shows = new Map();
            records.forEach((r, i) => {
                let root = find(parent, i);
                if (!shows.has(root)) {
                    shows.set(root, []);
                }
                shows.get(root).push(r);
            });

            // Within a show, units of a model in a window is the most that
            // any member reporting inside that window sees.
            shows.forEach(members => {
                let labels = new Set();
                members.forEach(m => Object.keys(m.controllers).forEach(l => labels.add(l)));
                labels.forEach(label => {
                    let counts = ageCounts(label, "Controller");
                    WINDOWS.forEach(([key, days]) => {
                        let best = 0;
                        members.forEach(m => {
                            let age = (now - m.ts) / 86400000;
                            if (age < days && label in m.controllers) {
                                best = Math.max(best, m.controllers[label]);
                            }
                        });
                        counts[key] += best;
                    });
                });
            });

            return {
                gear: gear,
                kind: kind,
                shows: shows.size,
                devices: records.length
            };
        },
        currentHandler: async (obj) => {
            if (!isMap(obj)) {
                return;
            }
            let ts = (typeof obj.ts === "number") ? obj.ts : 0;
            let self = util.stablePeerUuid(obj.uuid);
            let rec = { ts: ts, peers: [], controllers: {} };

            noteCape(self, capeName(obj.capeInfo, obj), ts);

            if (Array.isArray(obj.multisync)) {
                // A controller with a real uuid may appear on more than one
                // address in the same payload
                let seen = new Set();
                obj.multisync.forEach(peer => {
                    if (!isMap(peer) || peer.local) {
                        return;
                    }
                    let uuid = util.stablePeerUuid(peer.uuid);
                    if (uuid !== null && uuid === self) {
                        return;
                    }
                    if (util.isNonFppPeer(peer)) {
                        if (uuid !== null) {
                            if (seen.has(uuid)) {
                                return;
                            }
                            seen.add(uuid);
                        }
                        let label = util.nonFppLabel(peer);
                        rec.controllers[label] = (rec.controllers[label] || 0) + 1;
                        return;
                    }
                    if (uuid !== null) {
                        rec.peers.push(uuid);
                        // FPP 10.1 peers carry the cape of hosts that may
                        // never report stats themselves
                        noteCape(uuid, capeName(peer.capeInfo), ts);
                    }
                });
            }
            records.push(rec);
        }
    },
];
