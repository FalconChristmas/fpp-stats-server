"use strict";
const util = require("../lib/util.js");

let myData = {};

function extractVersion(obj)
{
   let version = "unknown"
   if ("systemInfo" in obj) {
      if ("version" in obj.systemInfo) {
         version = obj.systemInfo.version;
         let pos = version.indexOf("-master-");
         // Normalize master branch
         if (pos > 0) {
            pos += 7; // Length of master
            version = version.substring(0,pos);
         }
      }
   }
   return version;
}

module.exports = [
    {
        name: "capeReleaseVersion",
        description:
            "Combination of Cape and Version",
        reset: async () => {
            myData = {};
        },
        results: async () => {
            if ("None" in myData) {
                delete myData.None;
            }
            if ("Unknown" in myData) {
                delete myData.Unknown;
            }
            return myData;
        },
        currentHandler: async (obj) => {
            let name = "None";
            if ("capeInfo" in obj) {
                if ("name" in obj.capeInfo) {
                    name = obj.capeInfo.name;
                    name+= "-" + extractVersion(obj);
                }
            }
            if (!(name in myData)) {
                myData[name] = util.newCountByAgeObject();
            }
            util.countByAge(myData[name], obj);
        },
    },
];
