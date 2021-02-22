"use strict";
const util = require("../lib/util.js");

let myData = {};
let levels = ["Basic", "Advanced", "Experimental", "Developer"];

function decodeLevel(level) {
  option
}

module.exports = [
  {
    name: "uiLevel",
    description: "What UI Mode is being used",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let mode = 0;
      if ("settings" in obj) {
        if ("uiLevel" in obj.settings) {
          mode = obj.settings.uiLevel
        }
      }
      let level = "Undefined";
      if (mode >=0 && mode < levels.length) {
        level = levels[mode];
      }

      if (!(level in myData)) {
        myData[level] = util.newCountByAgeObject();
      }
      util.countByAge(myData[level], obj);

    },
  },
];
