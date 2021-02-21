"use strict";
const fs = require("fs");
const { getBaseDirectory } = require("../lib/util.js");

module.exports = [
    {
      method: "GET",
      path: "/summary",
      handler: async (request, h) => {
          let data = await fs.promises.readFile(getBaseDirectory() + "/summary.json");
          return JSON.parse(data);
      },
    },
    {
        method: "GET",
        path: "/summary/text",
        handler: async (request, h) => {
            let data = await fs.promises.readFile(getBaseDirectory() + "/summary.json");
            return data;
        },
      },
  
  ];
  