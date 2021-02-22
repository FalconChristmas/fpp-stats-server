"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
    {
        name: "capeInstalled",
        description:
            "What Cape is installed?",
        reset: async () => {
            myData = {};
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            if ("capeInfo" in obj) {
                let name = "None";
                if ("name" in obj.capeInfo) {
                    name = obj.capeInfo.name;
                }
                if (!(name in myData)) {
                    myData[name] = util.newCountByAgeObject();
                }
                util.countByAge(myData[name], obj);
            }
        },
    },
];
