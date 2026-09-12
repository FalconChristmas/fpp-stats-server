/* ===================================================================
   FPP Usage Statistics

   The page is generated from one REGISTRY array. Each entry describes
   a statistic once — title, description, keywords, section, how to
   pull its rows — and that single description drives the card, the
   finder entry, the chart, the table, the CSV export and the anchor.
   Adding a statistic means adding one entry here; there is no
   hand-maintained markup per chart.

   `limit` applies to the CHART ONLY. The table and the CSV always emit
   every row, which is why the old "Top 15 Capes" chart and the
   separate "Installed Capes" table are now a single card.
   =================================================================== */

"use strict";

var API_BASE = window.FPP_STATS_API || "https://fppstats.thehormanns.net/api/summary/";

/* ------------------------------------------------------------------
   Data access. Almost every statistic arrives as
   {label: {timeWindow: count}}, so one normalizer feeds every view.
   ------------------------------------------------------------------ */

const byValue = (a, b) => b.value - a.value;

// {label: {window: n}} -> rows sorted by value, descending
function ageRows(obj, win, { drop = [] } = {}) {
  return Object.entries(obj || {})
    .filter(([k]) => !drop.includes(k))
    .map(([k, v]) => ({ label: k || "Unknown", value: (v && v[win]) || 0 }))
    .filter(r => r.value > 0)
    .sort(byValue);
}

// Same, held in a given ordinal bucket order. Buckets like "1-2GB" are
// ordered, not ranked: sorting them by value would destroy the meaning.
function ageRowsOrdered(obj, order, win, { drop = [] } = {}) {
  return (order || [])
    .filter(k => !drop.includes(k))
    .map(k => ({ label: k, value: (obj[k] && obj[k][win]) || 0 }));
}

// Flat {label: n}
function flatRows(obj) {
  return Object.entries(obj || {})
    .map(([k, v]) => ({ label: k || "Unknown", value: v }))
    .sort(byValue);
}

// Timezone ordering, carried over from the original site.
function tzKey(s) {
  if (s === "Not Reported") return 99999999;
  return (s.startsWith("+") ? 1 : -1) * parseInt(s.substring(1, 6), 10);
}

/* ------------------------------------------------------------------
   Sections
   ------------------------------------------------------------------ */

const SECTIONS = [
  { id: "overview", title: "Overview", blurb: "How many devices report, and how recently" },
  { id: "hardware", title: "Hardware", blurb: "Platforms, variants and on-board resources" },
  { id: "software", title: "Software & Versions", blurb: "FPP releases, capes and plugins" },
  { id: "outputs", title: "Outputs", blurb: "How channels leave the device" },
  { id: "panels", title: "LED Panels", blurb: "Matrix panel configuration" },
  { id: "settings", title: "Settings", blurb: "How FPP itself is configured" },
  { id: "environment", title: "Environment", blurb: "Where and how devices are deployed" },
];

/* ------------------------------------------------------------------
   The registry — 36 statistics, matching everything the previous
   tabbed site rendered. Three pairs were consolidated: the old
   "Top 15 Capes"/"Installed Capes", "Top 10 Plugins"/"All Plugins"
   and "Non-FPP Gear"/"Non-FPP Devices Detected" are each one card
   whose table view shows the full list.
   ------------------------------------------------------------------ */

const REGISTRY = [

  /* ---------------- Overview ---------------- */
  {
    id: "devices-by-month", section: "overview", wide: true, chart: "bar", label: "Devices",
    title: "Devices Reporting Each Month",
    desc: "Unique devices that checked in during each calendar month, over the last 15 months.",
    keywords: ["growth", "trend", "installs", "adoption", "monthly", "unique", "seasonal", "season"],
    note: "Not affected by the time-window filter — each bar is its own month.",
    // The API returns months newest-first; keep that order so the most
    // recent month reads first, on the left.
    rows: (d) => d.uniqueByMonth.data.order
      .map(k => ({ label: k, value: d.uniqueByMonth.data.data[k] || 0 })),
  },
  {
    id: "last-reported", section: "overview", chart: "bar", label: "Devices",
    title: "Last Reported",
    desc: "How long it has been since each device last checked in — a rough proxy for how many installs are still live.",
    keywords: ["stale", "active", "checkin", "check in", "age", "seen", "dormant"],
    rows: (d, w) => ageRowsOrdered(d.lastReported.data.data, d.lastReported.data.order, w),
  },
  {
    id: "multisync-peers", section: "overview", chart: "bar", label: "Devices",
    title: "Multisync Peers",
    desc: "How many other FPP devices each install can see on its network via multisync — in effect, how big people's shows are.",
    keywords: ["network", "peers", "remote", "show size", "sync", "multisync", "players"],
    rows: (d, w) => ageRowsOrdered(d.multisyncPeers.data.peers, d.multisyncPeers.data.peerOrder, w),
  },

  /* ---------------- Hardware ---------------- */
  {
    id: "platform", section: "hardware", chart: "pie", label: "Devices",
    title: "Platform",
    desc: "The base hardware family FPP is running on: Raspberry Pi, BeagleBone, plain Debian, Docker and others.",
    keywords: ["pi", "beaglebone", "bbb", "debian", "docker", "hardware", "board", "platform"],
    rows: (d, w) => ageRows(d.platform.data, w),
  },
  {
    id: "pi-variant", section: "hardware", chart: "bar", label: "Devices", limit: 14,
    title: "Raspberry Pi Variant",
    desc: "Which specific Raspberry Pi models are in use — Pi 3, Pi 4, Pi 5, Zero and so on.",
    keywords: ["pi 3", "pi 4", "pi 5", "pi zero", "model b", "compute module", "raspberry", "variant"],
    rows: (d, w) => ageRows(d.platformVariantBreakout.data["Raspberry Pi"].data, w),
  },
  {
    id: "bbb-variant", section: "hardware", chart: "bar", label: "Devices", limit: 14, defaultView: "table",
    title: "BeagleBone Variant",
    desc: "Which BeagleBone models are in use — Black, Green, Pocket Beagle and the rest.",
    keywords: ["beaglebone", "bbb", "black", "green", "pocketbeagle", "pocket beagle", "variant"],
    rows: (d, w) => ageRows(d.platformVariantBreakout.data["BeagleBone"].data, w),
  },
  {
    id: "generic-variant", section: "hardware", chart: "bar", label: "Devices", limit: 14, defaultView: "table",
    title: "Generic Platform Variant",
    desc: "Hardware reported by installs that are neither Raspberry Pi nor BeagleBone — generic PCs, virtual machines and containers.",
    keywords: ["generic", "x86", "pc", "vm", "virtual", "container", "docker", "other hardware"],
    rows: (d, w) => ageRows(d.platformVariantBreakout.data["Generic"].data, w),
  },
  {
    id: "device-memory", section: "hardware", chart: "bar", label: "Devices",
    title: "Device Memory",
    desc: "How much RAM the host machine has.",
    keywords: ["ram", "memory", "gb", "mb", "512m", "1gb", "2gb", "4gb", "8gb"],
    rows: (d, w) => ageRowsOrdered(d.deviceMemory.data.memory, d.deviceMemory.data.memoryOrder, w),
  },
  {
    id: "device-storage", section: "hardware", chart: "bar", label: "Devices",
    title: "Device Storage",
    desc: "Total size of the media storage available to FPP — the SD card, eMMC or drive it keeps sequences on.",
    keywords: ["disk", "sd card", "sdcard", "emmc", "capacity", "storage", "space", "usb"],
    rows: (d, w) => ageRowsOrdered(d.deviceStorage.data.storage, d.deviceStorage.data.storageOrder, w),
  },
  {
    id: "device-used-storage", section: "hardware", chart: "bar", label: "Devices",
    title: "Storage In Use",
    desc: "How much of that media storage is actually occupied.",
    keywords: ["disk used", "free space", "full", "used storage", "capacity", "utilisation", "utilization"],
    rows: (d, w) => ageRowsOrdered(d.deviceStorage.data.usedStorage, d.deviceStorage.data.usedStorageOrder, w),
  },

  /* ---------------- Software & Versions ---------------- */
  {
    id: "release", section: "software", chart: "pie", label: "Devices",
    title: "FPP Release",
    desc: "Which major FPP release each device is running.",
    keywords: ["version", "release", "upgrade", "10.x", "9.x", "8.x", "fpp version", "major"],
    rows: (d, w) => ageRows(d.version.data, w),
  },
  {
    id: "release-detail", section: "software", chart: "bar", label: "Devices", limit: 15, defaultView: "table",
    title: "Release Detail",
    desc: "The exact reported version string, including point releases and git builds. Switch to the table to see every build, not just the top 15.",
    keywords: ["point release", "git", "build", "9.5", "10.0", "minor version", "dev", "master"],
    rows: (d, w) => ageRows(d.versionDetailed.data, w),
  },
  {
    id: "release-os", section: "software", wide: true, chart: "bar", label: "Devices", limit: 15,
    title: "FPP Release by OS Version",
    desc: "FPP release paired with the underlying operating system release, showing which OS generations are carrying which FPP versions.",
    keywords: ["os", "operating system", "debian", "bullseye", "bookworm", "buster", "trixie", "kernel"],
    rows: (d, w) => ageRows(d.versionWithOS.data, w),
  },
  {
    id: "cape-installed", section: "software", chart: "pie", label: "Devices",
    title: "Cape Installed?",
    desc: "Whether a cape or hat is attached at all, regardless of which one.",
    keywords: ["cape", "hat", "installed", "any cape", "bare", "no cape"],
    rows: (d, w) => ageRows(d.capeInstalled.data, w),
  },
  {
    id: "capes", section: "software", wide: true, chart: "bar", label: "Devices", limit: 15,
    title: "Installed Capes",
    desc: "Which cape or hat is attached to the device. The chart shows the top 15; the table lists every cape reported.",
    keywords: ["cape", "hat", "k16a", "pihat", "octoplus", "kulp", "expansion", "board", "f16", "f32"],
    rows: (d, w) => ageRows(d.capeType.data, w),
  },
  {
    id: "plugins", section: "software", wide: true, chart: "bar", label: "Devices", limit: 10,
    title: "Plugins",
    desc: "Installed FPP plugins. The chart shows the top 10; the table lists all of them.",
    keywords: ["plugin", "addon", "add-on", "remote falcon", "wled", "mqtt", "extension", "brightness"],
    rows: (d, w) => flatRows(d.topPlugins.data[w]),
  },

  /* ---------------- Outputs ---------------- */
  {
    id: "output-universes", section: "outputs", chart: "bar", label: "Devices",
    title: "Total Output Universes",
    desc: "How many network output universes are configured per device, across E1.31 / sACN, ArtNet, DDP and KiNet.",
    source: "co-universes.json",
    keywords: ["e1.31", "e131", "sacn", "artnet", "ddp", "kinet", "universe", "network output"],
    note: "Devices with no configured universes are excluded.",
    rows: (d, w) => ageRowsOrdered(d.outputUniverses.data.universe, d.outputUniverses.data.universeOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "output-channels", section: "outputs", chart: "bar", label: "Devices",
    title: "Network Output Channels",
    desc: "Total channel count sent over the network per device, across E1.31 / sACN, ArtNet, DDP and KiNet.",
    source: "co-universes.json",
    keywords: ["channels", "e1.31", "e131", "sacn", "artnet", "ddp", "kinet", "channel count", "size"],
    note: "Devices with no configured network output are excluded.",
    rows: (d, w) => ageRowsOrdered(d.outputUniverses.data.channel, d.outputUniverses.data.channelOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "local-pixels", section: "outputs", chart: "bar", label: "Devices",
    title: "Local Pixel Outputs",
    desc: "How many pixels are driven directly from the device's own ports, rather than sent over the network.",
    source: "co-pixelStrings.json / co-bbbStrings.json",
    keywords: ["pixels", "strings", "ws2811", "ws2812", "local", "ports", "differential", "string"],
    note: "Devices with no local pixels are excluded.",
    rows: (d, w) => ageRowsOrdered(d.outputLocalPixels.data.pixels, d.outputLocalPixels.data.pixelOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "other-outputs", section: "outputs", chart: "bar", label: "Devices", limit: 15,
    title: "Other Output Types",
    desc: "Use of the remaining channel output types — DMX serial, Renard, GPIO, virtual displays and the rest.",
    keywords: ["dmx", "renard", "serial", "gpio", "usb", "virtual display", "spi", "other output"],
    rows: (d, w) => ageRows(d.outputOther.data, w),
  },
  {
    id: "input-universes", section: "outputs", chart: "bar", label: "Devices",
    title: "E1.31 Input Universes",
    desc: "How many universes each device receives when acting as a bridge, rather than sending.",
    source: "ci-universes.json",
    keywords: ["input", "bridge", "receive", "e1.31", "e131", "sacn", "incoming", "universe"],
    note: "Devices with no configured input are excluded.",
    rows: (d, w) => ageRowsOrdered(d.inputUniverses.data.universe, d.inputUniverses.data.universeOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "input-channels", section: "outputs", chart: "bar", label: "Devices",
    title: "E1.31 Input Channels",
    desc: "Total channel count each device receives when acting as a bridge.",
    source: "ci-universes.json",
    keywords: ["input", "bridge", "receive", "channels", "e1.31", "e131", "sacn", "incoming"],
    note: "Devices with no configured input are excluded.",
    rows: (d, w) => ageRowsOrdered(d.inputUniverses.data.channel, d.inputUniverses.data.channelOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "output-processors", section: "outputs", chart: "bar", label: "Devices", limit: 12,
    title: "Output Processors",
    desc: "Which output processors are enabled — brightness, colour order, remapping and the rest.",
    keywords: ["processor", "brightness", "remap", "color order", "colour order", "three to four", "reverse"],
    rows: (d, w) => ageRows(d.outputProcessors.data, w),
  },
  {
    id: "sequence-storage", section: "outputs", chart: "bar", label: "Devices",
    title: "Sequence Storage",
    desc: "How much sequence data is stored on the device.",
    keywords: ["sequence", "fseq", "storage", "library", "size", "bytes", "show length"],
    note: "Excludes devices with no sequences. Sequence library only, not total disk usage.",
    rows: (d, w) => ageRowsOrdered(d.sequenceBytes.data.bytes, d.sequenceBytes.data.bytesOrder, w),
  },

  /* ---------------- LED Panels ---------------- */
  {
    id: "panel-count", section: "panels", chart: "bar", label: "Devices",
    title: "Configured LED Panels",
    desc: "How many LED matrix panels are configured per device.",
    source: "channeloutputs.json",
    keywords: ["panel", "matrix", "led panel", "p5", "p10", "hub75", "count"],
    rows: (d, w) => ageRowsOrdered(d.outputPanels.data.panels, d.outputPanels.data.panelOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "panel-channels", section: "panels", chart: "bar", label: "Devices",
    title: "Panel Channel Counts",
    desc: "Total channels driven by LED matrix panels per device.",
    source: "channeloutputs.json",
    keywords: ["panel", "matrix", "channels", "hub75", "channel count"],
    rows: (d, w) => ageRowsOrdered(d.outputPanels.data.channel, d.outputPanels.data.channelOrder, w, { drop: ["Zero"] }),
  },
  {
    id: "panel-size", section: "panels", chart: "pie", label: "Devices",
    title: "Panel Sizes",
    desc: "Physical pixel dimensions of the individual panels in use, such as 64×32 or 32×16.",
    keywords: ["panel size", "64x32", "32x16", "dimensions", "resolution", "matrix", "pixels"],
    rows: (d, w) => ageRows(d.outputPanels.data.panelSize, w),
  },
  {
    id: "panel-subtype", section: "panels", chart: "pie", label: "Devices",
    title: "LED Panel Channel Types",
    desc: "Which panel driver output is in use — the cape or interface the matrix is wired through.",
    keywords: ["panel type", "driver", "hub75", "octoscroller", "rgbmatrix", "subtype", "interface"],
    rows: (d, w) => ageRows(d.outputPanels.data.panelSubType, w),
  },

  /* ---------------- Settings ---------------- */
  {
    id: "fpp-mode", section: "settings", chart: "pie", label: "Devices",
    title: "FPP Mode",
    desc: "Whether each install runs as Standalone, Master (player), Remote or Bridge.",
    keywords: ["mode", "standalone", "master", "player", "remote", "bridge", "role"],
    rows: (d, w) => ageRows(d.fppMode.data, w),
  },
  {
    id: "ui-level", section: "settings", chart: "pie", label: "Devices",
    title: "UI Level",
    desc: "Which interface complexity level people run the web UI at.",
    keywords: ["ui", "interface", "advanced", "simple", "experience", "level", "menu"],
    rows: (d, w) => ageRows(d.uiLevel.data, w),
  },
  {
    id: "mqtt", section: "settings", chart: "pie", label: "Devices",
    title: "MQTT Configured?",
    desc: "How many installs have MQTT configured for home-automation integration.",
    keywords: ["mqtt", "home assistant", "homeassistant", "automation", "broker", "integration"],
    rows: (d, w) => ageRows(d.mqttEnabled.data, w),
  },
  {
    id: "popular-settings", section: "settings", wide: true, chart: "bar", label: "Devices", limit: 15,
    title: "Most-Changed Settings",
    desc: "Which settings people explicitly change from their defaults, most often first.",
    keywords: ["settings", "defaults", "configuration", "changed", "customised", "customized", "tweaks"],
    note: "Counts settings that were explicitly set; defaults are not included.",
    rows: (d, w) => ageRows(d.settingsPopular.data, w),
  },

  /* ---------------- Environment ---------------- */
  {
    id: "timezone", section: "environment", wide: true, chart: "bar", label: "Devices", limit: 40,
    title: "Configured Timezone",
    desc: "The timezone each device is set to — the closest thing this dataset has to a map of where FPP is used.",
    keywords: ["timezone", "tz", "region", "country", "location", "utc", "geography", "where"],
    rows: (d, w) => {
      const o = d.timeZone.data;
      return Object.keys(o).sort((a, b) => tzKey(a) - tzKey(b))
        .map(k => ({ label: k, value: (o[k] && o[k][w]) || 0 }))
        .filter(r => r.value > 0);
    },
  },
  {
    id: "wifi", section: "environment", chart: "bar", label: "Devices",
    title: "Wifi Signal Strength",
    desc: "Reported signal strength for devices on wifi, bucketed by percentage.",
    keywords: ["wifi", "wireless", "rssi", "signal", "antenna", "reception", "strength"],
    note: "Only devices with an active wifi interface. Best interface per device, read shortly after boot.",
    rows: (d, w) => ageRowsOrdered(d.wifiStrength.data.strength, d.wifiStrength.data.strengthOrder, w),
  },
  {
    id: "voltage", section: "environment", chart: "bar", label: "Readings", limit: 20,
    title: "Reported Voltages",
    desc: "Voltages read from on-board sensors, rounded to the nearest volt.",
    keywords: ["voltage", "volts", "power", "psu", "sensor", "12v", "5v", "24v", "48v", "rail"],
    note: "Only devices reporting voltage sensors; 0V usually means an unpopulated input. A dual-rail board is counted on each rail, so percentages are of readings, not devices.",
    rows: (d, w) => ageRows(d.sensorVoltage.data.voltage, w),
  },
  {
    id: "non-fpp", section: "environment", wide: true, chart: "bar", label: "Devices", limit: 15,
    title: "Non-FPP Gear on the Network",
    desc: "Other controllers discovered alongside FPP via multisync. The chart shows the top 15; the table lists everything seen.",
    keywords: ["falcon", "wled", "genius", "controller", "non-fpp", "third party", "discovered", "neighbours"],
    note: "Seen via multisync discovery (typeId 128 and above).",
    rows: (d, w) => ageRows(d.nonFppMultisync.data.types, w),
  },
];

/* ------------------------------------------------------------------
   State
   ------------------------------------------------------------------ */

let DATA = null;
const charts = new Map();   // id -> Chart instance
const modes = new Map();    // id -> 'chart' | 'table'
let didInitialJump = false; // FIX 7: deep-link jump happens once, not on every refetch

const $ = s => document.querySelector(s);
const el = (t, c, h) => { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; };
const fmt = n => n.toLocaleString();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sectionTitle = id => (SECTIONS.find(s => s.id === id) || {}).title || "";

const cssvar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const seriesColors = () => [1, 2, 3, 4, 5, 6, 7, 8].map(i => cssvar("--s" + i));

/* ------------------------------------------------------------------
   Analytics. Every call goes through track(), which is a no-op when
   gtag is absent — a good share of this audience runs an ad blocker,
   and a missing gtag must never break the page.

   Few event names, each carrying a stat_id parameter, rather than one
   event name per statistic: GA4 caps distinct event names per
   property, and parameters are what make the data sliceable.
   ------------------------------------------------------------------ */

function track(event, params) {
  try {
    if (typeof gtag === "function") gtag("event", event, params || {});
  } catch (_) { /* analytics must never throw */ }
}

const seenStats = new Set();   // stat_view fires once per stat, per page load

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) { } },
};

/* ------------------------------------------------------------------
   FIX 4: measure the sticky bar instead of guessing its height. It
   wraps to two rows on phones, so a fixed offset tucks deep-link
   landings underneath it.
   ------------------------------------------------------------------ */

function setTopbarHeight() {
  const bar = $(".topbar");
  if (!bar) return;
  document.documentElement.style.setProperty("--topbar-h", Math.round(bar.offsetHeight) + "px");
}

/* ------------------------------------------------------------------
   URL state:  #/<stat-id>?window=last30Days&docker=0
   ------------------------------------------------------------------ */

function readUrl() {
  const h = location.hash.replace(/^#\/?/, "");
  const [id, qs] = h.split("?");
  const p = new URLSearchParams(qs || "");
  const win = p.get("window");
  const valid = win && Array.from($("#window").options).some(o => o.value === win);
  return {
    id: id || "",
    win: valid ? win : "last365Days",
    docker: p.get("docker") !== "0",   // default: exclude Docker, as before
  };
}

function writeUrl(id) {
  const p = new URLSearchParams();
  p.set("window", $("#window").value);
  if (!$("#docker").checked) p.set("docker", "0");
  history.replaceState(null, "", "#/" + (id || "") + "?" + p.toString());
}

/* ------------------------------------------------------------------
   Rendering — one entry, three ways
   ------------------------------------------------------------------ */

// The rows a chart actually draws, after its limit is applied. Shared
// so the plot height and the chart itself never disagree.
function displayRows(entry, rows) {
  const pie = entry.chart === "pie";
  const cap = entry.limit || (pie ? 8 : 40);
  let data = rows.slice(0, cap);
  // Past the cap the tail folds into a real "Other" bucket. Hues are
  // never cycled, so two slices can never share a color.
  if (pie && rows.length > cap) {
    const other = rows.slice(cap).reduce((s, r) => s + r.value, 0);
    if (other > 0) data = data.concat([{ label: "Other", value: other }]);
  }
  return data;
}

function chartConfig(entry, rows) {
  const pie = entry.chart === "pie";
  const data = displayRows(entry, rows);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const ink = cssvar("--text-secondary");
  const grid = cssvar("--grid");

  // Color by the job it does: one accent for a single series over an
  // ordered scale, the fixed categorical order only for real categories.
  const bg = pie ? seriesColors().slice(0, data.length) : cssvar("--accent");

  return {
    type: pie ? "pie" : "bar",
    data: {
      labels: data.map(r => r.label),
      datasets: [{
        label: entry.label || "Devices",
        data: data.map(r => r.value),
        backgroundColor: bg,
        borderWidth: pie ? 2 : 0,
        borderColor: cssvar("--surface-1"),
        borderRadius: pie ? 0 : 4,
        maxBarThickness: 42,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: pie
          ? { position: "right", labels: { color: ink, boxWidth: 10, boxHeight: 10, font: { size: 11 } } }
          : { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y ?? c.parsed;
              const pct = total ? (v / total * 100).toFixed(1) : "0.0";
              return ` ${fmt(v)} (${pct}%)`;
            },
          },
        },
      },
      scales: pie ? {} : {
        x: {
          ticks: { color: ink, font: { size: 11 }, maxRotation: 60, autoSkip: true },
          grid: { display: false },
          border: { color: grid },
        },
        y: {
          beginAtZero: true,
          ticks: { color: ink, font: { size: 11 }, precision: 0 },
          grid: { color: grid },
          border: { display: false },
        },
      },
    },
  };
}

function tableHTML(entry, rows) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const body = rows.map(r =>
    `<tr><td>${esc(r.label)}</td><td>${fmt(r.value)}</td><td>${total ? (r.value / total * 100).toFixed(1) : "0.0"}%</td></tr>`
  ).join("");
  return `<table><caption class="sr-only">${esc(entry.title)} — ${esc(entry.desc)}</caption>` +
    `<thead><tr><th scope="col">Value</th><th scope="col">${esc(entry.label || "Devices")}</th>` +
    `<th scope="col">Pct</th></tr></thead><tbody>${body}</tbody></table>`;
}

function downloadCSV(entry) {
  const win = $("#window").value;
  const rows = entry.rows(DATA, win);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const q = s => `"${String(s).replace(/"/g, '""')}"`;
  const csv = ["value,count,percent"]
    .concat(rows.map(r => [q(r.label), r.value, total ? (r.value / total * 100).toFixed(2) : "0.00"].join(",")))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = el("a");
  a.href = url;
  a.download = `fpp-stats-${entry.id}-${win}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------------------------------------------
   Cards
   ------------------------------------------------------------------ */

function buildCards() {
  const host = $("#sections");
  host.innerHTML = "";

  SECTIONS.forEach(sec => {
    const items = REGISTRY.filter(e => e.section === sec.id);
    if (!items.length) return;

    const head = el("div", "section-head");
    head.innerHTML = `<h2 id="sec-${sec.id}">${esc(sec.title)}</h2><em>${esc(sec.blurb)}</em>`;
    host.appendChild(head);

    const grid = el("div", "grid");
    items.forEach(e => grid.appendChild(buildCard(e)));
    host.appendChild(grid);
  });
}

function buildCard(entry) {
  const card = el("section", "card" + (entry.wide ? " wide" : ""));
  card.id = entry.id;
  card.setAttribute("aria-labelledby", entry.id + "-h");

  const head = el("div", "card-head");
  head.innerHTML = `<h3 id="${entry.id}-h">${esc(entry.title)}</h3>`;

  // FIX 2: every control names itself for assistive technology.
  const info = el("button", "icon-btn", "i");
  info.type = "button";
  info.setAttribute("aria-expanded", "false");
  info.setAttribute("aria-controls", entry.id + "-details");
  info.setAttribute("aria-label", "About " + entry.title);
  info.title = "About this statistic";
  head.appendChild(info);

  const tools = el("div", "card-tools");
  const seg = el("div", "seg");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", entry.title + " view");
  const bChart = el("button", null, "Chart");
  const bTable = el("button", null, "Table");
  [bChart, bTable].forEach(b => { b.type = "button"; });
  bChart.setAttribute("aria-label", "Show " + entry.title + " as a chart");
  bTable.setAttribute("aria-label", "Show " + entry.title + " as a table");
  seg.append(bChart, bTable);

  const csv = el("button", "btn csv-btn", "⤓ CSV");
  csv.type = "button";
  csv.setAttribute("aria-label", "Download " + entry.title + " as CSV");
  tools.append(seg, csv);
  head.appendChild(tools);
  card.appendChild(head);

  const details = el("div", "details");
  details.id = entry.id + "-details";
  details.hidden = true;
  details.innerHTML = esc(entry.desc) +
    (entry.source ? `<span class="src">Source: ${esc(entry.source)}</span>` : "");
  card.appendChild(details);
  info.onclick = () => {
    const open = details.hidden;
    details.hidden = !open;
    info.setAttribute("aria-expanded", String(open));
    // Whether the descriptions are wanted, and for which statistics.
    if (open) track("stat_info", { stat_id: entry.id });
  };

  const plot = el("div", "plot");
  // FIX 2: the canvas carries a role and a label, and says in text that
  // an accessible table view of the same numbers is one button away.
  const canvas = el("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label",
    entry.title + ". " + entry.desc + " Chart — use the Table button for these figures as text.");
  plot.appendChild(canvas);

  const tw = el("div", "tablewrap");
  tw.hidden = true;
  tw.tabIndex = 0;                       // scrollable region must be keyboard reachable
  tw.setAttribute("role", "region");
  tw.setAttribute("aria-label", entry.title + " data table");

  const rc = el("div", "rowcount");
  rc.hidden = true;
  card.append(plot, tw, rc);

  if (entry.note) card.appendChild(el("div", "foot-note", esc(entry.note)));

  const applyMode = (m) => {
    modes.set(entry.id, m);
    bChart.setAttribute("aria-pressed", String(m === "chart"));
    bTable.setAttribute("aria-pressed", String(m === "table"));
    plot.hidden = m !== "chart";
    tw.hidden = rc.hidden = m !== "table";
  };

  const setMode = (m) => {
    applyMode(m);
    store.set("fppmode:" + entry.id, m);
    renderCard(entry, card);
    // Tells us which statistics people prefer as numbers — the same
    // judgement that was made by hand for the three table defaults.
    track("view_mode", { stat_id: entry.id, mode: m });
  };

  bChart.onclick = () => setMode("chart");
  bTable.onclick = () => setMode("table");
  csv.onclick = () => {
    track("csv_download", { stat_id: entry.id, time_window: $("#window").value });
    downloadCSV(entry);
  };

  // Restore the saved view, falling back to the statistic's own
  // default, without rendering — rendering is lazy.
  const saved = store.get("fppmode:" + entry.id);
  applyMode(saved === "table" || saved === "chart"
    ? saved
    : (entry.defaultView === "table" ? "table" : "chart"));

  return card;
}

function renderCard(entry, card) {
  if (!DATA || typeof Chart === "undefined") return;
  card = card || document.getElementById(entry.id);
  if (!card) return;

  const rows = entry.rows(DATA, $("#window").value);

  if ((modes.get(entry.id) || "chart") === "chart") {
    const old = charts.get(entry.id);
    if (old) old.destroy();
    const canvas = card.querySelector(".plot canvas");
    charts.set(entry.id, new Chart(canvas.getContext("2d"), chartConfig(entry, rows)));
  } else {
    card.querySelector(".tablewrap").innerHTML = tableHTML(entry, rows);
    const shown = entry.limit ? `top ${entry.limit}` : "the top values";
    card.querySelector(".rowcount").textContent =
      `${fmt(rows.length)} row${rows.length === 1 ? "" : "s"} — the table always shows every row; the chart is limited to ${shown}.`;
  }
  card.dataset.rendered = "1";
}

/* A second observer, at a stricter threshold than the rendering one:
   "near the viewport" means draw it, but "half of it is on screen"
   means the visitor actually looked at it. This is the signal that
   says which of the 36 statistics earn their place. */
let viewIo = null;
function observeStatViews() {
  if (viewIo) return;
  if (!("IntersectionObserver" in window)) return;
  viewIo = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting || seenStats.has(en.target.id)) return;
      seenStats.add(en.target.id);
      const entry = REGISTRY.find(e => e.id === en.target.id);
      if (entry) track("stat_view", { stat_id: entry.id, stat_section: entry.section });
    });
  }, { threshold: 0.5 });
  REGISTRY.forEach(e => {
    const n = document.getElementById(e.id);
    if (n) viewIo.observe(n);
  });
}

// Draw a card only once it is near the viewport.
let io = null;
function observeCards() {
  if (io) io.disconnect();
  io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const entry = REGISTRY.find(e => e.id === en.target.id);
      if (entry && en.target.dataset.rendered !== "1") renderCard(entry, en.target);
    });
  }, { rootMargin: "300px 0px" });
  REGISTRY.forEach(e => {
    const n = document.getElementById(e.id);
    if (n) io.observe(n);
  });
}

function invalidateAll() {
  charts.forEach(c => c.destroy());
  charts.clear();
  document.querySelectorAll(".card").forEach(c => { c.dataset.rendered = ""; });
  observeCards();
  // Anything already on screen redraws immediately.
  REGISTRY.forEach(e => {
    const n = document.getElementById(e.id);
    if (!n) return;
    const r = n.getBoundingClientRect();
    if (r.top < innerHeight + 300 && r.bottom > -300) renderCard(e, n);
  });
}

/* ------------------------------------------------------------------
   The finder
   ------------------------------------------------------------------ */

function buildCatalog(filter = "") {
  const grid = $("#cat-grid");
  grid.innerHTML = "";
  const hits = search(filter);
  $("#cat-n").textContent = filter.trim()
    ? `— ${hits.length} of ${REGISTRY.length} match`
    : `— ${REGISTRY.length} available`;
  $("#cat-status").textContent = filter.trim()
    ? `${hits.length} of ${REGISTRY.length} statistics match ${filter.trim()}`
    : "";

  if (!hits.length) {
    grid.appendChild(el("div", "cat-empty", `No statistic matches “${esc(filter)}”.`));
    return;
  }

  SECTIONS.forEach(sec => {
    const items = hits.filter(e => e.section === sec.id);
    if (!items.length) return;
    grid.appendChild(el("div", "cat-sec", esc(sec.title)));
    items.forEach(e => {
      const a = el("a", "cat-item");
      a.href = "#" + e.id;
      a.innerHTML = `<b>${esc(e.title)}</b><span>${esc(e.desc)}</span>`;
      a.onclick = (ev) => {
        ev.preventDefault();
        // Collapse first, but do not scroll until the collapse has
        // finished — see afterCatalogSettles().
        track("stat_select", { stat_id: e.id, method: "finder" });
        closeCatalog();
        afterCatalogSettles(() => jumpTo(e.id));
      };
      grid.appendChild(a);
    });
  });
}

// The finder is a transient tool, not a saved preference: it starts
// collapsed on every load, opens while you are looking for something,
// and shuts once you have picked a statistic.
function setCatalog(open) {
  const cat = $("#catalog");
  const body = $("#cat-body");
  cat.classList.toggle("collapsed", !open);
  $("#cat-toggle").setAttribute("aria-expanded", String(open));
  $("#cat-toggle-t").textContent = open ? "Hide" : "Show all";
  if (open) {
    body.hidden = false;
  } else if (!CSS.supports("grid-template-rows: 0fr")) {
    body.hidden = true;   // no animation available: just hide it
  }
}

// The finder sits above every card, so collapsing it shifts the whole
// page upward. Scrolling while that is still animating computes the
// target against the old layout and overshoots by the finder's height.
// Wait for the transition to end (with a timeout in case it never
// fires — reduced motion, or a browser without the animation) and only
// then scroll.
function afterCatalogSettles(fn) {
  const body = $("#cat-body");
  const ms = parseFloat(getComputedStyle(body).transitionDuration || "0") * 1000;
  if (!ms) { requestAnimationFrame(fn); return; }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    body.removeEventListener("transitionend", onEnd);
    fn();
  };
  const onEnd = (ev) => { if (ev.target === body) go(); };
  body.addEventListener("transitionend", onEnd);
  setTimeout(go, ms + 80);
}

function closeCatalog() {
  setCatalog(false);
  const f = $("#cat-filter");
  if (f.value) { f.value = ""; buildCatalog(""); }
}

function initCatalogToggle() {
  setCatalog(false);
  $("#cat-toggle").addEventListener("click", () => {
    const open = $("#cat-toggle").getAttribute("aria-expanded") !== "true";
    if (open) {
      track("finder_open", { source: "show_all" });
      setCatalog(true);
      $("#cat-filter").focus({ preventScroll: true });
    }
    else closeCatalog();
  });
}

/* Search across title, description, section and hand-authored keywords.
   The keywords matter: "sACN" has to find Total Output Universes, and
   "disk" has to find Device Storage. */
function search(q) {
  q = q.trim().toLowerCase();
  if (!q) return REGISTRY.slice();
  const terms = q.split(/\s+/);
  return REGISTRY.map(e => {
    const hay = [e.title, e.desc, sectionTitle(e.section),
    (e.keywords || []).join(" "), e.source || ""].join(" ").toLowerCase();
    if (!terms.every(t => hay.includes(t))) return null;
    let score = 0;
    const t = e.title.toLowerCase();
    terms.forEach(x => {
      if (t.startsWith(x)) score += 6;
      else if (t.includes(x)) score += 4;
      else if ((e.keywords || []).some(k => k.toLowerCase().includes(x))) score += 2;
      else score += 1;
    });
    return { e, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score).map(r => r.e);
}

/* ------------------------------------------------------------------
   Navigation
   ------------------------------------------------------------------ */

function jumpTo(id) {
  const node = document.getElementById(id);
  if (!node) return;
  const entry = REGISTRY.find(e => e.id === id);
  if (entry && node.dataset.rendered !== "1") renderCard(entry, node);
  writeUrl(id);
  node.scrollIntoView({ block: "start" });
  node.classList.remove("flash");
  void node.offsetWidth;
  node.classList.add("flash");
}

/* ------------------------------------------------------------------
   Load
   ------------------------------------------------------------------ */

function updateCounts() {
  const win = $("#window").value;
  const inst = DATA.Instances.data;
  const label = $("#window").selectedOptions[0].textContent;
  $("#n-window").textContent = fmt(inst[win] || 0);
  $("#n-window-k").textContent = "devices — " + label.toLowerCase();
  $("#n-total").textContent = fmt(inst.totalCount || 0);
  // DATA.ts is epoch milliseconds, so this renders in the viewer's own
  // timezone wherever they are — no zone label needed.
  $("#n-updated").textContent = new Date(DATA.ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function showError(msg) {
  const box = $("#loading");
  box.innerHTML = `<b>Unable to load statistics.</b><br>` +
    `<span style="font-size:13px">${esc(msg)}</span>`;
  const again = el("button", "btn retry", "Try again");
  again.type = "button";
  again.onclick = load;
  box.appendChild(again);
  box.style.display = "";
}

function load() {
  if (typeof Chart === "undefined") {
    showError("The chart library could not be loaded from the CDN.");
    return;
  }
  $("#loading").innerHTML = '<div class="spinner"></div>Loading statistics…';
  $("#loading").style.display = "";
  $("#sections").hidden = true;

  fetch(API_BASE + ($("#docker").checked ? "false" : "true"))
    .then(r => { if (!r.ok) throw new Error("Server responded " + r.status); return r.json(); })
    .then(json => {
      DATA = json;
      $("#loading").style.display = "none";
      $("#sections").hidden = false;
      updateCounts();
      buildCatalog($("#cat-filter").value);
      setTopbarHeight();
      invalidateAll();
      observeStatViews();

      // FIX 7: honour the deep link on first load only. Without this,
      // toggling the Docker filter refetches and yanks you back to
      // whatever card is in the hash.
      if (!didInitialJump) {
        didInitialJump = true;
        const id = readUrl().id;
        if (id) {
          // Someone followed a shared link straight to a statistic —
          // the clearest evidence that deep links are being used.
          track("stat_select", { stat_id: id, method: "deep_link" });
          setTimeout(() => jumpTo(id), 60);
        }
      }
    })
    .catch(err => {
      track("load_error", { message: String(err.message).slice(0, 100) });
      showError(err.message);
    });
}

/* ------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------ */

function initTheme() {
  const saved = store.get("fpptheme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  const btn = $("#theme");
  const sync = () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const isDark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("aria-pressed", String(isDark));
  };
  sync();
  btn.onclick = () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const isDark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    store.set("fpptheme", next);
    track("theme_change", { theme: next });
    sync();
    invalidateAll();   // charts re-read their colors from the CSS tokens
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const u = readUrl();
  $("#window").value = u.win;
  $("#docker").checked = u.docker;

  initTheme();
  buildCards();
  buildCatalog();
  initCatalogToggle();
  setTopbarHeight();

  $("#window").addEventListener("change", () => {
    track("window_change", { time_window: $("#window").value });
    writeUrl(readUrl().id);
    updateCounts();
    invalidateAll();
  });

  $("#docker").addEventListener("change", () => {
    track("docker_filter", { excluded: $("#docker").checked });
    writeUrl(readUrl().id);
    load();
  });

  // Search terms are logged on an idle delay, not per keystroke, so a
  // query arrives once and fully typed. A query with no results is the
  // most actionable thing here: it names a statistic people expect, or
  // vocabulary the keywords are missing.
  let searchTimer = null;
  $("#cat-filter").addEventListener("input", (e) => {
    const q = e.target.value;
    buildCatalog(q);
    if (q.trim()) setCatalog(true);   // typing means "open"
    clearTimeout(searchTimer);
    const term = q.trim();
    if (term.length < 2) return;
    searchTimer = setTimeout(() => {
      track("search", { search_term: term.toLowerCase(), results: search(term).length });
    }, 900);
  });

  $("#goto-catalog").addEventListener("click", () => {
    track("finder_open", { source: "header" });
    setCatalog(true);
    $("#catalog").scrollIntoView({ block: "start" });
    $("#cat-filter").focus({ preventScroll: true });
  });

  // FIX 3: react to the hash changing after load — a pasted link in an
  // open tab, an in-page anchor, or the back button.
  addEventListener("hashchange", () => {
    const n = readUrl();
    if (n.win !== $("#window").value) {
      $("#window").value = n.win;
      updateCounts();
      invalidateAll();
    }
    if (n.docker !== $("#docker").checked) {
      $("#docker").checked = n.docker;
      load();
      return;
    }
    if (n.id) jumpTo(n.id);
  });

  // FIX 4: the bar's height changes when it wraps, so keep the token
  // in step with it.
  if (window.ResizeObserver) new ResizeObserver(setTopbarHeight).observe($(".topbar"));
  else addEventListener("resize", setTopbarHeight);

  load();
});
