
function sortByValue(a, b) {
    return b.value - a.value;
}

// Creates a pi Chart from a "last seen in" format.
function drawPieChart(ctx, input, level) {
    let textLabel = input.description;
    let chartLabels = [];
    let chartData = [];

    let sortable = [];

    for (const [key, value] of Object.entries(input.data)) {
        sortable.push({
            label: key,
            value: value[level]
        });
    }
    
    sortable.sort(sortByValue);

    sortable.forEach((row) => {
        chartLabels.push(row.label);
        chartData.push(row.value);
    });

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