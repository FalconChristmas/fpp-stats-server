"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
  {
    name: "versionDetailed",
    description: "Which Detailed Release is being used?",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      if ("systemInfo" in obj) {
        if ("version" in obj.systemInfo) {
          let version = obj.systemInfo.version;
          version = version.replace('-dirty', '');

          if (!(version in myData)) {
            myData[version] = util.newCountByAgeObject();
          }
          util.countByAge(myData[version], obj);
        }
      }
    },
  },
];
