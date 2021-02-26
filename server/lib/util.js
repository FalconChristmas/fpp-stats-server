const fs = require("fs");
const glob = require("glob-promise");

function getBaseDirectory() {
  return process.env.out_dir || "/tmp/output";
}

function isBaseDirectoryValid() {
  return fs.existsSync(getBaseDirectory());
}

// Logs the UUID and seconds since previous
function logRecord(obj) {
  // Run later
  setTimeout(async function(obj) {
    let currentFiles = await glob.promise(
      getBaseDirectory() + "/" + obj.uuid + "/*.json"
    );

    let re = /\/([0-9]+)\.json/;
    let previous = 0;
    for (const f of currentFiles) {
      m = re.exec(f);
      if (m) {
          testVal = parseInt(m[1]);
          if (obj.ts != testVal && (previous< testVal)) {
            previous = testVal;
          }
      }
    };

    let diff = 0;
    let units = "First Record";
    if (previous> 0) {
      diff = (obj.ts - previous) / 1000; // to seconds
      units = "Seconds Ago";
      if (diff > 120) {
        diff = diff/60;
        units = "Minutes Ago";
        if (diff > 120) {
          diff = diff/60;
          units = "Hours Ago";
        }
        if (diff > 48) {
          diff = diff/24;
          units = "Days Ago";
        }
      }
    }

    console.log("Received: ", obj.uuid, ", Previous was: ", Math.round(diff), units);
  
  }, 20, obj);
}

module.exports.getBaseDirectory = getBaseDirectory;
module.exports.isBaseDirectoryValid = isBaseDirectoryValid;
module.exports.logRecord = logRecord;
