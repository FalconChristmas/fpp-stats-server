"use strict";
const util = require("../lib/util.js");

let myData = {};

const MB = 1000000;
const GB = 1000 * MB;

// Only devices with at least one sequence are counted, so the buckets
// deliberately have no "Zero" entry.  Ranges are finer below 500MB because
// that is where the bulk of the installs sit (median is roughly 157MB).
let bytesGroup = [
    {
        label: "<10MB",
        min: 0,
        max: 10 * MB - 1
    },
    {
        label: "10-50MB",
        min: 10 * MB,
        max: 50 * MB - 1
    }, {
        label: "50-100MB",
        min: 50 * MB,
        max: 100 * MB - 1
    }, {
        label: "100-500MB",
        min: 100 * MB,
        max: 500 * MB - 1
    }, {
        label: "500MB-1GB",
        min: 500 * MB,
        max: GB - 1
    }, {
        label: "1-5GB",
        min: GB,
        max: 5 * GB - 1
    }, {
        label: "5-10GB",
        min: 5 * GB,
        max: 10 * GB - 1
    }, {
        label: "10GB+",
        min: 10 * GB,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "sequenceBytes",
        description:
            "How much sequence data is stored on devices that have at least one sequence?",
        reset: async () => {
            myData = {
                bytes: {},
                bytesOrder: []
            };
            bytesGroup.forEach(e => {
                myData.bytesOrder.push(e.label);
            })
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            if (!("files" in obj) || obj.files === null || typeof obj.files !== "object") {
                return;
            }
            let seq = obj.files.sequences;
            if (seq === null || typeof seq !== "object") {
                return;
            }

            // Devices with no sequences are excluded entirely
            if (!(typeof seq.cnt === "number") || seq.cnt <= 0) {
                return;
            }

            let bytes = 0;
            if (typeof seq.bytes === "number" && seq.bytes > 0) {
                bytes = seq.bytes;
            }

            let bGroup = "<10MB";
            bytesGroup.forEach(e => {
                if (bytes >= e.min && bytes <= e.max) {
                    bGroup = e.label;
                }
            });

            if (!(bGroup in myData.bytes)) {
                myData.bytes[bGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.bytes[bGroup], obj);
        }
    },
];
