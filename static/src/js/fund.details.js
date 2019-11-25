function showFundDetailPage (detailparent) {
    if (detailparent.className != "hold_detail") {
        return;
    };

    if (!detailpage) {
        detailpage = new FundDetail();
        detailpage.createFundDetailFramework();
    };

    document.getElementById('funds_list_container').style.display = 'none';
    detailpage.container.style.display = 'block';
    detailpage.code = detailparent.id.split("_").pop();
    detailpage.switchContentTo(detailpage.navDiv.firstChild);
    detailpage.showSingleBuyTable(detailpage.navDiv.firstChild.bindContent);
}

function BackToList() {
    detailpage.container.style.display = 'none';
    document.getElementById('funds_list_container').style.display = 'block';
}

class FundDetail {
    code = null;
    navDiv = null;
    contentDiv = null;
    container = document.getElementById('fund_single_detail_container');

    createFundDetailFramework() {
        this.navDiv = document.createElement("div");
        this.contentDiv = document.createElement("div");
        this.container.appendChild(this.navDiv);
        this.container.appendChild(this.contentDiv);
    
        var showBuyTableBtn = document.createElement("button");
        showBuyTableBtn.textContent = "买入记录";
        showBuyTableBtn.onclick = function(e) {
            detailpage.switchContentTo(e.target);
            detailpage.showSingleBuyTable(e.target.bindContent);
        }
        this.navDiv.appendChild(showBuyTableBtn);
        var buyTable = document.createElement("table");
        showBuyTableBtn.bindContent = buyTable;
        this.contentDiv.appendChild(buyTable);

        var showTotalChartBtn = document.createElement("button");
        showTotalChartBtn.textContent = "累计收益";
        showTotalChartBtn.onclick = function(e) {
            detailpage.switchContentTo(e.target);
            detailpage.showSingleTotalEarned(e.target.bindContent);
        }
        this.navDiv.appendChild(showTotalChartBtn);
    
        var totalEarnedChart = document.createElement("div");
        showTotalChartBtn.bindContent = totalEarnedChart;
        this.contentDiv.appendChild(totalEarnedChart);
    }

    switchContentTo(t) {
        var sibling = t.parentElement.firstChild;
        while (sibling != null) {
            if (sibling != t) {
                sibling.bindContent.style.display = "none";
            };
            sibling = sibling.nextElementSibling;
        }
        t.bindContent.style.display = "block";
    }

    buytable_code = null;
    showSingleBuyTable(buyTable) {
        if (this.buytable_code == null && this.code == null) {
            return;
        };
        if (this.buytable_code == this.code) {
            return;
        };
        utils.deleteAllRows(buyTable);
        this.buytable_code = this.code;
        if (!this.code || ftjson[this.code].buy_table === undefined) {
            return;
        };
        buyTable.appendChild(utils.createSingleRow("buy:"));
        buyTable.appendChild(utils.createSplitLine());
        var buyrecs = ftjson[this.code].buy_table;
        for (var i = 0; i < buyrecs.length; i++) {
            if (buyrecs[i].sold == 0) {
                buyTable.appendChild(utils.create2ColRow(utils.date_by_delta(buyrecs[i].date), buyrecs[i].cost));
            };
        };
    }

    chart = null;
    showSingleTotalEarned(totalChart) {
        if (this.chart == null && this.code == null) {
            return;
        };

        if (this.chart != null) {
            if (this.chart.code == this.code) {
                return;
            } else {
                this.chart.clearChart()
            }
        };

        if (this.code == null || ftjson[this.code].buy_table === undefined) {
            return;
        };

        if (this.chart) {
            this.chart.code = this.code;
        } else {
            this.chart = new EarnedChart(this.code, totalChart);
        }
        this.chart.drawChart();
    }
}

class EarnedChart {
    constructor(code, chart_div) {
        this.code = code;
        this.chart = new google.visualization.LineChart(chart_div);
        this.data = null;
    }

    createChartOption() {
        this.options = {
            title: ftjson[this.code].name,
            width: '100%',
            height: '100%',
            crosshair: { trigger: 'both', opacity: 0.5},
            pointSize: 2,
            hAxis: {
                slantedText:true,
                slantedTextAngle:-30
            },
            vAxes: {
                0: {
                },
                1: {
                }
            },
            series: {
                0: {targetAxisIndex: 0},
                1: {targetAxisIndex: 1}
            }
        };
    }

    createDataTable() {
        if (all_hist_data.length < 1) {
            return;
        };

        var buytable = ftjson[this.code]? ftjson[this.code].buy_table : null;
        if (!buytable) {
            return;
        };

        var minDate = buytable[0].date;
        for (var i = 1; i < buytable.length; i++) {
            if (buytable[i].date < minDate) {
                minDate = buytable[i].date;
            }
        };

        var fundDateIdx = 0;
        var startDateIdx = all_hist_data.findIndex(function(curVal) {
            return curVal[fundDateIdx] == minDate;
        });

        var data = new google.visualization.DataTable();
        data.addColumn('string', '日期');
        data.addColumn('number', '实际收益率');
        data.addColumn({type: 'string', role: 'tooltip'});
        data.addColumn('number', '理论收益率');
        data.addColumn({type: 'string', role: 'tooltip'});

        var rows = [];
        var len = all_hist_data.length;
        var earned = 0;
        var portion = 0;
        var fixedVal = 0;
        for (var i = startDateIdx; i < len; i++) {
            var date = all_hist_data[i][0];
            var strDate = utils.date_by_delta(date)
            var r = [strDate];
            var valIdx = all_hist_data[0].indexOf(this.code) * 2 - 1;
            var grIdx = valIdx + 1;
            earned += portion * all_hist_data[i - 1][valIdx] * parseFloat(all_hist_data[i][grIdx]) / 100;
            r.push(earned);
            r.push(strDate + "累计: " + earned.toFixed(2));
            var buyrec = buytable.find(function(curVal){
                return curVal.date == date;
            });
            if (buyrec) {
                portion += buyrec.ptn;
            };

            var selltable = ftjson[this.code]? ftjson[this.code].sell_table : null;
            if (selltable) {
                var sellrec = selltable.find(function(curVal){
                    return curVal.date == date;
                });
                if (sellrec) {
                    portion -= sellrec.ptn;
                };
            };

            var newVal = fixedVal * (100 + parseFloat(all_hist_data[i][grIdx]))/100;
            if (fixedVal == 0) {
                fixedVal = all_hist_data[startDateIdx][valIdx];
                newVal = fixedVal;
            };

            r.push(newVal);
            r.push(strDate + ":" + (100* (newVal - all_hist_data[startDateIdx][valIdx]) /all_hist_data[startDateIdx][valIdx]).toFixed(2) + "%");
            fixedVal = newVal;

            rows.push(r);
        };

        data.addRows(rows);
        this.data = data;
    }

    drawChart() {
        this.createDataTable();
        this.createChartOption();

        if (this.data) {
            this.chart.draw(this.data, this.options);
        };
    }

    clearChart() {
        this.chart.draw(null, null);
    }
}

var detailpage = null;
