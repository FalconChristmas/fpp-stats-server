"use strict";
const util = require("../lib/util.js");

let myData = {};

// Anything at or above this is lumped together so a misbehaving sensor
// can not create an unbounded number of labels.  Nothing in the current
// data lands here; the highest observed reading is 29V.
const MAX_VOLTS = 30;

function labelFor(volts) {
    if (volts >= MAX_VOLTS) {
        return MAX_VOLTS + "V+";
    }
    return volts + "V";
}

// Sort "5V", "12V", "30V+" numerically rather than alphabetically
function byVoltage(a, b) {
    return parseInt(a, 10) - parseInt(b, 10);
}

module.exports = [
    {
        name: "sensorVoltage",
        description:
            "Reported sensor voltages, rounded to the nearest volt, for devices with voltage monitoring.",
        reset: async () => {
            myData = {
                voltage: {},
                voltageOrder: []
            };
        },
        results: async () => {
            // Only emit labels that actually received counts, so the chart
            // does not render a long row of empty bars.
            myData.voltageOrder = Object.keys(myData.voltage).sort(byVoltage);
            return myData;
        },
        currentHandler: async (obj) => {
            if (!("systemInfo" in obj) || obj.systemInfo === null || typeof obj.systemInfo !== "object") {
                return;
            }
            let sensors = obj.systemInfo.sensors;
            if (!Array.isArray(sensors)) {
                return;
            }

            // A board commonly reports VIN1/VIN2/VIN3 at the same voltage.
            // Collapse to the distinct rounded values so the device is
            // counted once per rail, not once per sensor.
            let seen = new Set();
            sensors.forEach(s => {
                if (s === null || typeof s !== "object") {
                    return;
                }
                if (s.valueType !== "Voltage") {
                    return;
                }
                if (typeof s.value !== "number" || !isFinite(s.value) || s.value < 0) {
                    return;
                }
                seen.add(labelFor(Math.round(s.value)));
            });

            seen.forEach(label => {
                if (!(label in myData.voltage)) {
                    myData.voltage[label] = util.newCountByAgeObject();
                }
                util.countByAge(myData.voltage[label], obj);
            });
        }
    },
];
