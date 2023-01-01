"use strict";
var myData = {};
var chartsToDestroy = [];

// Simple helper function for sorting a object
// by the "value" attribute+
function sortByValue(a, b) {
    return b.value - a.value;
}

// Function to short by Timezone
function byTimeZone(a, b) {
    function toNumber(str) {
        if (str == "Not Reported") {
            return 99999999;
        } else if (str.startsWith('+')) {
            return parseInt(str.substring(1, 6));
        } else {
            return -1 * parseInt(str.substring(1, 6));
        }
    }
    return toNumber(a) - toNumber(b);
}

function removeObjectArray(array, obj) {
    const index = array.indexOf(obj);
    if (index > -1) {
        array.splice(index, 1);
    }
}

function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        hours = '' + d.getHours(),
        minutes = '' + d.getMinutes(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    if (minutes.length < 2) minutes = '0' + minutes
    if (hours.length < 2) hours = '0' + hours

    return [year, month, day].join('-') + " " + [hours, minutes].join(':');
}

// Draw a bar chart where the object has
// "name" : value
// Sort the data but limit to the specified
// number of rows
function drawSortedBarChart(ctx, obj, limit, transformer) {
    let sorted = [];

    for (const [key, valueOrig] of Object.entries(obj)) {
        let value = valueOrig
        if (transformer != null) {
            value = transformer(value);
        }
        sorted.push({
            label: key,
            value: value
        });
    }

    // sort data
    sorted.sort(sortByValue);

    // limit
    sorted = sorted.slice(0, limit);
    let labels = [];
    let data = [];

    sorted.forEach((p) => {
        labels.push(p.label);
        data.push(p.value);
    });

    // Generate Chart
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: null,
                data: data,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        precision: 0
                    }
                }]
            },
            legend: {
                display: false
            },
            plugins: {
                colorschemes: {
                    // Options from https://nagix.github.io/chartjs-plugin-colorschemes/colorchart.html
                    scheme: 'brewer.Paired12'
                }
            }
        }
    });
    chartsToDestroy.push(myChart);
}

// Creates a bar chart of chart using the property names
function drawBarChartObject(ctx, obj, properties, labels) {
    let chartData = [];
    let textLabel = null;
    properties.forEach((p) => {
        chartData.push(obj[p]);
    });

    // Generate Chart
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: textLabel,
                data: chartData,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        precision: 0
                    }
                }]
            },

            plugins: {
                colorschemes: {
                    // Options from https://nagix.github.io/chartjs-plugin-colorschemes/colorchart.html
                    scheme: 'brewer.Paired12'
                }
            }
        }
    });
    chartsToDestroy.push(myChart);

}

/*
* creats a bar chart for  data like 
* {
    group1: {
        t1: 2,
        t2: 4, 
        t3: 6
    }, {
    group1: {
        t1: 2,
        t2: 4, 
        t3: 6
    }
}
where timeGroup = [t1,t2], properties = [group1,group2]
*/
function drawBarChartObjectTime(ctx, obj, properties, labels, timeGroup) {
    let chartData = [];
    let textLabel = null;
    properties.forEach((p) => {
        let value = 0;
        if (p in obj) {
            value = obj[p][timeGroup];
        }
        chartData.push(value);
    });

    // Generate Chart
    var myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: textLabel,
                data: chartData,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            legend: {
                display: false
            },
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true,
                        precision: 0
                    }
                }]
            },

            plugins: {
                colorschemes: {
                    // Options from https://nagix.github.io/chartjs-plugin-colorschemes/colorchart.html
                    scheme: 'brewer.Paired12'
                }
            }
        }
    });
    chartsToDestroy.push(myChart);


}

// Creates a pi Chart from a "last seen in" format.
function drawPieChart(ctx, input, level) {
    let textLabel = "";
    let chartLabels = [];
    let chartData = [];
    let sortable = [];

    let data = input;
    if ("data" in input) {
        data = input.data;
    }
    if ("description" in input) {
        textLabel = input.description;
    }

    // Copy all data to a simpler structure for sorting.
    for (const [key, value] of Object.entries(data)) {
        sortable.push({
            label: key,
            value: value[level]
        });
    }
    // Sort the data
    sortable.sort(sortByValue);

    // split labels and data for charting.
    sortable.forEach((row) => {
        chartLabels.push(row.label);
        chartData.push(row.value);
    });

    // Generate Chart
    var myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                label: textLabel,
                data: chartData,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                colorschemes: {
                    // Options from https://nagix.github.io/chartjs-plugin-colorschemes/colorchart.html
                    scheme: 'brewer.Paired12'
                }
            }
        }
    });
    chartsToDestroy.push(myChart);

}

function createTimeTransformer(time) {
    return (obj) => obj[time]
}

function updateOptionText(data) {
    for (const [key, valueOrig] of Object.entries(data.Instances.data)) {
        let obj = $('select option[value="' + key + '"]');
        let base = obj.html();
        let pos = base.indexOf(" - ");
        if (pos > 0) {
            base = base.substring(0, pos);
        }
        let newText = base + " - " + valueOrig + "  devices";
        obj.html(newText);
    }

}

function fillTable(divId, data, fieldName, labelCssClass, dataCssClass, maxRows, colName) {
    let sortable = [];

    for (const [key, value] of Object.entries(data)) {
        sortable.push({
            label: key == "" ? "Unknown" : key,
            value: value[fieldName]
        });
    }

    sortable.sort(sortByValue);

    let html = '<div class="row"><div class="' + labelCssClass + '">';
    html += '<b>' + colName + '</b></div><div class="' + dataCssClass + '">';
    html += '<b>#</b></div></div>';

    sortable.forEach(function (r) {
        if (--maxRows > 0) {
            html += '<div class="row"><div class="' + labelCssClass + '">';
            html += r.label;
            html += '</div><div class="' + dataCssClass + '">' + r.value;
            html += '</div></div>';
        }
    });

    $("#" + divId).html(html);
}

// If going to redraw a chart, need to replace all canvas object
function clearCanvas() {
    $(".canvas-holder canvas").each(function (index) {
        let parent = $(this).parent();
        let id = $(this).attr('id');
        parent.html('<canvas id ="' + id + '"></canvas>');
    });

    chartsToDestroy.forEach(c => {
        c.destroy();
    });
    chartsToDestroy.length = 0
}

// makes an HTTP call to get the statistics
function getStats(logIt) {
    $("#loading").show();
    $("#all-charts").hide();
    let url = "https://fppstats.thehormanns.net/api/summary/true";

    if ($("#excludeDocker").prop("checked")) {
        url = "https://fppstats.thehormanns.net/api/summary/false"
    }
    $.get(url
    ).done(function (data) {
        if (logIt) {
            console.log(data);
        }
        $("#loading").hide();
        $("#all-charts").show();
        myData = data;
        updateOptionText(data);
        var when = formatDate(new Date(data.ts));
        $(".lastUpdated").html(when);
        refreshData($("#select-age").val());

    }).fail(function () {
        alert("Unable to load statistics");
    })

}

function refreshData(time) {
    let data = myData;
    clearCanvas();
    var timezones = Object.keys(data.timeZone.data).sort(byTimeZone);
    if (!(time in data.Instances.data)) {
        time = "last365Days";
    }
    removeObjectArray(data.outputLocalPixels.data.pixelOrder, "Zero");
    removeObjectArray(data.outputPanels.data.panelOrder, "Zero");
    removeObjectArray(data.outputPanels.data.channelOrder, "Zero");

    drawBarChartObjectTime($("#lastReportDaysChart"), data.lastReported.data.data, data.lastReported.data.order, data.lastReported.data.order, time);
    drawBarChartObjectTime($("#deviceMemoryBar"), data.deviceMemory.data.memory, data.deviceMemory.data.memoryOrder, data.deviceMemory.data.memoryOrder, time);
    drawPieChart($("#platform365"), data.platform, time);
    fillTable("platformGenericVar365", data.platformVariantBreakout.data.Generic.data, time, "label col-10 col-md-9", "data col-1", 50, 'Variant');
    drawPieChart($("#platformPiVar365"), data.platformVariantBreakout.data["Raspberry Pi"], time);
    drawPieChart($("#platformBBBVar365"), data.platformVariantBreakout.data["BeagleBone Black"], time);
    drawPieChart($("#fppMode365"), data.fppMode, time);
    drawPieChart($("#version365"), data.version, time);
    drawSortedBarChart($("#releaseos"), data.versionWithOS.data, 15, createTimeTransformer(time));
    drawPieChart($("#mqtt365"), data.mqttEnabled, time);
    drawPieChart($("#uiLevel365"), data.uiLevel, time);
    drawPieChart($("#cape365"), data.capeInstalled, time);
    drawBarChartObjectTime($("#topTimezone365"), data.timeZone.data, timezones, timezones, time); // ME
    drawSortedBarChart($("#topCapes365"), data.capeType.data, 15, createTimeTransformer(time));
    drawBarChartObject($("#lastReportChart"), data.uniqueByMonth.data.data, data.uniqueByMonth.data.order, data.uniqueByMonth.data.order);
    drawSortedBarChart($("#plugins365"), data.topPlugins.data[time], 10);
    drawBarChartObjectTime($("#outUnivt365"), data.outputUniverses.data.universe, data.outputUniverses.data.universeOrder, data.outputUniverses.data.universeOrder, time);
    drawBarChartObjectTime($("#outChannel365"), data.outputUniverses.data.channel, data.outputUniverses.data.channelOrder, data.outputUniverses.data.channelOrder, time);
    drawBarChartObjectTime($("#inUnivt365"), data.inputUniverses.data.universe, data.inputUniverses.data.universeOrder, data.inputUniverses.data.universeOrder, time);
    drawBarChartObjectTime($("#inChannel365"), data.inputUniverses.data.channel, data.inputUniverses.data.channelOrder, data.inputUniverses.data.channelOrder, time);
    drawSortedBarChart($("#outputProcessor365"), data.outputProcessors.data, 10, createTimeTransformer(time));
    drawSortedBarChart($("#popularSettings365"), data.settingsPopular.data, 12, createTimeTransformer(time));
    drawBarChartObjectTime($("#localPixels365"), data.outputLocalPixels.data.pixels, data.outputLocalPixels.data.pixelOrder, data.outputLocalPixels.data.pixelOrder, time);
    drawBarChartObjectTime($("#panelChannel365"), data.outputPanels.data.channel, data.outputPanels.data.channelOrder, data.outputPanels.data.channelOrder, time);
    fillTable("otherOutputs365", data.outputOther.data, time, "label col-10 col-md-9", "data col-1", 50, 'Output');
    drawBarChartObjectTime($("#PanelCounts365"), data.outputPanels.data.panels, data.outputPanels.data.panelOrder, data.outputPanels.data.panelOrder, time);
    drawPieChart($("#PanelSubType365"), data.outputPanels.data.panelSubType, time);
    drawPieChart($("#panelSize365"), data.outputPanels.data.panelSize, time);
    fillTable("version-detail", data.versionDetailed.data, time, "label col-10 col-md-9", "data col-1", 50, 'Release');
}
