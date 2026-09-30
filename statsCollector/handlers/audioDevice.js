// Counts which audio output device each install plays through
"use strict";
const util = require("../lib/util.js");

// AudioCardType is the card's name from `aplay -l` ("bcm2835 Headphones"),
// written by fppinit at boot.  Clients only started reporting it after it was
// flagged gatherStats, so most records carry just AudioOutput, which FPP 10
// sets to the ALSA card ID ("Headphones") and FPP 9 and older to a bare card
// index.  An index says nothing about the hardware -- card 0 is the headphone
// jack on one Pi and HDMI on another -- so those records are not counted.
//
// A record reporting both teaches the ID -> type mapping, and results() folds
// ID-only rows into the type they map to.  Generic USB IDs ("Device", "Audio")
// are shared by unrelated cards, so an ID is only folded when every record
// that reports it agrees on the type.

const PIPEWIRE_ADVANCED = "PipeWire Advanced";
const NO_CARD = "No Sound Card (Dummy)";
const SCRUB_MARKER = "__SET__";

let byType = {};
let byId = {};
let idTypes = {};

function usable(v) {
  return typeof v === "string" && v !== "" && v !== SCRUB_MARKER;
}

function bump(map, key, obj) {
  if (!(key in map)) {
    map[key] = util.newCountByAgeObject();
  }
  util.countByAge(map[key], obj);
}

function addCounts(out, name, from) {
  if (!(name in out)) {
    out[name] = util.newCountByAgeObject();
  }
  for (const [k, v] of Object.entries(from)) {
    out[name][k] += v;
  }
}

function label(name) {
  return name === "Dummy" ? NO_CARD : name;
}

module.exports = [
  {
    name: "audioDevice",
    description: "Which audio output device is FPP configured to play through? (FPP 10 and newer)",
    reset: async () => {
      byType = {};
      byId = {};
      idTypes = {};
    },
    results: async () => {
      const out = {};
      for (const [type, counts] of Object.entries(byType)) {
        addCounts(out, label(type), counts);
      }
      for (const [id, counts] of Object.entries(byId)) {
        const types = idTypes[id] ? Object.keys(idTypes[id]) : [];
        addCounts(out, label(types.length === 1 ? types[0] : id), counts);
      }
      return out;
    },
    currentHandler: async (obj) => {
      const s = obj.settings;
      if (!s) {
        return;
      }
      // Full PipeWire routes through a graph that can fan out to several
      // sinks, so the single card in AudioOutput does not describe it.
      if (s.MediaBackend === "pipewire") {
        bump(byType, PIPEWIRE_ADVANCED, obj);
        return;
      }
      const id = usable(s.AudioOutput) && !/^\d+$/.test(s.AudioOutput) ? s.AudioOutput : null;
      if (usable(s.AudioCardType)) {
        bump(byType, s.AudioCardType, obj);
        if (id) {
          idTypes[id] = idTypes[id] || {};
          idTypes[id][s.AudioCardType] = true;
        }
      } else if (id) {
        bump(byId, id, obj);
      }
    },
  },
];
