"use strict";
const util = require("../lib/util.js");

let myData = util.newCountByAgeObject();

module.exports = [
  {
    name: "Instances",
    description: "The total number of unique installs reporting.",
    reset: async () => {
      myData = util.newCountByAgeObject();
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
        // Everything matchines, so just count
        util.countByAge(myData, obj);
    },
  },
];
