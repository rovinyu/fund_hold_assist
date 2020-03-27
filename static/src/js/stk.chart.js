var TradeType = {
    Buy:1,
    Sell:2
};

class TradeOption {
    constructor(p) {
        this.tradeDiv = document.createElement('div');
        p.appendChild(this.tradeDiv);
    }

    initialize() {
        this.tradeOptBar = new RadioAnchorBar();
        this.tradeOptBar.addRadio('买入', function(){
            stockHub.chartWrapper.tradeOption.setTradeOption(TradeType.Buy);
        });
        this.tradeOptBar.addRadio('卖出', function(){
            stockHub.chartWrapper.tradeOption.setTradeOption(TradeType.Sell);
        });
        this.tradeDiv.appendChild(this.tradeOptBar.container);

        var tradePanel = document.createElement('div');
        this.tradeDiv.appendChild(tradePanel);
        this.datePicker = document.createElement('input');
        this.datePicker.type = 'date';
        this.datePicker.value = utils.getTodayDate();
        tradePanel.appendChild(this.datePicker);
        this.portionInput = document.createElement('input');
        this.portionInput.placeholder = '份额';
        tradePanel.appendChild(this.portionInput);
        this.priceInput =document.createElement('input');
        this.priceInput.placeholder = '成交价格';
        tradePanel.appendChild(this.priceInput);
        this.submitBtn = document.createElement('button');
        this.submitBtn.textContent = '确定';
        this.submitBtn.onclick = function(e) {
            stockHub.chartWrapper.tradeOption.onSubmitClicked();
        }
        tradePanel.appendChild(this.submitBtn);

        this.tradeOptBar.selectDefault();
    }

    show() {
        this.tradeDiv.style.display = 'block';
    }

    hide() {
        this.tradeDiv.style.display = 'none';
    }

    setTradeOption(tradeTp) {
        this.tradeType = tradeTp;
        this.changeTradePanel(tradeTp == TradeType.Sell);
    }

    changeTradePanel(bSell) {
        if (bSell) {
            this.portionInput.style.display = "none";
            this.submitBtn.textContent = "卖出";
        } else {
            this.portionInput.style.display = "inline";
            this.submitBtn.textContent = "确定";
        }
    }

    onSubmitClicked() {
        var code = stockHub.chartWrapper.code;
        var date = this.datePicker.value;
        var price = parseFloat(this.priceInput.value);
        var ids = null;
        if (this.tradeType == TradeType.Buy) {
            var portion = parseInt(this.portionInput.value);
            trade.buyStock(date, code, price, portion, ids, function(){
                trade.fetchStockSummary(code, function() {
                    trade.fetchBuyData(code, function(c) {
                        stockHub.updateStockSummary(c);
                    });
                });
                stockHub.chartWrapper.tradeOption.portionInput.value = '';
                stockHub.chartWrapper.tradeOption.priceInput.value = '';
            });
        } else {
            var idRadios = document.getElementsByName('to_sell_radio_' + code);
            for (var i = 0; i < idRadios.length; i++) {
                if (idRadios[i].checked) {
                    ids = idRadios[i].value;
                    break;
                };
            };
            trade.sellStock(date, code, price, ids, function(){
                trade.fetchStockSummary(code, function() {
                    trade.fetchSellData(code, function(c) {
                        stockHub.updateStockSummary(c);
                    });
                });
                stockHub.chartWrapper.tradeOption.priceInput.value = '';
            });
        }
    }
}

class ChartWrapper {
    constructor(p) {
        this.container = document.createElement('div');
        p.appendChild(this.container);
    }

    initialize() {
        this.tradeOption = new TradeOption(this.container);
        this.tradeOption.initialize();
    }

    setParent(p) {
        this.container.parentElement.removeChild(this.container);
        p.appendChild(this.container);
    }

    hide() {
        this.container.style.display = 'none';
    }

    show() {
        this.container.style.display = 'block';
    }
}
