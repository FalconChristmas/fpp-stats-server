

// Simple helper function for sorting a object
// by the "value" attribute+
function sortByValue(a, b) {
    return b.value - a.value;
}

function day365Transformer(obj) {
    return obj.last365Days;
}

// Function to short by Timezone
function byTimeZone(a, b)
{
    function toNumber(str) {
        if (str == "Not Reported") {
            return 99999999;
        } else if (str.startsWith('+')) {
            return parseInt(str.substring(1,6));
        } else {
            return -1 * parseInt(str.substring(1,6));
        }
    }
    return toNumber(a) - toNumber(b);
}

function remoteObjectArray(array, obj) {
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
}
