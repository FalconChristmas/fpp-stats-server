"use strict";
const util = require("../lib/util.js");

let myData = {};


let storageGroup = [
  {
    label: "Unknown",
    min: -1,
    max: 1
  }, {
    label: "4GB",
    min: 2,
    max: 4 * 1024
  }, {
    label: "4.1-8GB",
    min: 4 * 1024 + 1,
    max: 8 * 1024
  }, {
    label: "8.1-16GB",
    min: 8 * 1024 + 1,
    max: 16 * 1024
  }, {
    label: "16.1-32GB",
    min: 16 * 1024 + 1,
    max: 32 * 1024
  }, {
    label: "32.1-64GB",
    min: 32 * 1024 + 1,
    max: 64 * 1024
  }, {
    label: "64.1-128GB",
    min: 64 * 1024 + 1,
    max: 128 * 1024
  }, {
    label: "128.1-256GB",
    min: 128 * 1024 + 1,
    max: 256 * 1024
  }, {
    label: ">256GB",
    min: 256 * 1024 + 1,
    max: Number.MAX_VALUE
  },
];

module.exports = [
  {
    name: "deviceStorage",
    description:
      "How Much Media Storage does the host machine have?",
    reset: async () => {
      myData = {
        storage: {},
        storageOrder: [],
        usedStorage: {},
        usedStorageOrder: []
      };
      storageGroup.forEach(e => {
        myData.storageOrder.push(e.label);
        myData.usedStorageOrder.push(e.label);
      })
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let storageSize = 0;
      let usedStorageSize = 0;
      let pGroup = "Unknown";
      let uGroup = "Unknown";

      if ("systemInfo" in obj) {
          if ("utilization" in obj.systemInfo) {
              if ("Disk" in obj.systemInfo.utilization) {
                  if ("Media" in obj.systemInfo.utilization.Disk) {
                      storageSize = obj.systemInfo.utilization.Disk.Media.Total;
                      usedStorageSize = obj.systemInfo.utilization.Disk.Media.Total - obj.systemInfo.utilization.Disk.Media.Free;


                      storageSize /= 1024 * 1024;
                      usedStorageSize /= 1024 * 1024;
                  }
              }
          }
      }

      storageGroup.forEach(e => {
        if (storageSize >= e.min && storageSize <= e.max) {
          pGroup = e.label;
        }
        if (usedStorageSize >= e.min && usedStorageSize <= e.max) {
          uGroup = e.label;
        }
      });

      if (!(pGroup in myData.storage)) {
        myData.storage[pGroup] = util.newCountByAgeObject();
      }
      if (!(uGroup in myData.usedStorage)) {
        myData.usedStorage[uGroup] = util.newCountByAgeObject();
      }
      util.countByAge(myData.storage[pGroup], obj);
      util.countByAge(myData.usedStorage[uGroup], obj);
    }
  },
];
