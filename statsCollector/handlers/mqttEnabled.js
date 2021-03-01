// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
};

module.exports = [
  {
    name: "mqttEnabled",
    description: "Counts all instances where MQTT is configured",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let mode = "No";
      if ("systemInfo" in obj) {
        if (("fppdStatus" in obj.systemInfo) && obj.systemInfo.fppdStatus == "Not Running") {
          mode = "fppd Stopped";
        }
        if ("mqtt" in obj.systemInfo) {
          if ("configured" in obj.systemInfo.mqtt) {
            if (obj.systemInfo.mqtt.configured) {
              mode = "Yes";
            } else {
              mode = "No";
            }
          }
        }
      } else {
        // no systemInfo
        mode = "fppd Stopped";
      }
      if (!(mode in myData)) {
        myData[mode] = util.newCountByAgeObject();
      }
      util.countByAge(myData[mode], obj);
    },
  },
];
