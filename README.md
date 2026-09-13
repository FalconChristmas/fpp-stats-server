# fpp-stats-server

Back end server for capturing statistics from [FPP installations](https://github.com/FalconChristmas/fpp).  Also includes the code for generating a user facing website that summarizes some of the data.   There is an overall docker-compose file that creates the storage volume and shares it between the containers.   The website is intended to be severed up separately. 

# NOTE
Before building, the my.env.sample should be copied to my.env and a unique string set for allowing the stats file to be downloaded. In addition, a github token

# Components
## Server
This is the [API](./server/docs/API.md) for collecting as storing information from each FPP instance. It is assumed to run in a docker container along with statsCollector that share a storage volume

## StatsCollector
This is a second process that runs a loop over the shared storage volume:

* **Hourly** it processes all of the stats files that have been collected and
  regenerates `summary.json` and `summary_noDocker.json`, the overall summary of
  the data that the API serves and the website charts.
* **Every 4 hours** it scrubs identifying fields out of the stored records and
  rebuilds `all_files.tar.gz`, the archive served by the API's archive endpoint.

This is needed because FPP only began scrubbing these fields on the client in
10.1.  Every released version still uploads them, most of the installed base is
several majors behind, and the stored history predates the change entirely — so
the server scrubs regardless of which version sent a record or when.

The scrub rewrites records in place rather than deleting them, so the history is
preserved: cape serial numbers, vendor contact details, unrecognised top-level
blocks and household free-text settings are removed, while the device and peer
uuids, hardware and version information, and every enumerable setting are kept.
It is idempotent and fails closed — if the scrub fails, no archive is built and
the previous one is left in place.

See [Scrubbing](./statsCollector/docs/SCRUBBING.md) for what is removed, what is
deliberately kept and why, and how to run and extend the policy.

The container refuses to start if `npm test` (the scrub self-test) fails.

## Website
A simple, flat website that uses Chart.js to summarize some of the statistics.  Given that is just plan HTML5, no server for hosting is included to allow for flexibility. 

The live site is at [fppstats.falconchristmas.com](https://fppstats.falconchristmas.com/).

## Tools
`statsCollector/tools/gen-settings-policy.js` regenerates
`statsCollector/lib/settings-policy.json`, the vendored snapshot of FPP's
`www/settings.json` that tells the scrubber which settings are personal or
free text.  Re-run it when FPP adds settings:

```
node statsCollector/tools/gen-settings-policy.js
```

`tools/make-og-image.js` regenerates `website/og-image.png`, the social sharing
(Open Graph / Twitter card) image referenced from `index.html`.  It screenshots
the live site's charts and composes them into a 1200x630 card.  Re-run it when
the numbers on the card have drifted:

```
cd tools && npm install && npm run build
```

