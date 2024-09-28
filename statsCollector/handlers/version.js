"use strict";
const util = require("../lib/util.js");

const revision_regx = /^(\d+\.\d+)/;

let myData = {};

module.exports = [
  {
    name: "version",
    description: "Which Release is being used?",
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
          let pos = version.indexOf("-master-");
          // Normalize master branch
          if (pos > 0) {
            pos += 7; // Length of master
            version = version.substring(0,pos);
          }

          pos = version.indexOf("-");
          if (pos > 0) {
            version = version.substring(0,pos);
          }

          // Round data to remove "revision"
          const match = version.match(revision_regx);
          if (match) {
            version = match[1];
          }

          if (version != "Unknown") {
            version = version.concat(".x");
          }

          if (!(version in myData)) {
            myData[version] = util.newCountByAgeObject();
          }
          util.countByAge(myData[version], obj);
        }
      }
    },
  },
];
