"use strict";
const fs = require("fs");
const github = require("../lib/github.js");
const gh = new github();

/**
 * Route to get the FPP commits from the cache
 */
module.exports = [
    {
        method: "GET",
        path: "/fpp_commits",
        handler: async (request, h) => {
            let data = await fs.promises.readFile(gh.getSummaryFileName());
            return JSON.parse(data);
        },
    }
];
