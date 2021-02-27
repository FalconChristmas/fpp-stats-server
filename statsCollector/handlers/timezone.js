"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
  {
    name: "timeZone",
    description:
      "For what Timezone is FPP configured?",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let timezone = "Not Reported";
      if ("timezone" in obj) {
          timezone = obj.timezone;
      }
      if (!(timezone in myData)) {
        myData[timezone] = util.newCountByAgeObject();
      }
      util.countByAge(myData[timezone], obj);

    },
  },
];
