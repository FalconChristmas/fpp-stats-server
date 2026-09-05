"use strict";
const util = require("../lib/util.js");

let myData = {};

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
    144: "Falcon F16v5",
    160: "Genius Pixel 16",
    161: "Genius Pixel 8",
    162: "Genius Long Range",
    163: "Genius PRO 16",
    164: "Genius PRO 32",
    166: "YPS VIVID 8",         // also reported as "YPS VIDID 8"
    175: "Genius Controller",
    193: "xSchedule",
    194: ESPIXELSTICK,          // ESPixelStick-ESP8266
    195: ESPIXELSTICK,          // ESPixelStick-ESP32
    196: "Baldrick",
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
function labelForPeer(peer) {
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

function isNonFpp(peer) {
    return (typeof peer.typeId === "number") && (peer.typeId >= NON_FPP_MIN_TYPEID);
}

module.exports = [
    {
        name: "nonFppMultisync",
        description:
            "Non-FPP controllers (typeId >= 128) discovered on the network via multisync.",
        reset: async () => {
            myData = {
                types: {},
                present: {}
            };
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let labels = new Set();

            if (Array.isArray(obj.multisync)) {
                // The array contains repeated entries for the same peer, and
                // non-FPP peers usually report a uuid of "Failed", so uuid is
                // not a usable dedupe key.  Counting distinct labels per
                // reporting device sidesteps that entirely.
                obj.multisync.forEach(peer => {
                    if (peer === null || typeof peer !== "object") {
                        return;
                    }
                    if (!isNonFpp(peer)) {
                        return;
                    }
                    labels.add(labelForPeer(peer));
                });
            }

            labels.forEach(label => {
                if (!(label in myData.types)) {
                    myData.types[label] = util.newCountByAgeObject();
                }
                util.countByAge(myData.types[label], obj);
            });

            let hasAny = (labels.size > 0) ? "Yes" : "No";
            if (!(hasAny in myData.present)) {
                myData.present[hasAny] = util.newCountByAgeObject();
            }
            util.countByAge(myData.present[hasAny], obj);
        }
    },
];
