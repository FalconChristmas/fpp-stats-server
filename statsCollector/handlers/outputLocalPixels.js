"use strict";
const util = require("../lib/util.js");

let myData = {};


let pixelGroup = [
    {
        label: "Zero",
        min: 0,
        max: 0
    },
    {
        label: "1-499",
        min: 1,
        max: 499
    }, {
        label: "500-1k",
        min: 500,
        max: 999
    }, {
        label: "1k-5k",
        min: 1000,
        max: 4999
    }, {
        label: "5k-10k",
        min: 5000,
        max: 9999
    }, {
        label: "10k-20k",
        min: 10000,
        max: 19999
    }, {
        label: "20k+",
        min: 20000,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "outputLocalPixels",
        description:
            "How many local Pixels are controlled by device (co-pixelStrings.json or co-bbbStrings.json)",
        reset: async () => {
            myData = {
                pixels: {},
                pixelOrder: []
            };
            pixelGroup.forEach(e => {
                myData.pixelOrder.push(e.label);
            })
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let pGroup = "Zero";
            let cnt = 0;

            if ("output_pixel_pi" in obj) {
                if ("pixelCount" in obj.output_pixel_pi) {
                    cnt += obj.output_pixel_pi.pixelCount;
                }
            }

            if ("output_pixel_bbb" in obj) {
                if ("pixelCount" in obj.output_pixel_bbb) {
                    cnt += obj.output_pixel_bbb.pixelCount;
                }
            }

            pixelGroup.forEach(e => {
                if (cnt >= e.min && cnt <= e.max) {
                    pGroup = e.label;
                }
            });

            if (!(pGroup in myData.pixels)) {
                myData.pixels[pGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.pixels[pGroup], obj);
        }
    },
];
