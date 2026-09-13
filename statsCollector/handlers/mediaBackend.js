"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
  {
    name: "mediaBackend",
    description: "Which media backend is configured to play audio/video?",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let backend = "Not Reported";
      if ("settings" in obj) {
        if ("MediaBackend" in obj.settings) {
          backend = obj.settings.MediaBackend;
        }
      }
      if (backend === "") {
        backend = "Not Reported";
      }
      if (!(backend in myData)) {
        myData[backend] = util.newCountByAgeObject();
      }
      util.countByAge(myData[backend], obj);
    },
  },
];
