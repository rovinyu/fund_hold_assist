var szzs_config = {
    type: 'line',
    data: {
        labels: [],
        datasets: []
    },
    options:{
        responsive: true,
        title: {
            display: true,
            text: ''
        },
        tooltip: {
            mode: 'index',
            intersect: true
        },
        hover: {
            mode: 'nearest',
            intersect: true
        },
        scales: {
            xAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Date'
                }
            }],
            yAxes: [{
                display: true,
                scaleLabel: {
                    display: true,
                    labelString: 'Value'
                }
            }]
        },
        elements: {
            line: {
                tension: 0
            }
        }
    }
};

//var szzs_line;

function drawSingleSzzsHistory(ctx, szzs_config, labels, data) {
    szzs_config.data.labels = labels;
    var dataset = {
        label: '上证指数',
        backgroundColor: 'blue',
        borderColor: 'darkgrey',
        data: [],
        fill: false,
    }
    dataset.data = data;
    szzs_config.data.datasets.push(dataset);
    var szzs_line = new Chart(ctx, szzs_config);
}

function DrawSzzsHistory() {
    var labels = [];
    var data = [];
    var dataArr = index_000001
    for (var i = 0; i < dataArr.length; i++) {
        labels.push(dataArr[i]["date"]);
        data.push(dataArr[i]["close"]);
    };
    // var ctx = document.getElementById('sz000001_canvas').getContext('2d');
    // drawSingleSzzsHistory(ctx, szzs_config, labels, data);
    var ctx_short = document.getElementById('sz000001_canvas_short').getContext('2d');
    var labels_short = [];
    var data_short = [];
    var len = dataArr.length;
    for (var i = 0; i < 100; i++) {
        labels_short.push(dataArr[len - 100 + i]["date"]);
        data_short.push(dataArr[len - 100 + i]["close"]);
    };
    szzs_config_short = szzs_config;
    drawSingleSzzsHistory(ctx_short, szzs_config_short, labels_short, data_short);
}