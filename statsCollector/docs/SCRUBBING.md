# Stats Archive Scrubbing

The stats archive is scrubbed of identifying fields before it is published. This
document describes what is removed, what is deliberately kept, how those
decisions are made, and how to operate and extend the policy.

The goal is to make the published archive safe to hand out **without deleting
years of history**. Records are rewritten in place, not dropped: the fields that
identify a household are removed, and everything analytically useful stays.

## Table of Contents
- [Why this is needed](#why-this-is-needed)
- [When it runs](#when-it-runs)
- [What is removed](#what-is-removed)
- [What is deliberately kept](#what-is-deliberately-kept)
- [How settings are decided](#how-settings-are-decided)
- [Canaries](#canaries)
- [The self-test](#the-self-test)
- [Operations](#operations)
- [Extending the policy](#extending-the-policy)
- [Files](#files)
- [Verification](#verification)

---

## Why this is needed

**Because the fix on the client does not reach the devices that are already
running.**

FPP 10.1 adds client-side scrubbing, so a device running it will not upload cape
serial numbers, vendor contact details or household free-text settings in the
first place. Every version in the field today predates that change. Fixing the
client is necessary, but it cannot be sufficient, for three reasons:

1. **Every released version still uploads these fields.** This is not limited to
   ancient installs — FPP 10.0 uploads a cape serial, `cs` and the full vendor
   contact block exactly as 8.x does. In the 2026-09-12 corpus, 8,028 of 20,412
   devices' most recent record carries `capeInfo.serialNumber`; 1,543 of those
   devices reported within the last 30 days.

2. **Devices upgrade slowly, and some never do.** Of 4,639 devices active in the
   last 30 days, 2,786 — about 60% — are on a major version older than 10, and
   1,087 are older than 9. Installs reporting FPP 5.x are still active. A show
   controller that works is rarely touched, so unscrubbed uploads will keep
   arriving for years after 10.1 ships, from versions that will never be
   upgraded.

3. **The stored history predates the fix entirely.** The archive holds years of
   records collected before any client-side scrubbing existed. Nothing shipped in
   a client can retroactively clean those, and the goal is to make them safe to
   publish rather than to delete them.

The client-side change is visible in the data and it does work: master builds
(the pre-release 10.1 line) are the only ones that send peer cape records at all,
and they send 3,502 of them with **zero** serial numbers. That is the same
treatment this scrubber applies to `multisync[].capeInfo`, which is why that rule
looks redundant today — it exists for the released versions that have not caught
up, and for records already on disk.

So the server scrubs unconditionally, regardless of which version uploaded a
record and regardless of when. Once 10.1 is widespread the counts in a scrub run
should fall; they should not be expected to reach zero, and the scrub should stay
in place when they do.

---

## When it runs

`run.sh` drives the collector container:

1. On start, `lib/scrub.selftest.js` runs once. **If it fails the container
   exits.** This process rewrites records in place, so a policy that no longer
   does what it claims must stop the container rather than run unattended.
2. Every hour, `index.js` regenerates `summary.json` and
   `summary_noDocker.json`.
3. Every **4 hours**, `scrub-archive.js` scrubs the whole archive and the
   `all_files.tar.gz` download is rebuilt from the scrubbed result.

The archive interval is latched on a 4-hour bucket number
(`$(date +%s) / 14400`) rather than `$(date +%H) % 4`. The loop period is not
exactly an hour — the gather and the tar both add drift — so a bare hour-mod
test eventually steps over a window and skips it. Comparing bucket numbers means
a late loop still catches the window it missed. The last completed bucket is
recorded in `/statsdata/.last_archive`.

**Scrub failure is fail-closed**: if `scrub-archive.js` exits non-zero, no
archive is built and the stamp file is left alone, so the next hourly pass
retries. Publishing a stale archive is better than publishing an unscrubbed one.

A full pass over the live corpus (~930k files) takes under 4 minutes, so it fits
the window with a wide margin. Scrubbing is **idempotent** — a second pass over
an already-scrubbed archive rewrites nothing — so in steady state only records
that arrived since the last pass are written.

> **Scope.** This makes the published *archive* compliant. `server/routes/upload.js`
> still writes raw payloads, so a record sits unscrubbed in `/statsdata` for up
> to 4 hours after upload. Scrubbing at ingest is the complete fix.

---

## What is removed

| Field | Why |
|---|---|
| `capeInfo.serialNumber` | Together with `cs`, the join key to a purchase record. |
| `capeInfo.cs` | As above. |
| `capeInfo.vendor.*` | Reduced to `name` only. The block carries sole traders' personal names, contact e-mail, phone and in one case a street address. This matches what the FPP client already does for peer capes. |
| `multisync[].capeInfo.*` | Same treatment, defensively. Peer cape records should never have carried a serial, but old clients are old. |
| Unknown top-level blocks | Anything outside the `TOP_LEVEL_KEEP` allowlist, dropped wholesale. |
| Household free-text settings | Value replaced with the marker `__SET__`. |

Removed settings values become the string `__SET__` rather than being deleted.
This keeps set-vs-unset analytics working — `settingsPopular` counts whether a
setting is set, and still does — while dropping the string itself.

### Why the top level is an allowlist

A denylist only removes what somebody thought to name. The corpus contains
historical shapes nobody remembered: `interfaces` (full `ip addr` output,
including `addr_info[].local` and `.broadcast`) and `advancedView.IPs[]` both
carry real LAN addresses and survived earlier audits untouched. An allowlist
drops those, and drops whatever the next one turns out to be.

The tradeoff is that a genuinely new block is dropped until it is added to the
list — see [Extending the policy](#extending-the-policy).

---

## What is deliberately kept

These are documented so nobody "tidies" them away later.

| Field | Why it stays |
|---|---|
| `uuid` and the directory name | Collision detection. A rotating id would hide collided directories entirely. |
| `multisync[].uuid` | The show-deduplication key. Many records carry duplicate peer uuids; without it the published show-size distribution is materially overstated. |
| `capeInfo.verifiedKeyId` | Licence-abuse detection. A handful of values across the corpus — coarser than `vendor.name`, which is also kept. Set from a compiled-in map and removed outright when the signature does not verify, so an EEPROM cannot inject an arbitrary string into it. The join risk is `serialNumber` + `cs`, both of which *are* removed. |
| `capeInfo.vendor.name` | Product attribution; a small, bounded set of values. |
| `capeInfo.designer` | Product attribution, 21 distinct values in the 2026-09-12 corpus — the same class as `vendor.name`. Identifies the cape *designer*, not the device owner, and is already public on the cape EEPROM. Several values are personal names; if that is judged unacceptable, add `designer` to `CAPE_DROP`. |
| `consent` | The record of the user's consent to collection: `{value, date, via, version, textHash}`. A compliance cleanup that deletes the evidence of consent has it backwards. Carries a timestamp, an enumerable source and a hash of the consent text — no household detail. |
| `TimeZone`, `Locale`, RTC and resolution selects | Analytically load-bearing — the show-graph validation runs on UTC offset — and not free text in practice. |
| Audio/video device names | `AudioOutput`, `AudioMixerDevice`, `ForceAudioId`, `VideoOutput`, `AES67Interface`. Hardware strings (`pcm510x`, `SoundBlaster Play! 3`) and how the project knows which kernel modules, plugins and USB devices an image must support. See `VALUE_DENYLIST` for the value-level exception. |
| Every checkbox and number | Cannot carry a hostname or a person's name. |

---

## How settings are decided

The decision is **declaration-driven**, not shape-driven. For each setting, in
order:

1. **On the hardware keep-list?** Keep the value, unless the specific value is in
   `VALUE_DENYLIST` (see below).
2. **Declared `pii` or `type: password`?** Scrub.
3. **Declared `type: text`?** Scrub. Being described by `settings.json` says what
   a field *is*, not that it is safe — `MultiSyncExtraRemotes` is `type: text`
   carrying a list of LAN addresses. Free text is withheld unless it is on a
   keep-list, so a text setting added upstream later is withheld by default.
4. **Undeclared, and not on a keep-list?** Fall back to value shape: keep numbers
   and booleans (and empty strings), scrub anything else.

An earlier version decided purely on value shape — keep numbers and booleans,
blank every other string. Against the real corpus that blanked `LogLevel_*`,
`fppMode`, `MediaBackend`, `WifiRegulatoryDomain`, `DateFormat` and a dozen more:
all enumerable, all analytically useful, and `fppMode` in particular is basic
fleet data. The FPP client never had this problem because it decides on
declarations; the two now agree.

### The declarations snapshot

The declarations come from FPP's `www/settings.json`, which lives in the
[fpp](https://github.com/FalconChristmas/fpp) repo, not here. A trimmed snapshot
(key → `{type, pii}`) is vendored at **`lib/settings-policy.json`** and pinned to
the upstream commit it came from. Regenerate it when FPP adds settings:

```bash
node statsCollector/tools/gen-settings-policy.js
```

The snapshot is deliberately trimmed. The rest of `settings.json` is UI layout —
labels, help text, option maps, restart flags — none of which affects what is
removed, and carrying it would make the snapshot a 100KB diff every time someone
rewords a tooltip.

**A stale snapshot fails safe.** A setting FPP knows about but the snapshot does
not is treated as undeclared and falls back to value shape, which withholds free
text. Staleness costs data, never privacy.

**There is no fallback if the snapshot is missing.** `lib/scrub.js` throws at
require time. An earlier Python version fell back to a five-key hardcoded list,
which left the declared set empty — and an empty declared set flips the
undeclared-free-text rule into blanking *every* non-numeric string, destroying
`fppMode`, `LogLevel_*`, `MediaBackend` and every other enumerable select. On an
unattended job that rewrites records in place, failing loudly beats silently
destroying columns.

### `VALUE_DENYLIST`

Some kept fields have individual bad values. `ForceAudioId` is the known case: a
small number of records hold a first name. The field has few distinct values in
total, so the fix is a value-level review of that short list rather than blanking
a field the project needs.

> **Open item.** `VALUE_DENYLIST` currently contains only the specimen value used
> by the self-test. Populating it requires a human reviewing the distinct values
> in the live corpus; until then those records keep whatever name is in them.

---

## Canaries

After a record is scrubbed, a set of regexes runs over the **scrubbed** result,
in memory, as part of the same pass. A hit means the policy is incomplete —
something sensitive *survived* — and is reported loudly at the end of the run.

Canaries cover: Wi-Fi PSK/passphrase, password-like field names, e-mail
addresses, latitude/longitude, public IPv4, and private IPv4.

Two design points matter:

- **They run on the output, not the input.** Run against raw records, the e-mail
  canary fired on 38% of files — every one of them `capeInfo.vendor.email`, which
  the vendor-block reduction already removes. (That 38% figure is from the
  original analysis; the current canaries run on output and report 0 on the live
  corpus.) A canary that fires on data the
  policy handles correctly trains you to ignore it. Asking instead "does anything
  sensitive survive?" makes a hit mean something.
- **They walk the record structurally, not the serialised blob.** A hit reports
  the field path, which is what makes it actionable, and version fields can be
  skipped. A kernel string like `5.10.103.4` is a valid dotted-quad with every
  octet under 256; without the `VERSION_FIELDS` skip that produced hundreds of
  false positives from `systemInfo.Kernel` and `multisync[].version`.

Private addresses are canaried as well as public ones. The payload deliberately
carries no addresses at all — the client drops peer addresses for exactly this
reason — so a private address surviving is a leak, not noise. The absence of that
canary is why `MultiSyncExtraRemotes` went unnoticed through two earlier audits
that both reported clean.

A canary hit **does not** fail the run. A stale policy is not a reason to stop
publishing a mostly-scrubbed archive; it is a reason to update the policy.

---

## The self-test

```bash
cd statsCollector && npm test          # or: node lib/scrub.selftest.js
```

A clean scrub run is meaningless unless the checks can come back red. The
self-test builds one specimen carrying every category the policy knows about,
plus one it does not, and asserts that:

- every removal happens and is counted;
- every deliberate keep survives (uuid, peer uuids, `verifiedKeyId`, vendor name,
  `TimeZone`, hardware audio strings, numbers, checkboxes, enumerable selects);
- the canaries fire on unhandled data, stay silent on handled vendor e-mail, and
  stay silent on dotted-quad version strings;
- a non-payload file (the published summary) is left untouched;
- payloads that lack `systemInfo`, or report `uuid: null` / `uuid: ""`, are still
  scrubbed (see [Verification](#verification));
- a second pass is a no-op.

It runs in milliseconds with no I/O, and `run.sh` gates container start on it.

---

## Operations

```bash
# Report what would be removed, write nothing. Safe on live data.
out_dir=/statsdata node scrub-archive.js --dry-run

# Scrub in place.
out_dir=/statsdata node scrub-archive.js     # or: npm run scrub

# Prove the checks can fail.
npm test
```

`out_dir` defaults to `/tmp/output`; in the container it is `/statsdata`.

Always run `npm test` and a `--dry-run` before a first scrub of a new corpus, and
compare the counts against an independent figure. **If the audit reports far
fewer serial numbers than you expect, the policy is not finding what it should
and a clean scrub is a false green.**

Writes are atomic: each record is written to a sibling temp file, given the
original's mode and owner, then renamed over it. A reader sees either the old
record or the new one, never a truncated one. Unreadable files are counted and
skipped, not fatal.

---

## Extending the policy

Edit the policy constants at the top of `lib/scrub.js`; the code below them
should not need to change.

| To do this | Edit |
|---|---|
| Keep a new top-level block | `TOP_LEVEL_KEEP` |
| Remove another cape field | `CAPE_DROP` |
| Keep more of the vendor block | `VENDOR_KEEP` |
| Keep a device/hardware setting | `SETTING_HARDWARE_KEEP` |
| Keep an undeclared but enumerable setting | `SETTING_KEEP_ANYWAY` |
| Blank a specific bad value of a kept setting | `VALUE_DENYLIST` |
| Pick up new upstream settings | Regenerate `lib/settings-policy.json` |

After any change, run `npm test`, then `--dry-run` against a real corpus and
check the counts moved the way you expected. Add a case to the self-test for
anything a canary or a corpus run catches — every check in there exists because
something was actually wrong once.

---

## Files

| Path | Purpose |
|---|---|
| `lib/scrub.js` | The policy and the scrubbing logic. Exports `scrubRecord`, `canaryRecord`, `writeAtomic` and the policy constants. |
| `lib/settings-policy.json` | Vendored, pinned snapshot of FPP's `www/settings.json`, trimmed to `{type, pii}`. **Generated — do not hand-edit.** |
| `lib/scrub.selftest.js` | The control. `npm test`, and the container start gate. |
| `scrub-archive.js` | Walks `out_dir`, scrubs in place, reports counts and canaries. `--dry-run` to report only. |
| `tools/gen-settings-policy.js` | Regenerates the snapshot from upstream. |
| `run.sh` | Self-test gate, hourly gather, 4-hourly scrub + archive. |

---

## Verification

Validated against a full copy of live production data (930,708 files, 20,430
device directories, 2026-09-12):

- **384,328 files rewritten.** 373,450 `serialNumber`, 306,565 `cs`, 324,376
  vendor contact blocks, 2,460 `KioskUrl`, 143 `FPP_UUID`, 722 `VLCOptions`.
- **0 canaries fired.** 0 unreadable. 2 files skipped — exactly
  `summary.json` and `summary_noDocker.json`.
- **Idempotent**: a second pass rewrote 0 files and left 0 temp files.
- **Handler output**: 31 of 33 handlers byte-identical before vs after, in both
  `summary.json` and `summary_noDocker.json`. `lastReported` differed only by
  clock drift between the two runs. `settingsValues` changed as intended — 126 of
  129 settings unchanged; `FPP_UUID` (9 distinct values → 1), `KioskUrl` (31 → 1)
  and `VLCOptions` (8 → 2) collapse to `__SET__`.

That run also corrected four real defects, each of which is now a regression test:

1. **A leak the canary caught.** The payload guard required `uuid` *and*
   `systemInfo`. Five genuine payloads carry no `systemInfo` block, so they were
   skipped entirely with serial, `cs` and vendor contact intact.
2. **The first fix was worse.** Requiring `uuid` to be a non-empty string skipped
   37 more real payloads that report `uuid: null` or `uuid: ""` — a device that
   cannot read its own uuid still uploads its cape serial. Canary hits rose 2 → 20,
   which is how it was caught. The guard is now *presence of the `uuid` key* plus
   any payload block; the summaries are excluded because they carry no `uuid` key
   at all.
3. **`wifiDrivers`** (109,603 records, 3 values: `Kernel`, `External`, `""`) and
   **`AudioBackend`** (695 records, 2 values) were being blanked by the
   undeclared-free-text backstop — fleet data destroyed for no privacy gain.
4. **`consent`** (786 records) was being dropped by the top-level allowlist.
