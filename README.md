# fpp-stats-server

Back end server for capturing statistics from [FPP installations](https://github.com/FalconChristmas/fpp).  Also includes the code for generating a user facing website that summarizes some of the data.   There is an overall docker-compose file that creates the storage volume and shares it between the containers.   The website is intended to be severed up separately. 

# NOTE
Before building, the my.env.sample should be copied to my.env and a unique string set for allowing the stats file to be downloaded. In addition, a github token

# Components
## Server
This is the API for collecting as storing information from each FPP instance. It is assumed to run in a docker container along with statsCollector that share a storage volume

## StatsCollector
This is a second process that will periodically process all of the stats files that have been collected and generate an overall summary of the data. It is intended to 

## Website
A simple, flat website that uses Chart.js to summarize some of the statistics.  Given that is just plan HTML5, no server for hosting is included to allow for flexibility. 
