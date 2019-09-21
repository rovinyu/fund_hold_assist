# Python 3
# -*- coding:utf-8 -*-

from datetime import datetime, timedelta
from decimal import Decimal
import sys
sys.path.append("../..")
from utils import *

class User():
    def __init__(self, id, name, email, password=None):
        self.id = id
        self.name = name
        self.email = email
        self.password = password
        self.funddb = None

    def fund_center_db(self):
        if not self.funddb:
            self.funddb = SqlHelper(password = db_pwd, database = "fund_center")
        return self.funddb

    def funds_info_table(self):
        return "u"+ str(self.id) + "_" + gl_fund_info_table

    def to_string(self):
        return 'id: ' + str(self.id) + ' name: ' + self.name + ' email: ' + self.email;

    def add_budget(self, code, budget, date = ""):
        sqldb = self.fund_center_db()
        uf = UserFund(self, code)
        fg = FundGeneral(sqldb, code)

        his_db_table = fg.history_table
        if not his_db_table:
            print("can not get history table.")
            return

        budget_table = uf.budget_table
        if not sqldb.isExistTable(budget_table):
            attrs = {column_date:'varchar(20) DEFAULT NULL',column_net_value:'varchar(20) DEFAULT NULL',column_budget:'varchar(10) DEFAULT NULL', column_consumed:'tinyint(1) DEFAULT 0'}
            constraint = 'PRIMARY KEY(`id`)'
            sqldb.creatTable(budget_table, attrs, constraint)

        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        bu_rec = sqldb.select(budget_table, conds = "%s = '%s'" % (column_date, date))
        if bu_rec:
            ((bu_rec),) = bu_rec
        if bu_rec:
            print("already add budget", bu_rec)
            return

        netvalue = fg.netvalue_by_date(date)
        if not netvalue:
            print("no value on", date)
            return

        sqldb.insert(budget_table, {column_date:date, column_net_value:str(netvalue), column_budget: str(budget)})
        uf.delete_cosumed()

    def fix_cost_portion_hold(self, code):
        uf = UserFund(self, code)
        uf.fix_cost_portion_hold()

    def get_holding_funds_json(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            print("can not find fund info DB.")
            return

        fund_codes = sqldb.select(self.funds_info_table(), [column_code])

        fund_json = {}
        for (c, ) in fund_codes:
            fund_json_obj = {}
            ppg = 1 if not ppgram.__contains__(c) else ppgram[c]
            fg = FundGeneral(sqldb, c)
            uf = UserFund(self, c)

            budget_arr = uf.get_budget_arr(ppg)
            if budget_arr and len(budget_arr) > 0:
                fund_json_obj["budget"] = budget_arr

            if uf.cost_hold and uf.average:
                fund_json_obj["name"] = fg.name
                fund_json_obj["ppg"] = ppg
                fund_json_obj["short_term_rate"] = fg.short_term_rate
                fund_json_obj["cost"] = uf.cost_hold
                fund_json_obj["averprice"] = str(Decimal(str(uf.average)) * ppg)
                fund_json_obj["latest_netvalue"] = fg.latest_netvalue()
                fund_json_obj["last_day_earned"] = uf.last_day_earned(fg.history_table)
                fund_json_obj["earned_while_holding"] = round((float(fg.latest_netvalue()) - float(uf.average)) * float(uf.portion_hold), 2)

                rollin_arr = uf.get_roll_in_arr(fg, ppg)
                if rollin_arr and len(rollin_arr) > 0:
                    fund_json_obj["rollin"] = rollin_arr

                fund_json_obj["morethan7day"] = uf.get_portions_morethan_7day(fg, ppg)
                buy_arr = uf.get_buy_arr(fg)
                if buy_arr and len(buy_arr) > 0:
                    fund_json_obj["buy_table"] = buy_arr

            if fund_json_obj:
                fund_json[c] = fund_json_obj

        return fund_json

    def get_holding_funds_hist_data(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            print("can not find fund info DB.")
            return

        fund_codes = sqldb.select(self.funds_info_table(), [column_code])

        funds_holding = []
        for (c, ) in fund_codes:
            fg = FundGeneral(sqldb, c)
            uf = UserFund(self, c)
            if uf.cost_hold and uf.average:
                funds_holding.append((fg.code, fg.history_table))

        szzs_code = "sz000001"
        szzs_his_tbl = "i_ful_his_000001"
        all_hist_data = [["date", szzs_code]]
        if not sqldb.isExistTable(szzs_his_tbl):
            print(szzs_his_tbl,"not exist.")
            return

        szzs_his_data = sqldb.select(szzs_his_tbl, [column_date, column_close, column_p_change])
        funds_his_data = []
        for (c, t) in funds_holding:
            all_hist_data[0].append(c)
            funds_his_data.append(sqldb.select(t, [column_date, column_net_value, column_growth_rate]))

        for (date, close, p_change) in szzs_his_data:
            row = [date, round(float(close), 2), round(float(p_change), 2) if not p_change == "None" else '']
            for fund_his in funds_his_data:
                find_netvalue_same_date = False
                for (fdate, netvalue, growth) in fund_his:
                    if fdate == date:
                        row.append(netvalue)
                        row.append(round(float(100 * growth), 2))
                        find_netvalue_same_date = True
                        break
                    if fdate < date:
                        continue
                    if fdate > date:
                        break
                if not find_netvalue_same_date:
                    row.append('')
                    row.append('')
            all_hist_data.append(row)

        return all_hist_data

class UserModel():
    def __init__(self, sqldb):
        self.tablename = 'users'
        self.sqldb = sqldb

    def add_new(self, name, password, email):
        if not self.sqldb.isExistTable(self.tablename):
            attrs = {'name':'varchar(255) DEFAULT NULL', 'password':"varchar(255) DEFAULT NULL",  'email':"varchar(255) DEFAULT NULL"}
            constraint = 'PRIMARY KEY(`id`)'
            self.sqldb.creatTable(self.tablename, attrs, constraint)
        (result,), = self.sqldb.select(self.tablename, 'count(*)', ["email = '%s'" % email])
        if result and result != 0:
            user = self.user_by_email(email)
            print( user.to_string(), "already exists!")
            return user
        self.sqldb.insert(self.tablename, {'name':name, 'password':password, 'email':email})
        return self.user_by_email(email)

    def user_by_id(self, id):
        result = self.sqldb.select(self.tablename, "*", ["id = '%s'" % id])
        if not result:
            return None

        (id, name, password, email), = result
        return User(id, name, email, password)

    def user_by_email(self, email):
        result = self.sqldb.select(self.tablename, "*", ["email = '%s'" % email])
        if not result:
            return None
        (id, name, password, email), = result
        return User(id, name, email, password)

    def set_password(self, user, password):
        user.password = password
        self.sqldb.update(self.tablename, {'password':password}, {'id' : str(user.id)})

    def check_password(self, user, password):
        return password == user.password
