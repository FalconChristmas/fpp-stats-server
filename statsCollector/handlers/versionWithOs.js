"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
  {
    name: "versionWithOS",
    description: "Which Release and OS Version",
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

          version += "/";
          if ("osVersion" in obj.systemInfo) {
              version += obj.systemInfo["osVersion"];
          } else {
              version += "Unknown"
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
