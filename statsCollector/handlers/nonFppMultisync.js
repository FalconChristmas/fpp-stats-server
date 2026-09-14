"use strict";
const util = require("../lib/util.js");

let myData = {};

module.exports = [
    {
        name: "nonFppMultisync",
        description:
            "Installs that can see each non-FPP controller model (typeId >= 128) via multisync.  This counts installs, not controllers; outputHardware counts the units.",
        reset: async () => {
            myData = {
                types: {},
                present: {}
            };
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let labels = new Set();

            if (Array.isArray(obj.multisync)) {
                // The array contains repeated entries for the same peer, and
                // non-FPP peers usually report a uuid of "Failed", so uuid is
                // not a usable dedupe key.  Counting distinct labels per
                // reporting device sidesteps that entirely.
                obj.multisync.forEach(peer => {
                    if (peer === null || typeof peer !== "object") {
                        return;
                    }
                    if (!util.isNonFppPeer(peer)) {
                        return;
                    }
                    labels.add(util.nonFppLabel(peer));
                });
            }

            labels.forEach(label => {
                if (!(label in myData.types)) {
                    myData.types[label] = util.newCountByAgeObject();
                }
                util.countByAge(myData.types[label], obj);
            });

            let hasAny = (labels.size > 0) ? "Yes" : "No";
            if (!(hasAny in myData.present)) {
                myData.present[hasAny] = util.newCountByAgeObject();
            }
            util.countByAge(myData.present[hasAny], obj);
        }
    },
];
