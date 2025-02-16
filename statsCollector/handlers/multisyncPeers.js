"use strict";
const util = require("../lib/util.js");

let myData = {};


let peerGroup = [
    {
        label: "None",
        min: -1,
        max: 0
    },
    {
        label: "1",
        min: 1,
        max: 1
    },
    {
        label: "2-3",
        min: 2,
        max: 3
    },
    {
        label: "4-5",
        min: 4,
        max: 5
    },
    {
        label: "6-10",
        min: 6,
        max: 10
    }, 
    {
        label: "11-20",
        min: 11,
        max: 20
    },
    {
        label: "21-50",
        min: 21,
        max: 50
    },
    {
        label: "51-100",
        min: 51,
        max: 100
    }, {
        label: "101+",
        min: 101,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "multisyncPeers",
        description: "How many multisync peers are connected to the host machine?",

        reset: async () => {
            myData = {
                peers: {},
                peerOrder: []
            };
            peerGroup.forEach(e => {
                myData.peerOrder.push(e.label);
            })
        },
        results: async () => {
            return myData;
        },
        currentHandler: async (obj) => {
            let peerCnt = 0;
            let pGroup = "Unknown";

            if ("multisync" in obj) {
                peerCnt = obj.multisync.length;
            }
            peerGroup.forEach(e => {
                if (peerCnt >= e.min && peerCnt <= e.max) {
                    pGroup = e.label;
                }
            });

            if (!(pGroup in myData.peers)) {
                myData.peers[pGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.peers[pGroup], obj);
        }
    },
];
