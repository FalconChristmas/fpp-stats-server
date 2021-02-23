// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
};

module.exports = [
    {
        name: "outputProcessors",
        description: "Summarizes which outputProcessors are enabled",
        reset: async () => {
            myData = {
            };
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            if ("outputProcessors" in obj) {
                for (const [processor, value] of Object.entries(obj.outputProcessors)) {
                    if ("activeCnt" in value && value.activeCnt > 0) {
                        if (!(processor in myData)) {
                            myData[processor] = util.newCountByAgeObject();
                        }
                        // Only if the outputProcessor is set will it be counted. Different than other statistics
                        util.countByAge(myData[processor], obj);
                    }
                }
            }

        },
    },
];
