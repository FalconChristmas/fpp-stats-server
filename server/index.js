const Hapi = require("@hapi/hapi");
const fs = require("fs");
const utils = require("./lib/util.js");

if (!utils.isBaseDirectoryValid()) {
  console.log("Invalid output directory: " + utils.getBaseDirectory());
  process.exit(1);
}

const server = new Hapi.Server({
  port: process.env.port || 7654,
  routes: {
    cors: true,
  },
});

server.events.on("log", (event, tags) => {
  if (tags.error) {
    console.log(
      `Server error: ${event.error ? event.error.message : "unknown"}`
    );
  }
});

const start = async () => {
  console.log("Loading routes");
  let routes = [];
  fs.readdirSync(__dirname + "/routes").forEach((file) => {
    console.log("\t", file);
    routes = routes.concat(require(`./routes/${file}`));
  });
  // Add Routes
  server.route(routes);

  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
};

start();
