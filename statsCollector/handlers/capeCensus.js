"use strict";
const util = require("../lib/util.js");

// A census of FPP devices and the cape each one carries, counting every
// device ONCE no matter how many times it was seen.
//
// The capeType handler answers a different question: it charts the cape on
// each device that reports stats.  That is a biased sample -- a device only
// appears if its owner opted in -- and roughly a sixth of the FPP hosts
// visible on the network never report at all.
//
// FPP 10.1 attaches capeInfo to every multisync peer, so a device's hardware
// is knowable from its neighbours.  Those two sources cannot simply be added
// together though: in a show where a dozen devices all see each other, one
// cape is reported by all twelve, and a large network would swamp the chart.
// Keying on the device uuid instead of the sighting collapses that back to
// one device, which is what makes a census possible at all.
let devices = new Map();

// Sold under two spellings in the EEPROMs; they are one vendor.
const VENDOR_ALIASES = {
    "Kulp Lights LLC": "Kulp Lights"
};

// Names that identify a header rather than a product.  They carry no designer
// and no vendor, so charting them as hardware would put a generic marker
// alongside real controllers.
const GENERIC_CAPES = new Set(["PiHat", "spixels", "Unknown", "None", ""]);

const NON_FPP_MIN_TYPEID = 128;

const COVERAGE_ORDER = ["Cape identified", "No cape", "Hardware unknown"];

function isMap(v) {
    return (v !== null) && (typeof v === "object") && !Array.isArray(v);
}

function canonicalVendor(name) {
    if (typeof name !== "string") {
        return null;
    }
    let v = name.trim();
    if (v === "") {
        return null;
    }
    return (v in VENDOR_ALIASES) ? VENDOR_ALIASES[v] : v;
}

// Reduce a capeInfo block, from either a stats record or a multisync peer, to
// the three states worth telling apart.  "present" being false is a positive
// statement that the device has no cape, and is not the same as not knowing.
function readCape(cape) {
    if (!isMap(cape)) {
        return { state: "Hardware unknown" };
    }
    let name = (typeof cape.name === "string") ? cape.name.trim() : "";

    // A stats record omits "present" and uses the name "None" instead
    let present = ("present" in cape) ? !!cape.present : !GENERIC_CAPES.has(name);
    if (!present) {
        return { state: "No cape" };
    }
    if (GENERIC_CAPES.has(name)) {
        // Identified, but the name is a header rather than a product
        return { state: "Cape identified" };
    }

    let vendor = cape.vendor;
    if (isMap(vendor)) {
        // A stats record nests the vendor; a peer reports the name directly
        vendor = vendor.name;
    }
    return {
        state: "Cape identified",
        name: name,
        vendor: canonicalVendor(vendor),
        designer: (typeof cape.designer === "string" && cape.designer.trim() !== "")
            ? cape.designer.trim() : null
    };
}

// How much a sighting actually tells us.  A peer reported by a host too old
// to send capeInfo says nothing about that peer's hardware, and must not
// displace an earlier sighting that named the cape -- otherwise a device with
// a known cape reverts to unknown as soon as an out-of-date neighbour sees it.
function informationRank(cape) {
    if (cape.state === "Cape identified") {
        return cape.name ? 3 : 2;
    }
    if (cape.state === "No cape") {
        return 1;
    }
    return 0;
}

// Keep the best sighting of a device: the most informative one, and among
// equals the most recent, since a cape can be swapped.
function remember(uuid, ts, cape) {
    if (typeof uuid !== "string") {
        return;
    }
    let id = uuid.trim();
    // An unidentifiable peer cannot be deduplicated, so it cannot be censused
    if (id === "" || id === "Failed" || id === "Not Set" || id === "Unknown" || id.endsWith("-Not")) {
        return;
    }
    let when = (typeof ts === "number") ? ts : 0;
    let rank = informationRank(cape);
    let prior = devices.get(id);
    if (prior !== undefined) {
        if (prior.rank > rank) {
            return;
        }
        if (prior.rank === rank && prior.ts >= when) {
            // Still take the newer timestamp so age bucketing reflects the
            // most recent time the device was seen at all
            if (when > prior.ts) {
                prior.ts = when;
            }
            return;
        }
    }
    devices.set(id, { ts: when, rank: rank, cape: cape });
}

function countIn(collector, label, when) {
    if (!(label in collector)) {
        collector[label] = util.newCountByAgeObject();
    }
    util.countByAge(collector[label], { ts: when });
}

module.exports = [
    {
        name: "capeCensus",
        description:
            "Every FPP device seen on any network, counted once, and the cape it carries. Includes devices that never report stats themselves.",

        reset: async () => {
            devices = new Map();
        },
        results: async () => {
            let out = {
                vendors: {},
                models: {},
                designers: {},
                coverage: {},
                coverageOrder: COVERAGE_ORDER.slice(),
                deviceCount: devices.size
            };

            devices.forEach(entry => {
                let c = entry.cape;
                countIn(out.coverage, c.state, entry.ts);
                if (c.state !== "Cape identified" || !c.name) {
                    return;
                }
                countIn(out.models, c.name, entry.ts);
                if (c.vendor !== null && c.vendor !== undefined) {
                    countIn(out.vendors, c.vendor, entry.ts);
                }
                if (c.designer !== null && c.designer !== undefined) {
                    countIn(out.designers, c.designer, entry.ts);
                }
            });

            return out;
        },
        currentHandler: async (obj) => {
            if (obj === null || typeof obj !== "object") {
                return;
            }
            let ts = (typeof obj.ts === "number") ? obj.ts : 0;

            // The reporting device itself
            remember(obj.uuid, ts, readCape(obj.capeInfo));

            if (!Array.isArray(obj.multisync)) {
                return;
            }
            obj.multisync.forEach(peer => {
                if (peer === null || typeof peer !== "object") {
                    return;
                }
                if (peer.local) {
                    // Already recorded above, and with better data
                    return;
                }
                if ((typeof peer.typeId === "number") && (peer.typeId >= NON_FPP_MIN_TYPEID)) {
                    // Third party controllers have no cape; nonFppMultisync
                    // charts those
                    return;
                }
                // Only overwrite with a peer sighting when it is newer, which
                // remember() enforces -- a device's own record usually wins.
                remember(peer.uuid, ts, readCape(peer.capeInfo));
            });
        }
    },
];
