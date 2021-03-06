"use strict";
const fs = require("fs");
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

// This is the "main" loop that will run all
// processors over all files and save the final JSON file.
async function processHandlers(handlers) {
  // Reset All counters
  await Promise.all(
    handlers.map(async (h) => {
      await h.reset();
    })
  );

  // Find the current files
  let currentFiles = await glob.promise(
    getBaseDirectory() + "/**/current.json"
  );
  await Promise.all(
    currentFiles.map(async (f) => {
      let obj = JSON.parse(await fs.promises.readFile(f));

      // do all CurrentHandlers
      await Promise.all(
        handlers.map(async (h) => {
          if ("currentHandler" in h) {
            await h.currentHandler(obj);
          }
        })
      );

      let allFiles = await glob.promise(
        getBaseDirectory() + "/" + obj.uuid + "/*.json"
      );

      await Promise.all(
        handlers.map(async (h) => {
          if ("historyHandler" in h) {
            await h.historyHandler(obj, allFiles);
          }
        })
      );
    })
  );

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
  await fs.promises.writeFile(getBaseDirectory() + "/summary.json", asJson);
}

function updateZipArchive() {
  const output = fs.createWriteStream(getBaseDirectory() + '/all_files.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  output.on('close', function () {
    console.log('Archive File Updated.');
    console.log(archive.pointer() + ' total bytes');
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
