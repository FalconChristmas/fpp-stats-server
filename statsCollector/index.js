"use strict";
const fs = require("fs");
const utils = require("./lib/util.js");

if (!utils.isBaseDirectoryValid()) {
  console.log("Invalid output directory: " + utils.getBaseDirectory());
  process.exit(1);
}

async function gatherStats(handlers) {
  console.log("Starting to gather stats", Date());
  await utils.processHandlers(handlers);
  console.log("Done Gathering Stats", Date());
}

const start = async () => {
  let handlers = [];
  fs.readdirSync(__dirname + "/handlers").forEach((file) => {
    console.log("\t", file);
    handlers = handlers.concat(require(`./handlers/${file}`));
  });

  // Run it now
  setTimeout(gatherStats, 10, handlers);
  // Run it every 24 hour
  //setTimeout(gatherStats, 1000*86400, handlers);

  // Temporary set to every hour
  setTimeout(gatherStats, 1000 * 3600, handlers);

};

start();
