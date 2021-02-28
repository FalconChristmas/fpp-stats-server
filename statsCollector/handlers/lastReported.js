"use strict";
const util = require("../lib/util.js");

let myData = {};

let myGroups = [
    {
        label: "Today",
        min: 0,
        max: 1
    },
    {
        label: "1-5 days",
        min: 1,
        max: 5
    }, {
        label: "5-14 days",
        min: 5,
        max: 14
    }, {
        label: "14-31 days",
        min: 14,
        max: 31
    }, {
        label: "30-180 days",
        min: 30,
        max: 180
    }, {
        label: "180-365 days",
        min: 180,
        max: 365
    }, {
        label: "> 1 year",
        min: 365,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "lastReported",
        description:
            "How Long has it been since device last reported?",
        reset: async () => {
            myData = {
                data: {},
                order: []
            };
            myGroups.forEach(e => {
                myData.order.push(e.label);
            })
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let pGroup = "> 1 year";
            let diff = 0;
            let now = new Date().getTime();

            if ("ts" in obj) {
                diff = (now - obj.ts) / 1000 / 24 / 60 / 60;  // In Days
            }

            myGroups.forEach(e => {
                if (diff >= e.min && diff < e.max) {
                    pGroup = e.label;
                }
            });

            if (!(pGroup in myData.data)) {
                myData.data[pGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.data[pGroup], obj);
        }
    },
];
