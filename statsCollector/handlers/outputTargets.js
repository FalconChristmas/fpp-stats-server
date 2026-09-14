"use strict";
const util = require("../lib/util.js");

let myData = {};

// FPP 10.1 rolls the network output rows up per destination and reports the
// result under output_e131.targets.  Before it existed the payload could say
// how many output ROWS an install had but not how many controllers those rows
// pointed at -- twelve rows aimed at one controller and twelve controllers
// looked identical.
//
// Broadcast and multicast destinations are deliberately excluded from
// targets.count by FPP and reported under nonUnicast instead, because they are
// not one device; the counts here inherit that.

let targetGroup = [
    {
        label: "1",
        min: 1,
        max: 1
    }, {
        label: "2-3",
        min: 2,
        max: 3
    }, {
        label: "4-7",
        min: 4,
        max: 7
    }, {
        label: "8-15",
        min: 8,
        max: 15
    }, {
        label: "16-31",
        min: 16,
        max: 31
    }, {
        label: "32+",
        min: 32,
        max: Number.MAX_VALUE
    },
];

// How much of what an install feeds can FPP actually see?  A destination is
// "discovered" when it answers FPP's discovery, so an install whose targets
// are all undiscovered is driving gear this data set is otherwise blind to.
const DISCOVERY_ORDER = ["All discovered", "Some discovered", "None discovered"];

// Whether an install describes a controller with a single row or spreads it
// over several.  This is what makes a raw row count readable as a controller
// count, or not.
const ROWS_ORDER = ["One row each", "Some split over rows"];

// An empty collection is serialized as [] rather than {}, so a plain
// "typeof x === object" test is not enough to know it is a map.
function isMap(v) {
    return (v !== null) && (typeof v === "object") && !Array.isArray(v);
}

function countIn(collector, label, obj) {
    if (!(label in collector)) {
        collector[label] = util.newCountByAgeObject();
    }
    util.countByAge(collector[label], obj);
}

module.exports = [
    {
        name: "outputTargets",
        description:
            "How many distinct controllers is an install sending network output to, and how many of them can FPP see?",

        reset: async () => {
            myData = {
                targets: {},
                targetsOrder: [],
                discovery: {},
                discoveryOrder: DISCOVERY_ORDER.slice(),
                rowsPerTarget: {},
                rowsPerTargetOrder: ROWS_ORDER.slice()
            };
            targetGroup.forEach(e => {
                myData.targetsOrder.push(e.label);
            });
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            if (obj === null || typeof obj !== "object") {
                return;
            }
            let e131 = obj.output_e131;
            if (!isMap(e131)) {
                return;
            }
            let t = e131.targets;
            if (!isMap(t)) {
                // Payload predates the field
                return;
            }

            let count = (typeof t.count === "number") ? t.count : 0;
            if (count <= 0) {
                // Nothing unicast to count.  An install that only broadcasts,
                // or has no network output at all, is not a zero-controller
                // install so it is left out rather than charted as one.
                return;
            }

            let tGroup = null;
            targetGroup.forEach(g => {
                if (count >= g.min && count <= g.max) {
                    tGroup = g.label;
                }
            });
            if (tGroup !== null) {
                countIn(myData.targets, tGroup, obj);
            }

            let disc = isMap(t.discovered) && (typeof t.discovered.targets === "number")
                ? t.discovered.targets : 0;
            let undisc = isMap(t.undiscovered) && (typeof t.undiscovered.targets === "number")
                ? t.undiscovered.targets : 0;
            if (disc + undisc > 0) {
                let label = (undisc === 0) ? "All discovered"
                    : (disc === 0) ? "None discovered"
                        : "Some discovered";
                countIn(myData.discovery, label, obj);
            }

            let maxRows = (typeof t.maxRowsPerTarget === "number") ? t.maxRowsPerTarget : 0;
            if (maxRows > 0) {
                countIn(myData.rowsPerTarget,
                    (maxRows > 1) ? "Some split over rows" : "One row each", obj);
            }
        }
    },
];
