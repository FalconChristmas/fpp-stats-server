/*
 * Stats Collector
 * 
 * Stats collector is designed to be rather flexible.   The "handler" directory 
 * contains individual units for processing each statistic.   The handler will be shown
 * the latest version of the json via currentHandler() so that it can build statistics.
 * between each run, reset() is called and results() is called to return the data. The 
 * "name" paramter will be the name of the json parameter that stores the results, and "description"
 * in the final json message.
 */

"use strict";
const fs = require("fs");
const utils = require("./lib/util.js");

if (!utils.isBaseDirectoryValid()) {
  console.log("Invalid output directory: " + utils.getBaseDirectory());
  process.exit(1);
}

async function gatherStats(handlers) {
  console.log("Starting to gather stats", Date());
  console.time('gather');
  await utils.processHandlers(handlers);
  console.timeEnd('gather');
  console.log("Done Gathering Stats", Date());
  console.log("Updating Zip Archive");

  utils.updateZipArchive();
}

const start = async () => {
  let handlers = [];
  fs.readdirSync(__dirname + "/handlers").forEach((file) => {
    console.log("\t", file);
    handlers = handlers.concat(require(`./handlers/${file}`));
  });

  // Run it now
  setTimeout(gatherStats, 10, handlers);
};

start();
