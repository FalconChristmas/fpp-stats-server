"use strict";
const util = require("../lib/util.js");

let myData = {};

// Cache of IANA zone name -> "UTC-05:00" style label
let offsetCache = {};

// Minutes east of UTC for an IANA zone at a given instant, or null if the
// zone name isn't recognized.
function offsetMinutesAt(zone, date) {
  try {
    const name = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName").value;
    // "GMT" (exactly) means +00:00, otherwise "GMT-05:00"
    if (name === "GMT") {
      return 0;
    }
    const m = /^GMT([+-])(\d{2}):(\d{2})$/.exec(name);
    if (!m) {
      return null;
    }
    const mins = parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
    return m[1] === "-" ? -mins : mins;
  } catch (e) {
    return null;
  }
}

function formatOffset(mins) {
  const sign = mins < 0 ? "-" : "+";
  const abs = Math.abs(mins);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return "UTC" + sign + hh + ":" + mm;
}

// The standard (non-DST) offset for an IANA zone. DST always shifts a zone
// further east, so the standard offset is the smaller of the January and July
// offsets in both hemispheres.
function standardOffsetLabel(zone) {
  if (zone in offsetCache) {
    return offsetCache[zone];
  }
  const year = new Date().getUTCFullYear();
  const jan = offsetMinutesAt(zone, new Date(Date.UTC(year, 0, 1)));
  const jul = offsetMinutesAt(zone, new Date(Date.UTC(year, 6, 1)));
  let label = null;
  if (jan !== null && jul !== null) {
    label = formatOffset(Math.min(jan, jul));
  }
  offsetCache[zone] = label;
  return label;
}

// Fallback for records with no TimeZone setting: the reported string looks
// like "-0400 EDT", so keep the offset and drop the abbreviation. This may be
// a DST offset -- we have no way to tell without the zone name.
function reportedOffsetLabel(reported) {
  const m = /^([+-])(\d{2})(\d{2})/.exec(reported);
  if (!m) {
    return null;
  }
  const mins = parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
  return formatOffset(m[1] === "-" ? -mins : mins);
}

module.exports = [
  {
    name: "timeZone",
    description:
      "For what UTC offset is FPP configured? Taken from the configured timezone's standard (non-DST) offset where known, otherwise from the offset the device reported.",
    reset: async () => {
      myData = {};
    },
    results: async () => {
      return myData;
    },
    currentHandler: async (obj) => {
      let label = null;

      if ("settings" in obj && typeof obj.settings.TimeZone === "string") {
        let zone = obj.settings.TimeZone;
        // A few devices report the zone URL-encoded ("America%2FNew_York")
        if (zone.indexOf("%") !== -1) {
          try {
            zone = decodeURIComponent(zone);
          } catch (e) {
            // leave it alone; it just won't resolve
          }
        }
        label = standardOffsetLabel(zone);
      }

      if (label === null && typeof obj.timezone === "string") {
        label = reportedOffsetLabel(obj.timezone);
      }

      if (label === null) {
        label = "Not Reported";
      }

      if (!(label in myData)) {
        myData[label] = util.newCountByAgeObject();
      }
      util.countByAge(myData[label], obj);
    },
  },
];
