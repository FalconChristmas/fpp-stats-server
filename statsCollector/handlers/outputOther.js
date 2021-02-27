// Counts all instances where MQTT is configured
"use strict";

const util = require("../lib/util.js");

let myData = {
};

module.exports = [
    {
        name: "outputOther",
        description: "How many configurations are using different outputOther modes",
        reset: async () => {
            myData = {
            };
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let outputs = {};
            // Only want to count unique ones
            if ("output_other" in obj) {
                if ("types" in obj.output_other) {
                    obj.output_other.types.forEach(e => {
                        outputs[e] = 1;
                    });
                }
            }

            for (const output in outputs) {
                if (!(output in myData)) {
                    myData[output] = util.newCountByAgeObject();
                }
                util.countByAge(myData[output], obj); 
            }
        },
    },
];
