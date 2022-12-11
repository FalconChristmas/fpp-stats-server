"use strict";
const util = require("../lib/util.js");
const moment = require("moment")

const months_back = 15
let myData = {};
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
let dateRanges = [];
let cutoff_date = 0;

function getDateRanges() {
    if (dateRanges.length < 2) {
        let dt = new Date();
        let mon = dt.getMonth();
        let year = dt.getFullYear();
        dt.setDate(1);
        for (let i = 0; i < months_back; i++) {
            dateRanges.push({
                numeric: year*1000 + mon,
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
            cutoff_date = moment().subtract(months_back, 'months').startOf('month');
            console.log("By Month cutoff Date: ", cutoff_date)
            cutoff_date = cutoff_date.toDate();

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
            let keys = [];
            let re = /\/([0-9]+)\.json/;
            // find all dates
            for (const f of allFiles) {
                let m = re.exec(f);
                if (m) {
                    let ts = parseInt(m[1]);

                    // Ignore over 15 months
                    if (ts > cutoff_date) {
                        let dt = new Date(ts)
                        let mon = dt.getMonth();
                        let year = dt.getFullYear();
                        let key =year*1000 + mon;
                        keys.push(key);
                    }
                }
            };
            getDateRanges().forEach(d => {
                if (keys.includes(d.numeric)) {
                    myData.data[d.stringName] += 1;
                }
            })
        }
    },
];
