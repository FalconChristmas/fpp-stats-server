"use strict";
const fs = require("fs");
const { getBaseDirectory } = require("../lib/util.js");

module.exports = [
    {
        method: "GET",
        path: "/summary",
        handler: async (request, h) => {
            let data = await fs.promises.readFile(getBaseDirectory() + "/summary.json");
            return JSON.parse(data);
        },
    },
    {
        method: "GET",
        path: "/summary/{docker}",
        handler: async (request, h) => {
            let filename = "/summary.json"
            if (request.params.docker.toLowerCase() === "false") {
                filename = "/summary_noDocker.json"
            }
            let data = await fs.promises.readFile(getBaseDirectory() + filename);
            return JSON.parse(data);
        },
    },
];
