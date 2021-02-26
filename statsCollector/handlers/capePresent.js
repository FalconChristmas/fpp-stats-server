"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
    {
        name: "capeInstalled",
        description:
            "Is a Cape Installed",
        reset: async () => {
            myData = {};
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let name = "No";
            if ("capeInfo" in obj) {
                if ("name" in obj.capeInfo) {
                    name = "Yes";
                }
            }
            if (!(name in myData)) {
                myData[name] = util.newCountByAgeObject();
            }
            util.countByAge(myData[name], obj);
        },
    },
];
