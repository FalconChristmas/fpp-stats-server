#!/bin/bash

while true
do
    echo "Starting Process"
    node ./index.js
    echo "Starting Zip"
    time find /statsdata -name "*.json" | zip -@ -qq /statsdata/all_files.zip
    echo "Zip Done"
    sleep 3600 # An hour

done
