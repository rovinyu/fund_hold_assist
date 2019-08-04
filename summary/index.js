let CodeToFetchEvent = 'FundCodeToFetch';
let RealtimeInfoFetchedEvent = "FundGzReturned";

function logInfo(...args) {
    //console.log(args);
}

window.onload = function() {
    showAllFundList();
}

document.addEventListener(RealtimeInfoFetchedEvent, e => {
    logInfo(e.detail);
    eval(e.detail);
});

function ForceFetchAll() {
    for (var fcode in ftjson){
        sendFetchEventActually(fcode);
    }
}

function sendFetchEventActually(fundcode) {
    let selectedCodeEvt = new CustomEvent(CodeToFetchEvent, {
        detail: {
            code: fundcode
        }
    });
    document.dispatchEvent(selectedCodeEvt);
}

function sendFetchEvent(fundcode) {
    var nowDate=new Date();
    var day_of_week = nowDate.getDay();
    if (day_of_week < 1 || day_of_week > 5) {
        return;
    };
    var hour_of_day = nowDate.getHours();
    if (hour_of_day < 9 || hour_of_day > 16) {
        return;
    };
    sendFetchEventActually(fundcode);
}

function createSingleRow(c) {
    var row = document.createElement("tr");
    var col = document.createElement("td");
    col.setAttribute("colspan","2");
    col.appendChild(document.createTextNode(c))
    row.appendChild(col);
    return row;
}

function createSplitLine() {
    var row = document.createElement("tr");
    var col = document.createElement("td");
    col.appendChild(document.createElement("hr"))
    row.appendChild(col);
    return row;
}

function create2ColRow(c1, c2){
    var row = document.createElement("tr");
    var col1 = document.createElement("td");
    col1.appendChild(document.createTextNode(c1));
    var col2 = document.createElement("tr");
    col2.appendChild(document.createTextNode(c2));
    row.appendChild(col1);
    row.appendChild(col2);
    return row;
}

function deleteAllRows(tbl) {
    for (var idx = tbl.rows.length - 1; idx >= 0; idx--) {
        tbl.deleteRow(idx);
    }
}

function getBudgetRows(budgets) {
    var rows = []
    if (!budgets || budgets.length < 1) {
        return rows;
    };

    var row0 = createSingleRow("budget");
    rows.push(row0);
    for (var i = 0; i < budgets.length; i++) {
        var row = creatBuyRow(budgets[i]["date"], budgets[i]["max_price_to_buy"], budgets[i]["budget"]);
        rows.push(row);
    };

    return rows;
}

function createBudgetsTable(budgets) {
    var budgetTable = document.createElement("table");
    var rows = getBudgetRows(budgets);
    for (var i = 0; i < rows.length; i++) {
        budgetTable.appendChild(rows[i]);
    };
    return budgetTable;
}

function creatBuyRow(date, maxprice, cost) {
    return create2ColRow(date, cost + "<" + maxprice + ">");
}

function getRollinRows(rollins) {
    var rows = [];
    if (!rollins || rollins.length < 1) {
        return rows;
    }

    var row0 = createSingleRow("roll in");
    rows.push(row0);

    for (var i = 0; i < rollins.length; i++) {
        var row = creatBuyRow(rollins[i]["date"], rollins[i]["max_price_to_buy"], rollins[i]["to_rollin"]);
        rows.push(row);
    };
    return rows;
}

function createRollinsTable(rollins) {
    var rollinTable = document.createElement("table");
    var rows = getRollinRows(rollins);
    for (var i = 0; i < rows.length; i++) {
        rollinTable.appendChild(rows[i]);
    };
    return rollinTable;
}

function getMaxSellPortion(netvalue, short_term_rate, buytable, ppg) {
    var portion_can_sell = 0.0;
    var max_value_to_sell = parseFloat(netvalue) * (1.0 - parseFloat(short_term_rate))
    for (var i = 0; i < buytable.length; i++) {
        if(parseFloat(buytable[i]["netvalue"]) < max_value_to_sell){
            portion_can_sell += parseFloat(buytable[i]["portion"])
        }
    };

    if (portion_can_sell > 0) {
        if (ppg != 1 && ppg != 0) {
            portion_can_sell /= ppg;
        };
    };

    return portion_can_sell.toFixed(4);
}

function jsonpgz(fundgz) {
    logInfo(fundgz);
    ftjson[fundgz.fundcode].rtgz = fundgz;
    updateGuzhiInfo(fundgz.fundcode);
    updateLatestSellInfo(fundgz.fundcode);
}

function updateLatestSellInfo(fundcode) {
    var jsonp = ftjson[fundcode].rtgz;
    var gz = jsonp.gsz;

    var sellTable = document.getElementById("tbl_sell_" + fundcode);

    var short_term_rate = ftjson[fundcode]["short_term_rate"];
    var buytable = ftjson[fundcode]["buy_table"];
    var ppg = parseFloat(ftjson[fundcode]["ppg"]);
    var portion_can_sell = getMaxSellPortion(gz, short_term_rate, buytable, ppg);

    if (portion_can_sell > 0) {
        if (sellTable.rows.length > 2) {
            sellTable.deleteRow(sellTable.rows.length - 1);
        };
    
        var row = create2ColRow(">"+ (parseFloat(short_term_rate) * 100).toFixed(2) +"%", portion_can_sell);
        sellTable.appendChild(row);
    };
}

function createSellInfoTable(fundcode) {
    var funddata = ftjson[fundcode];
    var sellTable = document.createElement("table");
    sellTable.id = "tbl_sell_" + fundcode;
    sellTable.appendChild(createSingleRow("sell"));
    sellTable.appendChild(create2ColRow(">7天", funddata["morethan7day"]));

    var short_term_rate = funddata["short_term_rate"];
    var buytable = funddata["buy_table"];
    var ppg = parseFloat(funddata["ppg"]);
    var netvalue = parseFloat(funddata["latest_netvalue"]);
    var portion_can_sell = getMaxSellPortion(netvalue, short_term_rate, buytable, ppg);
    if (portion_can_sell > 0) {
        sellTable.appendChild(create2ColRow(">"+ (parseFloat(short_term_rate) * 100).toFixed(2) +"%", portion_can_sell))
    };
    return sellTable;
}

function ToggleFundDetails(divDetail) {
    if (divDetail.style.display == "none") {
        sendFetchEvent(divDetail.id.split('_').pop());
        divDetail.style.display = "block";
    } else {
        divDetail.style.display = "none";
    }
}

function incdec_lbl_classname(val) {
    var lbl_class = "increase";
    if (val < 0) {
        lbl_class = "decrease";
    } else if (val == 0) {
        lbl_class = "keepsame";
    };
    return lbl_class;
}

function createGuzhiInfo(fundcode) {
    var funddata = ftjson[fundcode];
    var jsonp = funddata.rtgz;
    var lbl_class = incdec_lbl_classname(jsonp ? jsonp.gszzl : funddata["last_day_earned"]);

    var html = "<div class='guzhi'>最新估值: <label id='guzhi_lgz_" + fundcode + "'";
    if (lbl_class) {
        html += " class='" + lbl_class + "'";
    };
    html +=">"; 
    html += jsonp ? jsonp.gsz : funddata["latest_netvalue"];
    html += "</label>增长率: <label id='guzhi_zl_" + fundcode + "'"
    if (lbl_class) {
        html += " class='" + lbl_class + "'";
    };
    html +=">";
    html += jsonp ? jsonp.gszzl + "%" : "-";
    html += "</label></br>单位净值: <label>";
    html += funddata["latest_netvalue"];
    html += "</label>总计: <label id='guzhi_total_zl_" + fundcode + "'"
    var netvalue = parseFloat(funddata["averprice"]);
    if (funddata["ppg"] != 1) {
        netvalue /= funddata["ppg"];
        netvalue = netvalue.toFixed(4);
    };
    lbl_class = incdec_lbl_classname((jsonp ? jsonp.gsz : funddata["latest_netvalue"]) - netvalue)
    html += " class='" + lbl_class + "' >";
    var latest_netvalue = jsonp ? jsonp.gsz : funddata["latest_netvalue"];
    var total_percent = ((latest_netvalue - netvalue) * 100 / netvalue).toFixed(2) + "%";
    html += total_percent;
    html += "</label></div>";
    return html;
}

function updateGuzhiInfo(fundcode) {
    var jsonp = ftjson[fundcode].rtgz;
    var funddata = ftjson[fundcode];

    var lbl_class = incdec_lbl_classname( jsonp ? jsonp.gszzl : funddata["last_day_earned"]);
    var lbl_guzhi_lgz = document.getElementById("guzhi_lgz_" + fundcode);
    if (lbl_guzhi_lgz) {
        lbl_guzhi_lgz.innerText = jsonp ? jsonp.gsz : funddata["latest_netvalue"];
        lbl_guzhi_lgz.className = lbl_class;
    };
    var lbl_guzhi_zl = document.getElementById("guzhi_zl_" + fundcode);
    if (lbl_guzhi_zl) {
        lbl_guzhi_zl.innerText = jsonp ? jsonp.gszzl + "%" : "-";
        lbl_guzhi_zl.className = lbl_class;
    };

    var lbl_guzhi_total_percent = document.getElementById("guzhi_total_zl_" + fundcode);
    if (lbl_guzhi_total_percent) {
        var netvalue = parseFloat(funddata["averprice"]);
        if (funddata["ppg"] != 1) {
            netvalue /= funddata["ppg"];
            netvalue = netvalue.toFixed(4);
        };
        lbl_guzhi_total_percent.className = incdec_lbl_classname((jsonp ? jsonp.gsz : funddata["latest_netvalue"]) - netvalue);

        var latest_netvalue = jsonp ? jsonp.gsz : funddata["latest_netvalue"];
        var total_percent = ((latest_netvalue - netvalue) * 100 / netvalue).toFixed(2) + "%";

        lbl_guzhi_total_percent.innerText = jtotal_percent;
    };
}

function createGeneralInnerHtmlWithoutName(funddata) {
    var html = "<div>all: " + funddata["cost"] + "</span> &lt;" + funddata["averprice"]+ "&gt;</div>";

    var earned_lbl_class = incdec_lbl_classname(funddata["last_day_earned"]);
    html += "<div class='general_earned'><span>上日: <label class = '" + earned_lbl_class + "'>" + funddata["last_day_earned"] + "</label></span>";
    
    earned_lbl_class = incdec_lbl_classname(funddata["earned_while_holding"]);
    html += "持有: <label class='" + earned_lbl_class + "'>" + funddata["earned_while_holding"] + "</label>";
    html += "<label class='" + earned_lbl_class + "'>" + (100 * funddata["earned_while_holding"] / funddata["cost"]).toFixed(2) + "%</label></div>";
    return html;
}

function createGeneralInfoInSingleRow(fundcode) {
    var funddata = ftjson[fundcode];
    var html = "<div class='fund_header' onclick='ToggleFundDetails(hold_detail_" + fundcode + ")' id='fund_header_" + fundcode + "'>" + funddata["name"];
    html += createGuzhiInfo(fundcode);
    html += "</div>";
    var general_root = document.createElement("div");
    general_root.className = "general_root";
    general_root.innerHTML = html;

    var hold_detail = document.createElement("div");
    hold_detail.className = "hold_detail";
    hold_detail.id = "hold_detail_" + fundcode;
    hold_detail.style = "display:none;";
    hold_detail.innerHTML = createGeneralInnerHtmlWithoutName(funddata);

    hold_detail.appendChild(createBudgetsTable(funddata["budget"]));
    hold_detail.appendChild(createRollinsTable(funddata["rollin"]));
    hold_detail.appendChild(createSellInfoTable(fundcode));

    general_root.appendChild(hold_detail);

    var col = document.createElement("td");
    col.appendChild(general_root)
    var row = document.createElement("tr");
    row.appendChild(col);
    return row;
}

function updateTotalEarnedInfo(earned, total_earned, cost) {
    if (earned != 0) {
        var lbl_earned = document.getElementById("last_total_earned");
        lbl_earned.textContent = earned.toFixed(2);
        var lbl_class = incdec_lbl_classname(earned);
        lbl_earned.className = lbl_class;

        var lbl_earn_percent = document.getElementById("last_total_percent");
        lbl_earn_percent.textContent = (100 * earned/cost).toFixed(2) + "%";
        lbl_earn_percent.className = lbl_class;

        document.getElementById("total_cost").textContent = cost;
        
        var lbl_total_earned = document.getElementById("total_earned");
        lbl_total_earned.textContent = total_earned.toFixed(2);
        var lbl_total_class = incdec_lbl_classname(total_earned);
        lbl_total_earned.className = lbl_total_class;

        var lbl_total_percent = document.getElementById("total_percent");
        lbl_total_percent.textContent = (100 * total_earned / cost).toFixed(2) + "%";
        lbl_total_percent.className = lbl_total_class;
    };
}

function showAllFundList() {
    var fund_list_tbl = document.getElementById("fund_list_table");

    var earned = 0;
    var total_earned = 0;
    var cost = 0;
    for (var fcode in ftjson){
        sendFetchEvent(fcode);
        fund_list_tbl.appendChild(createSplitLine());

        var row = createGeneralInfoInSingleRow(fcode);
        fund_list_tbl.appendChild(row);

        var funddata = ftjson[fcode];
        earned += funddata["last_day_earned"];
        total_earned += funddata["earned_while_holding"];
        cost += funddata["cost"];
    }

    updateTotalEarnedInfo(earned, total_earned, cost);
}