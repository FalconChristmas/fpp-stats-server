// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
  yes : util.newCountByAgeObject(),
  no: util.newCountByAgeObject(),
};

module.exports = [
  {
    name: "mqttEnabled",
    description: "Counts all instances where MQTT is configured",
    reset: async () => {
      myData = {
        yes: util.newCountByAgeObject(),
        no: util.newCountByAgeObject(),
      };
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      if ("systemInfo" in obj) {
        if ("mqtt" in obj.systemInfo) {
          if ("configured" in obj.systemInfo.mqtt) {
            if (obj.systemInfo.mqtt.configured) {
              util.countByAge(myData["yes"], obj);
            } else {
              util.countByAge(myData["no"], obj);
            }
          }
        }
      }
    },
  },
];
