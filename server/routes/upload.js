const fsPromises = require("fs").promises;
const utils = require("../lib/util.js");

module.exports = [
  {
    method: "POST",
    path: "/upload",
    options: {
      log: {
        collect: true,
      },
    },
    handler: async (request, h) => {
      let status = "OK";
      let payload = request.payload;
      let uuid = "";

      //
      // Validate Payload Type
      //
      if (typeof payload == "string") {
        try {
          payload = JSON.parse(payload);
        } catch (e) {
          status = "Not JSON";
        }
      } else if (typeof payload != "object") {
        status = "Not JSON Object";
      }

      //
      // Validate UUID Format
      //
      if (status == "OK") {
        if (!("uuid" in payload)) {
          status = "Invalid Record";
        } else if (/[^A-Za-z0-9\-]/.test(payload.uuid)) {
          status = "Invalid UUID Format";
        } else {
          uuid = payload.uuid;
        }
      }

      if (status == "OK") {
        payload.ts = new Date().getTime();
        let asString = JSON.stringify(payload);
        let bytes = asString.length;
        if (bytes > 100000) {
          status = "Payload too large";
        } else {
          // Save it
          let dir = utils.getBaseDirectory() + "/" + uuid;
          let filename1 = dir + "/" + payload.ts + ".json";
          let filename2 = dir + "/" + "current.json";
          try {
            try {
              await fsPromises.mkdir(dir);
            } catch (e) {
              if (e.code != "EEXIST") {
                console.log("Error Creating directory " + dir, e);
                request.log("error", e);
                status = "Error occured during save";
              }
            }
            if (status == "OK") {
              await fsPromises.writeFile(filename1, asString);
              await fsPromises.writeFile(filename2, asString);
            }
          } catch (e) {
            console.log("Error during save", e);
            request.log("error", e);
            status = "Error occured during save";
          }
        }
      }

      if (status != "OK") {
        request.log(["input", "error"], status);
        console.log(status);
      }

      let rc = { status, uuid };
      return rc;
    },
  },
];
