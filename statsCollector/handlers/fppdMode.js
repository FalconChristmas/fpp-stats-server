"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
  {
    name: "fppMode",
    description:
      "Is instance configured as Standalone, Master, Remote, or Bridge",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let mode = "fppd Stopped";
      if ("systemInfo" in obj) {
        if ("fppdMode" in obj.systemInfo) {
          mode = obj.systemInfo.fppdMode;
        }
      }
      if (!(mode in myData)) {
        myData[mode] = util.newCountByAgeObject();
      }
      util.countByAge(myData[mode], obj);

    },
  },
];
