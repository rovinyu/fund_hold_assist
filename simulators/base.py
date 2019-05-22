# Python 3
# -*- coding:utf-8 -*-

from decimal import *
from commons import *

class simulator_base(object):
    """
    the basic simulator
    """
    def __init__ (self, expect_return = Decimal("0.01")):
        self.cost_prepared = 1000
        self.expect_return = expect_return
        self.least_return = Decimal("0.0015")

    def setup(self, sim_host, trade):
        self.sim_host = sim_host
        self.trade = trade

    def simulate(self, sIdx, eIdx):
        # 每日定投
        self.curDate = self.sim_host.allDays[sIdx]
        self.buy()
        for x in range(sIdx + 1, eIdx):
            self.curDate = self.sim_host.allDays[x]
            if self.should_sell(self.expect_return):
                self.sell()
                continue

            if self.hold_too_long():
                self.sell(30)
                continue
            
            self.cost_prepared += 1000
            if self.should_buy():
                self.buy()

    def get_current_netval(self):
        netval = self.sim_host.sqldb.select(self.trade.fund_history_table, column_net_value,
        "%s = '%s'" % (column_date, self.curDate))
        return Decimal(str(netval[0][0]))

    def get_average_price(self):
        aver = self.sim_host.sqldb.select(gl_all_info_table, column_averagae_price,
        "%s = '%s'" % (column_code, self.sim_host.fund_code))
        return Decimal(str(aver[0][0]))

    def is_start_decreasing(self):
        grate = self.sim_host.sqldb.select(self.trade.fund_history_table, column_growth_rate,
        "%s = '%s'" % (column_date, self.curDate))
        prevDate = self.sim_host.allDays[self.sim_host.allDays.index(self.curDate) - 1]
        preGrate = self.sim_host.sqldb.select(self.trade.fund_history_table, column_growth_rate,
        "%s = '%s'" % (column_date, prevDate))
        return Decimal(str(grate[0][0])) < Decimal("0") and Decimal(str(preGrate[0][0])) >= Decimal("0")

    def should_buy(self):
        return True

    def buy(self):
        self.trade.buy(self.cost_prepared, self.curDate)
        self.cost_prepared = 0

    def should_sell(self, return_rate):
        netval = self.get_current_netval()
        aver = self.get_average_price()
        if aver == Decimal("0"):
            return False
        return self.is_start_decreasing() and (netval - aver) / aver >= return_rate

    def hold_too_long(self):
        portions_before_30_days = self.trade.portions_available_to_sell(30, self.curDate)
        return portions_before_30_days > Decimal("0") and self.should_sell(self.least_return)

    def sell(self, reDays = 7):
        portion_to_sell = self.trade.portions_available_to_sell(reDays, self.curDate)
        self.trade.sell(portion_to_sell, self.curDate)