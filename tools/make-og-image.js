#!/usr/bin/env node
//
// Regenerates website/og-image.png, the Open Graph / Twitter card image
// referenced from website/index.html.
//
// It loads the live site, waits for the charts to finish drawing, lifts two of
// them straight off their <canvas> elements, and composes them into a 1200x630
// card using the site's own colors.  Re-run it when the numbers have drifted
// enough that the card looks stale.
//
// Usage:
//   cd tools && npm install && npm run build
//
// Chromium needs libnss3 and libnspr4 present on the machine.  If they are
// missing, `npx playwright install --with-deps chromium` will pull them in
// (that part needs root).
//
"use strict";

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITE = process.env.OG_SITE_URL || "https://fppstats.falconchristmas.com/";
const OUT = path.resolve(__dirname, "..", "website", "og-image.png");

// The two charts to feature, by canvas id, with the heading to print above each.
const CHARTS = [
    { id: "version365", title: "FPP Release" },
    { id: "deviceStorageBar", title: "Device Storage" },
];

function buildCard(data) {
    const charts = data.charts
        .map(
            (c) =>
                `<div class="chart"><h2>${c.title}</h2><img src="${c.png}" alt=""></div>`
        )
        .join("\n      ");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  /* Palette mirrors website/my.css: #1f78b4 body, #222366 headings. */
  body { width: 1200px; height: 630px; background: #1f78b4; overflow: hidden;
         font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  .card { position: absolute; inset: 26px; background: #fff; border-radius: 28px;
          padding: 34px 44px; display: flex; flex-direction: column; }
  h1 { color: #222366; font-size: 54px; line-height: 1.05; letter-spacing: -0.5px; }
  .sub { color: #3d4a5c; font-size: 23px; margin-top: 12px; }
  .sub b { color: #1f78b4; font-weight: 700; }
  .charts { display: flex; gap: 34px; margin-top: 22px; flex: 1; min-height: 0; }
  .chart { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .chart h2 { color: #222366; font-size: 22px; text-align: center; margin-bottom: 6px; }
  .chart img { width: 100%; flex: 1; object-fit: contain; object-position: top; min-height: 0; }
  .foot { margin-top: 14px; display: flex; justify-content: space-between; align-items: baseline;
          color: #6b7684; font-size: 18px; }
  .foot .url { color: #1f78b4; font-weight: 600; }
</style></head><body>
  <div class="card">
    <h1>FPP Usage Statistics</h1>
    <div class="sub">Live install data from <b>${data.devices}</b> Falcon Player devices worldwide &mdash;
      releases, platforms, capes, plugins &amp; outputs.</div>
    <div class="charts">
      ${charts}
    </div>
    <div class="foot"><span class="url">fppstats.falconchristmas.com</span><span>Updated daily</span></div>
  </div>
</body></html>`;
}

(async () => {
    const browser = await chromium.launch();

    // Render the live site wide and at 2x so the canvases we lift are high
    // resolution enough to scale down cleanly inside the card.
    const site = await browser.newPage({
        viewport: { width: 1600, height: 1200 },
        deviceScaleFactor: 2,
    });
    // The page alerts if the stats API is unreachable; don't let that block us.
    site.on("dialog", (d) => d.dismiss());

    console.log("Loading " + SITE);
    await site.goto(SITE, { waitUntil: "networkidle", timeout: 60000 });
    await site.waitForSelector("#all-charts", { state: "visible", timeout: 60000 });
    await site.waitForTimeout(5000); // let Chart.js finish its draw animations

    const data = await site.evaluate((charts) => {
        const sel = document.querySelector("#select-age");
        return {
            // Option text reads e.g. "Last Year - 20055 devices".
            label: sel.options[sel.selectedIndex].text,
            charts: charts.map((c) => {
                const el = document.getElementById(c.id);
                if (!el) throw new Error("no canvas with id " + c.id);
                return { title: c.title, png: el.toDataURL("image/png") };
            }),
        };
    }, CHARTS);

    const count = (data.label.match(/([\d,]+)\s+devices/) || [])[1];
    if (!count) throw new Error('could not read device count from "' + data.label + '"');
    data.devices = Number(count.replace(/,/g, "")).toLocaleString("en-US");

    const cardFile = path.join(__dirname, ".card.html");
    fs.writeFileSync(cardFile, buildCard(data));

    const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await card.goto("file://" + cardFile, { waitUntil: "networkidle" });
    await card.screenshot({ path: OUT });

    fs.unlinkSync(cardFile);
    await browser.close();

    console.log("Wrote " + OUT + " (" + data.devices + " devices)");
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
