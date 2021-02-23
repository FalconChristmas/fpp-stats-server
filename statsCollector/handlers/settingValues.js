// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
};

module.exports = [
    {
        name: "settingsValues",
        description: "Describes the most popular value for each setting in a settings file. (Defaults not included.)",
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
                        myData[setting] = {};
                    }
                    if (!(value in myData[setting])) {
                        myData[setting][value] = util.newCountByAgeObject();
                    }
                    // Only if the setting is set will it be counted. Different than other statistics
                    util.countByAge(myData[setting][value], obj); 
                }
            }

        },
    },
];
