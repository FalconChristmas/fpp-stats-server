"use strict";
const fs = require("fs");
const github = require("../lib/github.js");
const gh = new github();

/**
 * Route to check the health of the server and the GitHub API
 */
module.exports = [
    {
        method: "GET",
        path: "/health",
        handler: async (request, h) => {
            let data = await fs.promises.readFile(gh.getSummaryFileName());
            data = JSON.parse(data);
            let now = new Date();
            let lastUpdated = new Date(data.last_updated);
            let differenceInSeconds = Math.floor((now - lastUpdated) / 1000);
            let rc = {
                status: "OK",
                github: {
                    last_updated: data.last_updated,
                    differenceInSeconds: differenceInSeconds
                }
            }
            if (differenceInSeconds > 4800) {
                rc.status = "WARNING";
            }
            return rc;
        },
    }
];
