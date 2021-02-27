"use strict";
const util = require("../lib/util.js");

let myData = {};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
let dateRanges = [];

function getDateRanges() {
    if (dateRanges.length < 2) {
        let dt = new Date();
        let mon = dt.getMonth();
        let year = dt.getFullYear();
        dt.setDate(1);
        for (let i = 0; i < 12; i++) {
            dateRanges.push({
                numeric: mon,
                stringName: months[mon] + "-" + year
            });
            if (--mon < 0) {
                mon = 11;
                --year;
            }
        }
    }
    return dateRanges;
}

module.exports = [
    {
        name: "uniqueByMonth",
        description:
            "Unique Devices Reporting Each Month",
        reset: async () => {
            myData = {
                order: [],
                data: {}
            };
            // Rebuild as current date has changed
            dateRanges = [];
            getDateRanges().forEach(d => {
                myData.order.push(d.stringName);
                myData.data[d.stringName] = 0;
            });
        },
        results: async () => {
            return myData;
        },
        historyHandler(obj, allFiles) {
            let months = [];
            let now = new Date().getTime();
            let re = /\/([0-9]+)\.json/;
            // find all dates
            for (const f of allFiles) {
                let m = re.exec(f);
                if (m) {
                    let ts = parseInt(m[1]);
                    let diff = now - ts;

                    // Ignore over 1 year old
                    if (diff < (365 * 24 * 60 * 60 * 1000)) {
                        months.push(new Date(ts).getMonth());
                    }
                }
            };
            getDateRanges().forEach(d => {
                if (months.includes(d.numeric)) {
                    myData.data[d.stringName] += 1;
                }
            })
        }
    },
];
