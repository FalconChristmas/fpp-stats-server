module.exports = [
  {
    method: "GET",
    path: "/status",
    handler: async (request, h) => {
      let status = "OK";
      let rc = { status };
      return rc;
    },
  },
];
