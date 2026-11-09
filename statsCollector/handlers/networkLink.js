// Counts whether each device is connected over wifi, a wired link, or both,
// split by FPP mode.
"use strict";
const util = require("../lib/util.js");

// network.interfaces is {name: {operstate}}.  Only kernel naming families
// are matched: eth*, en* (enp0s3, end0, enx<mac>) for wired, wlan* and wl*
// for wifi.  Tunnels, bridges and container veths are ignored.
const WIRED = /^(eth|en)/;
const WIFI = /^(wlan|wl)/;

const WIFI_ONLY = "Wifi only";
const WIRED_ONLY = "Wired only";
const BOTH = "Wifi + wired";
// A remote with both links up that sends ColorLight or UDP output is almost
// always bridging: wifi to the player, ethernet out to the controllers.
const BOTH_BRIDGING = "Wifi + wired, bridging to controllers";

const ORDER = [WIFI_ONLY, BOTH_BRIDGING, BOTH, WIRED_ONLY];

let myData = {};

function sendsNetworkOutput(obj) {
  const panel = obj.output_panel;
  if (panel && panel.enabled == 1 && panel.subType === "ColorLight5a75") {
    return true;
  }
  const e131 = obj.output_e131;
  return !!(e131 && e131.enabled == 1 && e131.activeRowCount > 0);
}

module.exports = [
  {
    name: "networkLink",
    description: "Whether each device's network link is wifi, wired or both, by FPP mode.",
    reset: async () => {
      myData = { remote: {}, player: {}, order: ORDER };
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      const net = obj.network;
      if (!net || typeof net !== "object" || !net.interfaces || typeof net.interfaces !== "object") {
        return;
      }
      let mode = obj.systemInfo && obj.systemInfo.fppdMode;
      if (mode === "bridge" || mode === "master") {
        mode = "player";
      }
      if (mode !== "player" && mode !== "remote") {
        return;
      }

      let wifi = false;
      let wired = false;
      for (const [name, info] of Object.entries(net.interfaces)) {
        if (!info || info.operstate !== "UP") {
          continue;
        }
        if (WIFI.test(name)) {
          wifi = true;
        } else if (WIRED.test(name)) {
          wired = true;
        }
      }
      if (!wifi && !wired) {
        return;
      }

      let link = wifi ? (wired ? BOTH : WIFI_ONLY) : WIRED_ONLY;
      if (link === BOTH && mode === "remote" && sendsNetworkOutput(obj)) {
        link = BOTH_BRIDGING;
      }

      const bucket = myData[mode];
      if (!(link in bucket)) {
        bucket[link] = util.newCountByAgeObject();
      }
      util.countByAge(bucket[link], obj);
    },
  },
];
