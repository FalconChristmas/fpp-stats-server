"use strict";
const util = require("../lib/util.js");

let myData = {};

let UniverseGroup = [
    {
        label: "Zero",
        min: 0,
        max: 0
    },
    {
        label: "1-49",
        min: 1,
        max: 49
    },
    {
        label: "50-99",
        min: 50,
        max: 99
    },
    {
        label: "100-249",
        min: 100,
        max: 249
    },
    {
        label: "249-500",
        min: 249,
        max: 499
    },
    {
        label: "500+",
        min: 500,
        max: Number.MAX_VALUE
    },
];

let channelGroup = [
    {
        label: "Zero",
        min: 0,
        max: 0
    },
    {
        label: "1-999",
        min: 1,
        max: 999
    }, {
        label: "1k-10k",
        min: 1,
        max: 9999
    }, {
        label: "10k-100k",
        min: 10000,
        max: 99999
    }, {
        label: "100k-500k",
        min: 100000,
        max: 499999
    }, {
        label: "500k-1M",
        min: 500000,
        max: 999999
    }, {
        label: "1M+",
        min: 999999 + 1,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "inputUniverses",
        description:
            "How many Input Universes are configured (ci-universes.json)",
        reset: async () => {
            myData = {
                universe: {},
                channel: {},
                universeOrder: [],
                channelOrder: []
            };
            UniverseGroup.forEach(e => {
                myData.universeOrder.push(e.label);
            });
            channelGroup.forEach(e => {
                myData.channelOrder.push(e.label);
            })

        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let uGroup = "Zero";
            let cGroup = "Zero";

            if ("universe_input" in obj) {
                if ("enabled" in obj.universe_input && obj.universe_input.enabled == 1) {
                    if ("universeCount" in obj.universe_input) {
                        let cnt = obj.universe_input.universeCount;
                        UniverseGroup.forEach(e => {
                            if (cnt >= e.min && cnt <= e.max) {
                                uGroup = e.label;
                            }
                        });

                    }
                    if ("channelCount" in obj.universe_input) {
                        let cnt = obj.universe_input.channelCount;
                        channelGroup.forEach(e => {
                            if (cnt >= e.min && cnt <= e.max) {
                                cGroup = e.label;
                            }
                        });
                    }
                }
            }
            if (!(uGroup in myData.universe)) {
                myData.universe[uGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.universe[uGroup], obj);

            if (!(cGroup in myData.channel)) {
                myData.channel[cGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.channel[cGroup], obj);
        },
    },
];
