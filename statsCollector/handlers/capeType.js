"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
    {
        name: "capeType",
        description:
            "What Cape is installed?",
        reset: async () => {
            myData = {};
        },
        results: async () => {
            if ("None" in myData) {
                delete myData.None;
            }
            if ("Unknown" in myData) {
                delete myData.Unknown;
            }
            return myData;
        },
        currentHandler: async (obj) => {
            let name = "None";
            if ("capeInfo" in obj) {
                if ("name" in obj.capeInfo) {
                    name = obj.capeInfo.name;
                }
            }
            if (!(name in myData)) {
                myData[name] = util.newCountByAgeObject();
            }
            util.countByAge(myData[name], obj);
        },
    },
];
