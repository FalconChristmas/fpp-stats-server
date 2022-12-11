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
      let multiText = "MultiSync Disabled"
      if ("systemInfo" in obj) {
        if ("fppdMode" in obj.systemInfo) {
          mode = obj.systemInfo.fppdMode;
        }
      }

      if (mode == 'bridge' || mode == 'master') {
        mode = 'player';
      }

      if ("settings" in obj) {
        if ("MultiSyncEnabled" in obj.settings) {
          if (obj.settings.MultiSyncEnabled == 1) {
            multiText = "MultiSync Enabled";
          } else {
            multiText ="MultiSync Disabled";
          }
        }
      }

      if (mode != "fppd Stopped") {
        mode = mode + "-" + multiText;
      }

      if (!(mode in myData)) {
        myData[mode] = util.newCountByAgeObject();
      }
      util.countByAge(myData[mode], obj);

    },
  },
];
