class Utils {
    logInfo(...args) {
        //console.log(args);
    }

    getTodayDate() {
        var dt = new Date();
        return dt.getFullYear()+"-" + ('' + (dt.getMonth()+1)).padStart(2, '0') + "-" + ('' + dt.getDate()).padStart(2, '0');
    }

    days_since_2000(date) {
        var d = new Date("2000-01-01");
        var dt = new Date(date);
        return (dt - d) / (24 * 60 * 60 * 1000);
    }

    date_by_delta(days) {
        var dt = new Date("2000-01-01");
        dt.setTime(dt.getTime() + days * 24 * 60 * 60 * 1000);
        return dt.getFullYear() + "-" + ('' + (dt.getMonth()+1)).padStart(2, '0') + "-" + ('' + dt.getDate()).padStart(2, '0');
    }

    get(path, queries, cb) {
        var httpRequest = new XMLHttpRequest();
        var lnk = '../../' + path;
        if (queries && queries.length > 0) {
            lnk += '?' + queries;
        };
        httpRequest.open('GET', lnk, true);
        httpRequest.send();

        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                if (typeof(cb === 'function')) {
                    cb(httpRequest.responseText);
                };
            };
        }
    }

    post(querystr, form, cb) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.open('POST', '../../' + querystr);
        httpRequest.send(form);

        httpRequest.onreadystatechange = function () {
            if (httpRequest.readyState == 4 && httpRequest.status == 200) {
                if (typeof(cb) === 'function') {
                    cb();
                };
            };
        }
    }

    mergeStockSummaryJson(s, a) {
        for(var c in a) {
            var buy_table = null;
            var sell_table = null;
            if (s[c] && s[c].buy_table) {
                buy_table = s[c].buy_table;
            };
            if (s[c] && s[c].sell_table) {
                sell_table = s[c].sell_table;
            };
            s[c] = a[c];
            if (buy_table) {
                s[c].buy_table = buy_table;
            };
            if (sell_table) {
                s[c].sell_table = sell_table;
            };
        }
    }

    combineid(ids) {
        if (ids instanceof Array) {
            return ids.join('_');
        };
        return '' + ids;
    }

    incdec_lbl_classname(val) {
        var lbl_class = "increase";
        if (val < 0) {
            lbl_class = "decrease";
        } else if (val == 0) {
            lbl_class = "keepsame";
        };
        return lbl_class;
    }

    createSingleRow(c, span = 2) {
        var row = document.createElement("tr");
        var col = document.createElement("td");
        col.setAttribute("colspan", span);
        col.appendChild(document.createTextNode(c))
        row.appendChild(col);
        return row;
    }

    createColsRow(...c){
        var row = document.createElement("tr");
        for (var i = 0; i < c.length; i++) {
            var col = document.createElement("td");
            if ('object' != typeof(c[i]) || !c[i]) {
                col.appendChild(document.createTextNode(c[i]));
            } else {
                col.appendChild(c[i]);
            }
            row.appendChild(col);
        };
        return row;
    }

    createInputRow(name, inputType, value, c1, c2, c3, checked = false) {
        var row = document.createElement("tr");
        var col1 = document.createElement("td");
        var radio = document.createElement("input");
        radio.type = inputType;
        radio.name = name;
        radio.value = value;
        if (checked) {
            radio.checked = true;
        };
        col1.appendChild(radio);
        col1.appendChild(document.createTextNode(c1));
        row.appendChild(col1);
        var col2 = document.createElement("td");
        col2.appendChild(document.createTextNode(c2));
        row.appendChild(col2);
        if (c3) {
            var col3 = document.createElement('td');
            col3.appendChild(document.createTextNode(c3));
            row.appendChild(col3);
        };
        return row;
    }

    createRadioRow(name, value, c1, c2, checked = false) {
        return this.createInputRow(name, "radio", value, c1, c2, null, checked);
    }

    createCheckboxRow(name, value, c1, c2, c3, checked = false) {
        return this.createInputRow(name, "checkbox", value, c1, c2, c3, checked);
    }

    deleteAllRows(tbl) {
        for (var idx = tbl.rows.length - 1; idx >= 0; idx--) {
            tbl.deleteRow(idx);
        }
    }

    getIdsPortionMoreThan(buytable, days = 0) {
        var datestart = this.days_since_2000(this.getTodayDate()) - days;
        var portionInDays = 0;
        var tids = [];
        for (var i = 0; i < buytable.length; i++) {
            if (buytable[i].date <= datestart && buytable[i].sold == 0) {
                tids.push(buytable[i].id);
                portionInDays += buytable[i].ptn;
            }
        };
        return {ids: tids.join('_'), portion: portionInDays}
    }

    getShortTermIdsPortionMoreThan(buytable, latest_val, short_term_rate, days = 1) {
        var portionLatest = 0;
        var portionAll = 0;
        var datestart = this.days_since_2000(this.getTodayDate()) - days;
        for (var i = 0; i < buytable.length; i++) {
            if (buytable[i].date > datestart) {
                portionLatest += buytable[i].ptn;
            };
            if (buytable[i].sold == 0) {
                portionAll += buytable[i].ptn;
            };
        };

        var portionAvailable = portionAll - portionLatest;
        var max_price = (parseFloat(latest_val) * (1.0 - parseFloat(short_term_rate)));
        var buyrecs = [];
        var portion = 0;
        for (var i = 0; i < buytable.length; i++) {
            if(buytable[i].sold == 0 && buytable[i].price < max_price) {
                buyrecs.push(buytable[i]);
                portion += buytable[i].ptn;
            }
        };

        for (var i = buyrecs.length - 1; i >= 0; i--) {
            if (portion <= portionAvailable) {
                break;
            }
            portion -= buyrecs[i].ptn;
            buyrecs.pop();
        };

        var aids = '';
        for (var i = 0; i < buyrecs.length; i++) {
            aids += (buyrecs[i].id) + '_';
        };
        return {ids: aids.slice(0, aids.length - 1), portion: portion};
    }
}

class RadioAnchorBar {
    constructor(text = '') {
        this.container = document.createElement('div');
        this.container.className = 'radio_anchor_div';
        if (text.length > 0) {
            this.container.appendChild(document.createTextNode(text));
        };
        this.radioAchors = [];
    }

    addRadio(text, cb) {
        var ra = document.createElement('a');
        ra.href = 'javascript:void(0)';
        ra.anchorBar = this;
        ra.textContent = text;
        ra.onclick = function(e) {
            e.target.anchorBar.setHightlight(e.target, cb);
        }
        this.container.appendChild(ra);
        this.radioAchors.push(ra);
    }

    setHightlight(r, cb) {
        if (!cb) {
            r.className = '';
            r.click();
            return;
        };
        
        for (var i = 0; i < this.radioAchors.length; i++) {
            if (this.radioAchors[i] == r) {
                if (this.radioAchors[i].className == 'highlight') {
                    return;
                };
                this.radioAchors[i].className = 'highlight';
                if (typeof(cb) === 'function') {
                    cb();
                };
            } else {
                this.radioAchors[i].className = '';
            }
        };
    }

    selectDefault() {
        var defaultItem = this.radioAchors[this.getHighlighted()];
        this.setHightlight(defaultItem);
    }

    getHighlighted() {
        for (var i = 0; i < this.radioAchors.length; i++) {
            if (this.radioAchors[i].className == 'highlight') {
                return i;
            }
        };
        return 0;
    }
}

var utils = new Utils();
var all_stocks = {};

class StockTrade {
    fetchStockSummary(code, cb) {
        var querystr = 'act=summary';
        if (code) {
            querystr += '&code=' + code;
        };
        utils.get('stock', querystr, function(rsp){
            utils.mergeStockSummaryJson(all_stocks, JSON.parse(rsp));
            if (typeof(cb) === 'function') {
                cb(code);
            };
        });
    }

    buyStock(date, code, price, amount, rids, cb) {
        var fd = new FormData();
        fd.append("act", 'buy')
        fd.append("code", code);
        fd.append("date", date);
        fd.append("price", price);
        fd.append("ptn", amount);
        if (rids) {
            fd.append("rid", utils.combineid(rids));
        };
        utils.post('stock', fd, function(){
            if (typeof(cb) === 'function') {
                cb();
            };
        });
    }

    fetchBuyData(code, cb) {
        var querystr = 'act=buy&code=' + code;
        utils.get('stock', querystr, function(rsp){
            all_stocks[code].buy_table = JSON.parse(rsp);
            if (typeof(cb) === 'function') {
                cb(code);
            };
        });
    }

    sellStock(date, code, price, ids, cb) {
        var fd = new FormData();
        fd.append('act', 'sell');
        fd.append('code', code);
        fd.append('date', date);
        fd.append('price', price);
        fd.append('id', utils.combineid(ids));

        utils.post('stock', fd, function() {
            if (typeof(cb) === 'function') {
                cb();
            };
        })
    }

    fetchSellData(code, cb) {
        var querystr = 'act=sell&code=' + code;
        utils.get('stock', querystr, function(rsp){
            all_stocks[code].sell_table = JSON.parse(rsp);
            if (typeof(cb) === 'function') {
                cb(code);
            };
        })
    }
}

var trade = new StockTrade();