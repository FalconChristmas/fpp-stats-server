"use strict";
const util = require("../lib/util.js");

let myData = {};


let memoryGroup = [
  {
    label: "Unknown",
    min: -1,
    max: 1
  },
  {
    label: "512M",
    min: 100,
    max: 512 * 1024
  },
  {
    label: "1GB",
    min: 512 * 1024 + 1,
    max: 1024 * 1024
  }, {
    label: "1-2GB",
    min: 1024 * 1024 + 1,
    max: 1024 * 1024 * 2
  }, {
    label: "2-4GB",
    min: 1024 * 1024 * 2 + 1,
    max: 1024 * 1024 * 4
  }, {
    label: "4-8GB",
    min: 1024 * 1024 * 4 + 1,
    max: 1024 * 1024 * 8
  }, {
    label: "8GB+",
    max: 1024 * 1024 * 8 + 1,
    max: Number.MAX_VALUE
  },
];

module.exports = [
  {
    name: "deviceMemory",
    description:
      "How Much Memory does the host machine have?",
    reset: async () => {
      myData = {
        memory: {},
        memoryOrder: []
      };
      memoryGroup.forEach(e => {
        myData.memoryOrder.push(e.label);
      })
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let memorySize = 0;
      let pGroup = "Unknown";

      if ("memory" in obj) {
        if ("MemTotal" in obj.memory) {
          memorySize = obj.memory.MemTotal;
        }
      }
      memoryGroup.forEach(e => {
        if (memorySize >= e.min && memorySize <= e.max) {
          pGroup = e.label;
        }
      });

      if (!(pGroup in myData.memory)) {
        myData.memory[pGroup] = util.newCountByAgeObject();
      }
      util.countByAge(myData.memory[pGroup], obj);
    }
  },
];
