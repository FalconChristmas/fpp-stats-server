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
      myData = {
        Yes: util.newCountByAgeObject(),
        No: util.newCountByAgeObject(),
        "fppd Stopped": util.newCountByAgeObject(),
      };
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let mode = "fppd Stopped";
      if ("systemInfo" in obj) {
        if ("mqtt" in obj.systemInfo) {
          if ("configured" in obj.systemInfo.mqtt) {
            if (obj.systemInfo.mqtt.configured) {
              mode = "Yes";
            } else {
              mode = "No";
            }
          }
        }
      }
      util.countByAge(myData[mode], obj);
    },
  },
];
