const fs = require("fs");

function getBaseDirectory() {
  return process.env.out_dir || "/tmp/output";
}

function isBaseDirectoryValid() {
  return fs.existsSync(getBaseDirectory());
}

module.exports.getBaseDirectory = getBaseDirectory;
module.exports.isBaseDirectoryValid = isBaseDirectoryValid;
