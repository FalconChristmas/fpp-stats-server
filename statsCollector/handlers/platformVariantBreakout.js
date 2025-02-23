"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
    {
        name: "platformVariantBreakout",
        description: "PI 2, 3, or 4, BBB variant",
        reset: async () => {
            myData = {};
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let platform = "Generic";
            let platformVariant = "Unknown";

            if ("systemInfo" in obj) {
                if ("platform" in obj.systemInfo) {
                    platform = obj.systemInfo.platform;

                    if ("platformVariant" in obj.systemInfo) {
                        if ("platformVariant" in obj.systemInfo) {
                            platformVariant = obj.systemInfo.platformVariant;
                        }
                    }

                    if (platform == "BeagleBone 64" || platform == "BeagleBone Black") {
                        platform = "BeagleBone";
                    }

                    if (platform != "BeagleBone" && platform != "Raspberry Pi" && platform != "Docker") {
                        platform = "Generic";
                    }

                    if (!(platform in myData)) {
                        myData[platform] = {
                            data: {},
                            description: "Platform Variant for " + platform
                        };
                    }

                    if (!(platformVariant in myData[platform].data)) {
                        myData[platform].data[platformVariant] = util.newCountByAgeObject();
                    }
                    util.countByAge(myData[platform].data[platformVariant], obj);
                }
            }
        },
    }
];
