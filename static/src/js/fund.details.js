function CreateFundDetailFramework() {
    var buyTable = document.createElement("table");
    buyTable.id = "fund_single_detail_buytable";
    document.getElementById('fund_single_detail_container').appendChild(buyTable);
}

function showFundDetailPage (detailparent) {
    if (detailparent.className != "hold_detail") {
        return;
    };

    document.getElementById('funds_list_container').style.display = 'none';
    var code = detailparent.id.split("_").pop();
    var container = document.getElementById('fund_single_detail_container');
    container.style.display = 'block';
    var buyTable = document.getElementById("fund_single_detail_buytable");
    utils.deleteAllRows(buyTable);
    buyTable.appendChild(utils.createSingleRow("buy:"));
    buyTable.appendChild(utils.createSplitLine());
    if (ftjson[code]["buy_table"] !== undefined) {
        buyrecs = ftjson[code]["buy_table"];
        for (var i = 0; i < buyrecs.length; i++) {
            if (buyrecs[i].sold == 0) {
                buyTable.appendChild(utils.create2ColRow(utils.date_by_delta(buyrecs[i].date), buyrecs[i].cost));
            };
        };
        container.appendChild(buyTable);
    };
}

function BackToList() {
    var container = document.getElementById('fund_single_detail_container');
    container.style.display = 'none';
    document.getElementById('funds_list_container').style.display = 'block';
}