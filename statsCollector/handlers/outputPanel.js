"use strict";
const util = require("../lib/util.js");

let myData = {};

let panelGroup = [
    {
        label: "Zero",
        min: 0,
        max: 0
    },
    {
        label: "1-4",
        min: 1,
        max: 4
    },
    {
        label: "5-8",
        min: 5,
        max: 8
    },
    {
        label: "9-16",
        min: 9,
        max: 16
    },
    {
        label: "17-32",
        min: 17,
        max: 32
    },
    {
        label: "33-64",
        min: 33,
        max: 64
    },
    {
        label: "65+",
        min: 65,
        max: Number.MAX_VALUE
    },
];

let channelGroup = [
    {
        label: "Zero",
        min: 0,
        max: 0
    },
    {
        label: "1-999",
        min: 1,
        max: 999
    }, {
        label: "1k-10k",
        min: 1,
        max: 9999
    }, {
        label: "10k-100k",
        min: 10000,
        max: 99999
    }, {
        label: "100k-500k",
        min: 100000,
        max: 499999
    }, {
        label: "500k-1M",
        min: 500000,
        max: 999999
    }, {
        label: "1M+",
        min: 999999 + 1,
        max: Number.MAX_VALUE
    },
];

module.exports = [
    {
        name: "outputPanels",
        description:
            "How many Panel Output Universes are configured (channeloutputs.json)",
        reset: async () => {
            myData = {
                panels: {},
                panelType: {},
                panelSubType: {},
                panelSize: {},
                channel: {},
                panelOrder: [],
                channelOrder: []
            };
            panelGroup.forEach(e => {
                myData.panelOrder.push(e.label);
            });
            channelGroup.forEach(e => {
                myData.channelOrder.push(e.label);
            })
        },
        results: async () => {
            delete myData.panels.Zero;
            delete myData.channel.Zero;
            delete myData.panelType.None;
            delete myData.panelSubType.None;
            delete myData.panelSize.None;
            return myData;
        },
        currentHandler: async (obj) => {
            let pGroup = "Zero";
            let cGroup = "Zero";
            let panelType = "None";
            let panelSubType = "None";
            let panelSize = "None";

            if ("output_panel" in obj) {
                if (("enabled" in obj.output_panel) && (obj.output_panel.enabled ==0) ) {
                    return;
                }
                if ("panelCount" in obj.output_panel) {
                    let cnt = obj.output_panel.panelCount;
                    panelGroup.forEach(e => {
                        if (cnt >= e.min && cnt <= e.max) {
                            pGroup = e.label;
                        }
                    });

                }
                if ("channelCount" in obj.output_panel) {
                    let cnt = obj.output_panel.channelCount;
                    channelGroup.forEach(e => {
                        if (cnt >= e.min && cnt <= e.max) {
                            cGroup = e.label;
                        }
                    });
                }

                if (("panelWidth" in obj.output_panel) && ("panelHeight" in obj.output_panel)) {
                    panelSize = obj.output_panel.panelWidth + "x" +  obj.output_panel.panelHeight;
                }

                if ("type" in obj.output_panel) {
                    panelType = obj.output_panel.type;
                    panelSubType = panelType;
                }

                if ("subType" in obj.output_panel) {
                    panelSubType = obj.output_panel.subType;
                    if (panelSubType == "LEDscapeMatrix") {
                        panelSubType = "BeagleBone";
                    } else if (panelSubType == "RGBMatrix") {
                        panelSubType += "(Pi)";
                    }
                }
            }

            if (!(panelSize in myData.panelSize)) {
                myData.panelSize[panelSize] = util.newCountByAgeObject();
            }
            util.countByAge(myData.panelSize[panelSize], obj);

            if (!(panelType in myData.panelType)) {
                myData.panelType[panelType] = util.newCountByAgeObject();
            }
            util.countByAge(myData.panelType[panelType], obj);

            if (!(panelSubType in myData.panelSubType)) {
                myData.panelSubType[panelSubType] = util.newCountByAgeObject();
            }
            util.countByAge(myData.panelSubType[panelSubType], obj);

            if (!(pGroup in myData.panels)) {
                myData.panels[pGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.panels[pGroup], obj);

            if (!(cGroup in myData.channel)) {
                myData.channel[cGroup] = util.newCountByAgeObject();
            }
            util.countByAge(myData.channel[cGroup], obj);
        }
    },
];
