#!/bin/bash

# Fail fast if the scrub policy is broken.  This container rewrites records in
# place, so a policy that no longer does what it claims must stop the container
# rather than run unattended against five years of data.  The self-test is
# in-memory and takes milliseconds.
echo "Verifying scrub policy"
if ! node ./lib/scrub.selftest.js; then
    echo "FATAL: scrub self-test failed; refusing to start."
    exit 1
fi

# The archive is rebuilt every 4 hours rather than every run: it is a full
# tar+gzip -9 of the entire corpus, and hourly was most of this loop's work for
# an artifact nobody consumes that often.
#
# Latched on a 4-hour bucket number rather than `$(date +%H) % 4` because the
# loop period is not exactly an hour -- the gather and the tar itself add drift,
# so a bare hour-mod test eventually steps over a window and skips it entirely.
# Comparing bucket numbers means a late loop still catches the window it missed.
ARCHIVE_INTERVAL=14400   # 4 hours, in seconds
STAMP=/statsdata/.last_archive

while true
do
    echo "Starting Process"
    node ./index.js

    bucket=$(( $(date +%s) / ARCHIVE_INTERVAL ))
    if [ "$bucket" != "$(cat "$STAMP" 2>/dev/null)" ]; then
        # Scrub before archiving, never after: the tar is what gets published,
        # so identifying fields must be gone before it is built.  If the scrub
        # fails we deliberately do NOT build an archive -- publishing an
        # unscrubbed one is worse than publishing a stale one -- and the stamp is
        # left alone so the next hour retries.
        echo "Starting Scrub"
        if node ./scrub-archive.js; then
            echo "Starting Zip"
            time (find /statsdata -type f -name "*.json" -print0 | tar --null -cf - --files-from=- | gzip -9 -n > /statsdata/new_all_files.tar.gz)
            mv /statsdata/new_all_files.tar.gz /statsdata/all_files.tar.gz
            echo "$bucket" > "$STAMP"
            echo "Zip Done"
        else
            echo "ERROR: scrub failed; skipping archive build. Will retry next run."
        fi
    else
        echo "Archive is current for this 4 hour window; skipping scrub and zip"
    fi

    sleep 3600 # An hour
done
