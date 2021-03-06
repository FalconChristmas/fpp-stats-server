const utils = require("../lib/util.js");

// Returns the archive zipfile
module.exports = [
  {
    method: "GET",
    path: "/archive/" + process.env.DOWNLOAD_KEY,
    handler: (request, h) => {
      let f = utils.getBaseDirectory() + '/all_files.zip';
      console.log("Someone downloading the archive: ", f);
      return h.file(f, { confine: false, filename: "archive.zip" });
    },
  },
];
