#!/bin/bash

# This is just for copying the static files to another location where they are avaiable to the master webserver
rsync -av --delete website/* /var/www/fpp-stats/
