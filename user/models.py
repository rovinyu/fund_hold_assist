# Python 3
# -*- coding:utf-8 -*-

from datetime import datetime, timedelta
from decimal import Decimal
import sys
sys.path.append("../..")
from utils import *
from history import *
from user.user_fund import *
from user.user_stock import *

class User():
    def __init__(self, id, name, email, password=None, st = None, parent = None):
        self.id = id
        self.name = name
        self.email = email
        self.password = password
        self.sub_table = st
        self.parent = parent
        self.funddb = None
        self.stockdb = None

    def fund_center_db(self):
        if not self.funddb:
            self.funddb = SqlHelper(password = db_pwd, database = fund_db_name)
        return self.funddb

    def stock_center_db(self):
        if not self.stockdb:
            self.stockdb = SqlHelper(password = db_pwd, database = stock_db_name)
        return self.stockdb

    def is_admin(self):
        return self.id == 11

    def funds_info_table(self):
        return "u" + str(self.id) + "_" + gl_fund_info_table

    def stocks_info_table(self):
        return "u" + str(self.id) + "_stocks";

    def stocks_earned_table(self):
        return "u" + str(self.id) + "_earned";

    def to_string(self):
        return 'id: ' + str(self.id) + ' name: ' + self.name + ' email: ' + self.email;

    def add_budget(self, code, budget, date = ""):
        sqldb = self.fund_center_db()
        uf = UserFund(self, code)
        uf.add_budget(budget, date)

    def fix_cost_portion_hold(self, code):
        uf = UserFund(self, code)
        uf.fix_cost_portion_hold()

    def buy(self, code, date, cost, budget_dates = None, rollin_date = None):
        uf = UserFund(self, code)
        uf.buy(date, cost, budget_dates, rollin_date)

    def buy_not_confirm(self, code, date, cost, budget_dates = None, rollin_date = None):
        uf = UserFund(self, code)
        uf.add_buy_rec(date, cost, budget_dates, rollin_date)

    def confirm_buy(self, code, date):
        uf = UserFund(self, code)
        uf.confirm_buy_rec(date)

    def fix_buy_rec(self, code, date, cost):
        uf = UserFund(self, code)
        uf.fix_buy_rec(date, cost)

    def sell_by_dates(self, code, date, buydates):
        uf = UserFund(self, code)
        uf.sell_by_dates(date, buydates)

    def sell_not_confirm(self, code, date, buydates):
        uf = UserFund(self, code)
        uf.add_sell_rec(date, buydates)

    def confirm_sell(self, code, date):
        uf = UserFund(self, code)
        uf.confirm_sell_rec(date)

    def update_funds(self):
        sqldb = self.fund_center_db()
        fundcodes = sqldb.select(self.funds_info_table(), [column_code])
        if not fundcodes:
            return

        for c, in fundcodes:
            uf = UserFund(self, c)
            uf.update_history()

    def forget_fund(self, code):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()) or not sqldb.isExistTableColumn(self.funds_info_table(), column_keepeyeon):
            return

        sqldb.update(self.funds_info_table(), {column_keepeyeon:str(0)}, {column_code: str(code)})

    def confirm_buy_sell(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            return
            
        fundcodes = sqldb.select(self.funds_info_table(), [column_code])
        if not fundcodes:
            return

        for c, in fundcodes:
            uf = UserFund(self, c)
            uf.confirm_buy_sell()

    def get_holding_funds_summary(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            print("can not find fund info DB.")
            return {}

        fund_codes = sqldb.select(self.funds_info_table(), [column_code])

        fund_json = {}
        for (c, ) in fund_codes:
            uf = UserFund(self, c)
            fund_json_obj = None
            if uf.still_hold() and uf.keep_eye_on:
                fund_json_obj = uf.get_fund_summary()

            if fund_json_obj:
                fund_json[c] = fund_json_obj

        return fund_json

    def get_holding_funds_json(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            print("can not find fund info DB.")
            return

        fund_json = self.get_holding_funds_summary()
        if not isinstance(fund_json, dict):
            return fund_json

        for c in fund_json:
            fund_json_obj = fund_json[c]

            fg = FundGeneral(sqldb, c)
            uf = UserFund(self, c)

            budget_arr = uf.get_budget_arr()
            if budget_arr and len(budget_arr) > 0:
                fund_json_obj["budget_table"] = budget_arr

            if uf.cost_hold and uf.average:
                rollin_arr = uf.get_roll_in_arr(fg)
                if rollin_arr and len(rollin_arr) > 0:
                    fund_json_obj["sell_table"] = rollin_arr

                buy_arr = uf.get_buy_arr(fg)
                if buy_arr and len(buy_arr) > 0:
                    fund_json_obj["buy_table"] = buy_arr

        return fund_json

    def get_holding_funds_hist_data(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            print("can not find fund info DB.")
            return


        fund_codes = sqldb.select(self.funds_info_table(), [column_code])

        funds_holding = []
        for (c, ) in fund_codes:
            uf = UserFund(self, c)
            if uf.keep_eye_on and uf.still_hold():
                funds_holding.append(c)

        indexs_holding = set()
        all_hist_data = []
        for c in funds_holding:
            fg = FundGeneral(sqldb, c)
            if fg.index_code:
                indexs_holding.add(fg.index_code)
            fund_his_data = fg.get_fund_hist_data()
            all_hist_data = self.merge_hist_data(all_hist_data, fund_his_data)
            
        for c in indexs_holding:
            ig = IndexGeneral(sqldb, c)
            index_his_data = ig.get_index_hist_data()
            all_hist_data = self.merge_hist_data(all_hist_data, index_his_data)

        return all_hist_data

    def merge_hist_data(self, hist_data1, hist_data2):
        if len(hist_data2) < 1:
            return hist_data1
        if len(hist_data1) < 1:
            return hist_data2

        basic_his_data = hist_data1
        extend_his_data = hist_data2
        if len(hist_data1) < len(hist_data2):
            basic_his_data = hist_data2
            extend_his_data = hist_data1

        all_dates = [];
        for i in range(1, len(basic_his_data)):
            all_dates.append(basic_his_data[i][0])

        for i in range(1,len(extend_his_data)):
            if extend_his_data[i][0] in all_dates:
                continue
            d = extend_his_data[i][0]
            for j in range(0, len(all_dates)):
                if d > all_dates[j]:
                    if j == len(all_dates) - 1:
                        all_dates.append(d)
                        break
                    if d < all_dates[j+1]:
                        all_dates.insert(j+1, d)
                        break
                else:
                    all_dates.insert(0, d)
                    break;
        all_data = [["date"]]
        for x in all_dates:
            all_data.append([x])
        all_data = self.merge_to_basic(all_data, basic_his_data)
        all_data = self.merge_to_basic(all_data, extend_his_data)
        return all_data

    def merge_to_basic(self, basic_his_data, extend_his_data):
        header = basic_his_data[0]
        for x in extend_his_data[0]:
            if x != 'date':
                header += x,

        all_hist_data = []
        all_hist_data.append(header)
        basic_his_data = basic_his_data[1:]
        extend_his_data = extend_his_data[1:]

        for basic_data in basic_his_data:
            row = list(basic_data)
            date = row[0]
            find_netvalue_same_date = False
            for ext_data in extend_his_data:
                fdate = ext_data[0]
                if fdate == date:
                    for x in ext_data[1:]:
                        row.append(x)
                    find_netvalue_same_date = True
                    break
                if fdate < date:
                    continue
                if fdate > date:
                    break
            if not find_netvalue_same_date:
                for x in extend_his_data[1][1:]:
                    row.append('')

            all_hist_data.append(row)

        return all_hist_data

    def get_holding_funds_stats(self):
        sqldb = self.fund_center_db()
        if not sqldb.isExistTable(self.funds_info_table()):
            print("can not find fund info DB.")
            return {}

        fund_codes = sqldb.select(self.funds_info_table(), [column_code])

        fund_stats = {}
        for (c, ) in fund_codes:
            uf = UserFund(self, c)
            fund_stats_obj = None
            if uf.ever_hold():
                fund_stats_obj = uf.get_holding_stats()

            if fund_stats_obj:
                fund_stats[c] = fund_stats_obj

        return fund_stats

    def get_holding_stocks_summary(self):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_info_table()):
            print("can not find stock info DB.")
            return {}

        codes = sqldb.select(self.stocks_info_table(), [column_code])

        stocks_json = {}
        for (c, ) in codes:
            us = UserStock(self, c)
            stock_json_obj = None
            if us.still_hold() and us.keep_eye_on:
                stock_json_obj = us.get_stock_summary()

            if stock_json_obj:
                stocks_json[c] = stock_json_obj

        return stocks_json

    def interest_stock(self, code):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_info_table()) or not sqldb.isExistTableColumn(self.stocks_info_table(), column_keepeyeon):
            return

        stk = sqldb.select(self.stocks_info_table(), '*', "%s = '%s'" % (column_code, str(code)))
        if stk is None or len(stk) == 0:
            sqldb.insert(self.stocks_info_table(), {column_code: str(code), column_keepeyeon: str(1)})
        else:
            sqldb.update(self.stocks_info_table(), {column_keepeyeon: str(1)}, {column_code: str(code)})

    def forget_stock(self, code):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_info_table()) or not sqldb.isExistTableColumn(self.stocks_info_table(), column_keepeyeon):
            return

        sqldb.update(self.stocks_info_table(), {column_keepeyeon:str(0)}, {column_code: str(code)})

    def get_stocks_stats(self):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_info_table()):
            print("can not find stock info DB.")
            return {}

        stock_codes = sqldb.select(self.stocks_info_table(), [column_code])

        stock_stats = {}
        for (c, ) in stock_codes:
            us = UserStock(self, c)
            stock_stats_obj = None
            if us.ever_hold():
                stock_stats_obj = us.get_holding_stats()

            if stock_stats_obj:
                stock_stats[c] = stock_stats_obj

        return stock_stats

    def get_interested_stocks_code(self):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_info_table()):
            print("can not find stock info DB.")
            return None

        codes = sqldb.select(self.stocks_info_table(), [column_code], "%s = '%s'" % (column_keepeyeon, str(1)))

        keo_codes = []
        for (c, ) in codes:
            keo_codes.append(c)
        return keo_codes

    def set_earned(self, date, earned):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_earned_table()):
            attrs = {column_date:'varchar(20) DEFAULT NULL',column_earned:'double(8,2) DEFAULT NULL', column_total_earned:'double(16,2) DEFAULT NULL'}
            constraint = 'PRIMARY KEY(`id`)'
            sqldb.createTable(self.stocks_earned_table(), attrs, constraint)
            sqldb.insert(self.stocks_earned_table(), {column_date: date, column_earned: str(earned), column_total_earned:str(earned)})
        else:
            totalEarned = 0
            lastEarned = sqldb.select(self.stocks_earned_table(), [column_date, column_total_earned], order = ' ORDER BY %s DESC LIMIT 1' % column_date)
            if lastEarned is None or len(lastEarned) == 0:
                return
            (dt, totalEarned), = lastEarned
            if dt == date:
                print("earned already set for", date)
                return
            totalEarned += earned
            sqldb.insert(self.stocks_earned_table(), {column_date: date, column_earned: str(earned), column_total_earned: str(totalEarned)})

    def get_earned_arr(self, all_earned, days = 0):
        startIdx = 0
        if days > 0:
            startIdx = len(all_earned) - days

        earr = []
        date_conv = DateConverter()
        for x in range(startIdx, len(all_earned)):
            earr.append({'dt':date_conv.days_since_2000(all_earned[x][0]), 'ed':all_earned[x][1]})
        return earr

    def get_this_yr_earned(self, all_earned):
        lastRow = all_earned[-1]
        year = datetime.strptime(lastRow[0], "%Y-%m-%d").year
        total = None
        earned_obj = {}
        earr = []
        date_conv = DateConverter()
        for (d, e, t) in all_earned:
            if total is None and not datetime.strptime(d, "%Y-%m-%d").year == year:
                continue
            if total is None:
                total = t
                earned_obj['tot'] = total
            earr.append({'dt':date_conv.days_since_2000(d), 'ed':e})
        earned_obj['e_a'] = earr;
        return earned_obj

    def get_earned(self, days):
        sqldb = self.stock_center_db()
        if not sqldb.isExistTable(self.stocks_earned_table()):
            print('can not find earned table', self.stocks_earned_table())
            return {}

        all_earned = sqldb.select(self.stocks_earned_table(), [column_date, column_earned, column_total_earned])
        earned_obj = {}
        if days < 0 or days >= len(all_earned):
            earned_obj['tot'] = all_earned[0][2]
            earned_obj['e_a'] = self.get_earned_arr(all_earned)
        elif days > 0:
            earned_obj['tot'] = all_earned[len(all_earned) - days][2]
            earned_obj['e_a'] = self.get_earned_arr(all_earned, days)
        else:
            earned_obj = self.get_this_yr_earned(all_earned)

        return earned_obj

    def get_interested_stocks_his(self):
        sd = StockDumps()
        return sd.get_his(self.get_interested_stocks_code())

class UserModel():
    def __init__(self):
        self.tablename = 'users'
        self.sqldb = SqlHelper(password = db_pwd, database = general_db_name)
        if self.sqldb.isExistTable(self.tablename):
            self.check_column('sub_table', "varchar(255) DEFAULT NULL")
            self.check_column('parent_account', "varchar(16) DEFAULT NULL")

    def add_new(self, name, password, email):
        if not self.sqldb.isExistTable(self.tablename):
            attrs = {'name':'varchar(255) DEFAULT NULL', 'password':"varchar(255) DEFAULT NULL",  'email':"varchar(255) DEFAULT NULL", 'sub_table':"varchar(255) DEFAULT NULL", 'parent_account':"varchar(16) DEFAULT NULL"}
            constraint = 'PRIMARY KEY(`id`)'
            self.sqldb.createTable(self.tablename, attrs, constraint)
        (result,), = self.sqldb.select(self.tablename, 'count(*)', ["email = '%s'" % email])
        if result and result != 0:
            user = self.user_by_email(email)
            print( user.to_string(), "already exists!")
            return user
        self.sqldb.insert(self.tablename, {'name':name, 'password':password, 'email':email})
        return self.user_by_email(email)

    def check_column(self, col, val):
        if not self.sqldb.isExistTableColumn(self.tablename, col):
            self.sqldb.addColumn(self.tablename, col, val)

    def user_by_id(self, id):
        result = self.sqldb.select(self.tablename, "*", ["id = '%s'" % id])
        if not result:
            return None

        (id, name, password, email, st, parent), = result
        return User(id, name, email, password, st, parent)

    def user_by_email(self, email):
        result = self.sqldb.select(self.tablename, "*", ["email = '%s'" % email])
        if not result:
            return None
        (id, name, password, email, st, parent), = result
        return User(id, name, email, password, st, parent)

    def all_users(self):
        result = self.sqldb.select(self.tablename, ['id'])
        users = []
        for i, in result:
            users.append(self.user_by_id(i))
        return users

    def set_password(self, user, password):
        user.password = password
        self.sqldb.update(self.tablename, {'password':password}, {'id' : str(user.id)})

    def check_password(self, user, password):
        return password == user.password

    def get_bind_accounts(self, email):
        user = self.user_by_email(email)
        sub_table = user.sub_table
        accounts = []
        if sub_table and self.sqldb.isExistTable(sub_table):
            subs = self.sqldb.select(sub_table, 'subid')
            if subs:
                for sid in subs:
                    user = self.user_by_id(sid)
                    accounts.append({'id':user.id, 'name':user.name, 'email':user.email})
        return accounts

    def get_all_combined_users(self, user):
        parent = user
        if user.parent:
            parent = self.user_by_id(user.parent)

        users = [parent]
        sub_table = parent.sub_table
        if sub_table and self.sqldb.isExistTable(sub_table):
            subs = self.sqldb.select(sub_table, 'subid')
            if subs:
                for sid in subs:
                    users.append(self.user_by_id(sid))
        return users

    def is_combined(self, u1, u2):
        users = self.get_all_combined_users(u1)
        for u in users:
            if u.id == u2.id:
                return True
        return False

    def bind_account(self, user, sub):
        if not user or not sub:
            return

        sub_table = user.sub_table
        parent = user.parent

        if not sub_table and not parent:
            sub_table = 'u' + str(user.id) + '_subtable'
            self.sqldb.update(self.tablename, {'sub_table': sub_table}, {'id' : str(user.id)})

        if not sub_table:
            return

        if sub.parent or sub.sub_table:
            return

        if not self.sqldb.isExistTable(sub_table):
            attrs = {'subid':"varchar(16) DEFAULT NULL"}
            constraint = 'PRIMARY KEY(`id`)'
            self.sqldb.createTable(sub_table, attrs, constraint)

        self.sqldb.insert(sub_table, {'subid':str(sub.id)})
        self.sqldb.update(self.tablename, {'parent_account': str(user.id)}, {'id' : str(sub.id)})

    def get_parent(self, email):
        user = self.user_by_email(email)
        if user.parent:
            parent = self.user_by_id(user.parent)
            return {'id': parent.id, 'name': parent.name, 'email': parent.email}
        return {}

    def merge_stats(self, st1, st2):
        st = {}
        st['name'] = st1['name']
        st['cost'] = st1['cost'] + st2['cost']
        st['ewh'] = round(st1['ewh'] + st2['ewh'], 2)
        st['cs'] = st1['cs'] + st2['cs']
        st['acs'] = st1['acs'] + st2['acs']
        st['hds'] = st1['hds'] + st2['hds']
        st['srct'] = st1['srct'] + st2['srct']
        return st

    def get_bind_users_fundstats(self, user):
        users = self.get_all_combined_users(user)
        fund_stats = {}
        for u in users:
            u_stats = u.get_holding_funds_stats()
            for c in u_stats:
                if fund_stats.__contains__(c):
                    fund_stats[c] = self.merge_stats(fund_stats[c], u_stats[c])
                else:
                    fund_stats[c] = u_stats[c]
        return fund_stats
