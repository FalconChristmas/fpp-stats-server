// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
};

module.exports = [
    {
        name: "settingsPopular",
        description: "Describes how frequently specific settings are specificity set in a settings file.",
        reset: async () => {
            myData = {
            };
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            if ("settings" in obj) {
                for (const [setting, value] of Object.entries(obj.settings)) {
                    if (!(setting in myData)) {
                        myData[setting] = util.newCountByAgeObject();
                    }
                    // Only if the setting is set will it be counted. Different than other statistics
                    util.countByAge(myData[setting], obj); 
                }
            }

        },
    },
];
