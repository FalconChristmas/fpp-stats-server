"use strict";
const fs = require("fs");
const path = require("path");
const glob = require("glob-promise");

const archiver = require('archiver');
const { Console } = require("console");

// Clones an Object using Java Script
function simpleClone(a) {
  return JSON.parse(JSON.stringify(a));
}

// A standard counting template that is supported by
// countByAge()
function newCountByAgeObject() {
  let temp = {
    totalCount: 0,
    last7Days: 0,
    last15Days: 0,
    last30Days: 0,
    last60Days: 0,
    last180Days: 0,
    last365Days: 0,
  };

  return simpleClone(temp);
}

// helper function that counts by different time periods
function countByAge(collector, obj) {
  collector.totalCount += 1;
  if ("ts" in obj) {
    let diff_days = (new Date().getTime() - obj.ts) / 86400000;

    if (diff_days < 7) {
      ++collector.last7Days;
    }
    if (diff_days < 15) {
      ++collector.last15Days;
    }
    if (diff_days < 30) {
      ++collector.last30Days;
    }
    if (diff_days < 60) {
      ++collector.last60Days;
    }
    if (diff_days < 180) {
      ++collector.last180Days;
    }
    if (diff_days < 365) {
      ++collector.last365Days;
    }
  }
}

// Returns the directory where data files are stored
function getBaseDirectory() {
  return process.env.out_dir || "/tmp/output";
}

function isBaseDirectoryValid() {
  return fs.existsSync(getBaseDirectory());
}

function notDocker(obj) {
  let platform = "Unknown";

  if ("systemInfo" in obj) {
    if ("platform" in obj.systemInfo) {
      platform = obj.systemInfo.platform;
    }
  }
  return (platform != "Docker");
}

function truePredicate() {
  return true;
}

// This is the "main" loop that will run all
// processors over all files and save the final JSON file.
async function processHandlers(handlers) {

  // These can not be in parallel because the counters are reused. 
  console.log('Starting Summary.json')
  await processHandlersReally(handlers, truePredicate, "summary.json");
  console.log('Starting No Docker')
  await processHandlersReally(handlers, notDocker, "summary_noDocker.json");

}

async function* walk(dir) {
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walk(entry);
        else if (d.isFile()) yield entry;
    }
}

// This is the "main" loop that will run all
// processors over all files and save the final JSON file.
async function processHandlersReally(handlers, predicate, filename) {
  // Reset All counters
  console.log('Calling Reset')
  await Promise.all(
    handlers.map(async (h) => {
      await h.reset();
    })
  );

  console.log("Searching for data")

  // Find the current files
  // Don't use glob in this outer loop because of memory leak
  // https://github.com/isaacs/node-glob/issues/435
  for await (const f of walk(getBaseDirectory())) {
    if (!(f.endsWith("current.json"))) {
      continue;
    }

    let obj = JSON.parse(await fs.promises.readFile(f));
    if (!predicate(obj)) {
      continue;
    }

    // do all CurrentHandlers
    for (const h of handlers) {
      if ("currentHandler" in h) {
        await h.currentHandler(obj);
      }
    }

    // Read all files for this UUID
    let allFiles = await glob.promise(
      getBaseDirectory() + "/" + obj.uuid + "/*.json"
    );

    // do all CurrentHandlers
    for (const h of handlers) {
      if ("historyHandler" in h) {
        await h.historyHandler(obj, allFiles);
      }
    }
  } // End of Processing all files

  console.log('Starting Gather');

  // Gather Results
  let results = {
    ts: new Date().getTime()
  };
  await Promise.all(
    handlers.map(async (h) => {
      let obj = await h.results();
      results[h.name] = {
        description: h.description,
        data: obj,
      };
    })
  );

  // Write the Resulting JSON file.
  let asJson = JSON.stringify(results, null, 4);
  await fs.promises.writeFile(getBaseDirectory() + "/" + filename, asJson);
}

function updateZipArchive() {
  console.time('createZip');
  const output = fs.createWriteStream(getBaseDirectory() + '/all_files.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  output.on('close', function () {
    console.log('Archive File Updated.');
    console.log(archive.pointer() + ' total bytes');
    console.timeEnd('createZip');
  });

  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      // log warning
      console.log("Warning creating archive");
      console.log(err);
    } else {
      console.log("Error creating archive");
      console.log(err);
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', function (err) {
    Console.log("On Error creating archive");
    console.log(err);
  });

  // pipe archive data to the file
  archive.pipe(output);

  // append files from a glob pattern
  archive.glob('**/*.json', { cwd: getBaseDirectory() });

  archive.finalize();

}

module.exports.getBaseDirectory = getBaseDirectory;
module.exports.isBaseDirectoryValid = isBaseDirectoryValid;
module.exports.processHandlers = processHandlers;
module.exports.simpleClone = simpleClone;
module.exports.newCountByAgeObject = newCountByAgeObject;
module.exports.countByAge = countByAge;
module.exports.updateZipArchive = updateZipArchive;
