"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
    {
        name: "platformVariant",
        description: "Hardware Version",
        reset: async () => {
            myData = {};
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let platform = "Not Defined";
            if ("systemInfo" in obj) {
                if ("platformVariant" in obj.systemInfo) {
                    platform = obj.systemInfo.platformVariant;
                }
            }

            if (!(platform in myData)) {
                myData[platform] = util.newCountByAgeObject();
            }
            util.countByAge(myData[platform], obj);
        },
    },
];
