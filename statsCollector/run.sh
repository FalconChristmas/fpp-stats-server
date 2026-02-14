#!/bin/bash

while true
do
    echo "Starting Process"
    node ./index.js
    echo "Starting Zip"
    time (find /statsdata -type f -name "*.json" -print0 | tar --null -cf - --files-from=- | gzip -9 -n > /statsdata/all_files.tar.gz
    mv /statsdata/all_files.tar.gz /statsdata/all_files.tar.gz
    echo "Zip Done"
    sleep 3600 # An hour

done
