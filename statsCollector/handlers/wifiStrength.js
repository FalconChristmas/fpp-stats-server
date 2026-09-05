"use strict";
const util = require("../lib/util.js");

let myData = {};

// Only devices with an active wifi interface are counted.  100% is broken
// out on its own because an exact 100 reading is common enough (roughly a
// fifth of all readings) that folding it into 90-99% would distort it.
let strengthGroup = [
    {
        label: "0-9%",
        min: 0,
        max: 9
    },
    {
        label: "10-19%",
        min: 10,
        max: 19
    }, {
        label: "20-29%",
        min: 20,
        max: 29
    }, {
        label: "30-39%",
        min: 30,
        max: 39
    }, {
        label: "40-49%",
        min: 40,
        max: 49
    }, {
        label: "50-59%",
        min: 50,
        max: 59
    }, {
        label: "60-69%",
        min: 60,
        max: 69
    }, {
        label: "70-79%",
        min: 70,
        max: 79
    }, {
        label: "80-89%",
        min: 80,
        max: 89
    }, {
        label: "90-99%",
        min: 90,
        max: 99
    }, {
        label: "100%",
        min: 100,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "wifiStrength",
        description:
            "Wifi signal strength for devices with an active wifi interface (best interface per device).",
        reset: async () => {
            myData = {
                strength: {},
                strengthOrder: []
            };
            strengthGroup.forEach(e => {
                myData.strengthOrder.push(e.label);
            })
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            if (!("network" in obj) || obj.network === null || typeof obj.network !== "object") {
                return;
            }
            let wifi = obj.network.wifi;
            if (!Array.isArray(wifi) || wifi.length === 0) {
                return;
            }

            // Use the best interface.  A device with a strong wlan0 and a
            // weak or idle second radio is not a weak signal install.
            let best = -1;
            wifi.forEach(w => {
                if (w === null || typeof w !== "object") {
                    return;
                }
                if (typeof w.pct !== "number" || !isFinite(w.pct) || w.pct < 0) {
                    return;
                }
                if (w.pct > best) {
                    best = w.pct;
                }
            });

            // Wifi present but no usable reading
            if (best < 0) {
                return;
            }

            let sGroup = "0-9%";
            strengthGroup.forEach(e => {
                if (best >= e.min && best <= e.max) {
                    sGroup = e.label;
                }
            });

            if (!(sGroup in myData.strength)) {
                myData.strength[sGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.strength[sGroup], obj);
        }
    },
];
