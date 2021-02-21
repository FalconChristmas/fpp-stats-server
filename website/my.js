
var masterData = 
{
    backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
        'rgba(255, 159, 64, 0.2)'
    ],
    borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
    ],

}

function drawPieChart(ctx, input, level) {
    let textLabel = input.description;
    let chartLabels = [];
    let chartData = [];
    
    for (const [key, value] of Object.entries(input.data)) {
        chartLabels.push(key);
        chartData.push(value[level]);
      }

    var myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                label: textLabel,
                data: chartData,
                backgroundColor: masterData.backgroundColor,
                borderColor: masterData.borderColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
        }
    });
}