"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
  {
    name: "platform",
    description: "BBB, PI, or other Platform",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      if ("systemInfo" in obj) {
        if ("platform" in obj.systemInfo) {
          let platform = obj.systemInfo.platform;

          if (!(platform in myData)) {
            myData[platform] = util.newCountByAgeObject();
          }
          util.countByAge(myData[platform], obj);
        }
      }
    },
  },
];
