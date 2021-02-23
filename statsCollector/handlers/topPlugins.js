// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
};

function countIt(c, plugin) {
    if (!(plugin in c)) {
        c[plugin] = 0;
    }
    c[plugin] += 1;
}

module.exports = [
    {
        name: "topPlugins",
        description: "Top Plugins",
        reset: async () => {
            myData = {
                totalCount: {},
                last15Days: {},
                last30Days: {},
                last60Days: {},
                last180Days: {},
                last365Days: {},
            };
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let diff_days = (new Date().getTime() - obj.ts) / 86400000;
            if (diff_days > 365) {
                return;
            }
            if ("plugins" in obj) {
                for (const [plugin, value] of Object.entries(obj.plugins)) {
                    countIt(myData.totalCount, plugin);

                    if (diff_days < 15) {
                        countIt(myData.last15Days, plugin);
                    }
                    if (diff_days < 30) {
                        countIt(myData.last30Days, plugin);
                    }
                    if (diff_days < 60) {
                        countIt(myData.last60Days, plugin);
                    }
                    if (diff_days < 180) {
                        countIt(myData.last180Days, plugin);
                    }
                    if (diff_days < 365) {
                        countIt(myData.last365Days, plugin);
                    }
                }
            }
        }
    }
];
