

// Simple helper function for sorting a object
// by the "value" attribute+
function sortByValue(a, b) {
    return b.value - a.value;
}

// Creates a bar chart of chart using the property names
function drawBarChartObject(ctx, obj, properties, labels) {
    let chartData = [];
    let textLabel = "Ignore";
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
    let textLabel = input.description;
    let chartLabels = [];
    let chartData = [];
    let sortable = [];

    // Copy all data to a simpler structure for sorting.
    for (const [key, value] of Object.entries(input.data)) {
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