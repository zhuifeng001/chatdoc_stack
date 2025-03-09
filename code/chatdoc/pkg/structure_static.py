consolidated_income_table = '合并利润表'
consolidated_balance_table = '合并资产负债表'
consolidated_cash_flow_table = '合并现金流量表'

three_table_set = {consolidated_income_table, consolidated_balance_table, consolidated_cash_flow_table}

consolidated_income_table_keys = ['营业外收入', '利息支出', '综合收益总额', '所得税费用', '投资收益', '研发费用', '利润总额', '净利润', '税金及附加', '营业外支出', '每股收益', '归属于母公司所有者的净利润',
                                  '销售费用', '公允价值变动收益', '归属于母公司股东的净利润', '管理费用', '利息收入', '营业收入', '对联营企业和合营企业的投资收益', '营业成本', '营业利润', '财务费用']

consolidated_balance_table_keys = ['衍生金融资产', '无形资产', '其他非流动金融资产', '资产总计', '流动资产',
                                   '非流动负债', '负债合计', '固定资产', '流动负债', '总负债', '货币资金', '应收款项融资', '存货', '应付职工薪酬']

consolidated_cash_flow_table_keys = ['收回投资收到的现金', '现金及现金等价物', '期末现金及现金等价物余额']

three_table_keys_map = {
    consolidated_income_table: consolidated_income_table_keys,
    consolidated_balance_table: consolidated_balance_table_keys,
    consolidated_cash_flow_table: consolidated_cash_flow_table_keys,
}


three_table_key_set = {*consolidated_income_table_keys, *consolidated_balance_table_keys, *consolidated_cash_flow_table_keys}
three_table_key_list = [*consolidated_income_table_keys, *consolidated_balance_table_keys, *consolidated_cash_flow_table_keys]


def match_fixed_tables(key: str):
    if key in consolidated_income_table_keys:
        return [consolidated_income_table]
    if key in consolidated_balance_table_keys:
        return [consolidated_balance_table]
    if key in consolidated_cash_flow_table_keys:
        return [consolidated_cash_flow_table]


def get_three_table_keys(table: str):
    return three_table_keys_map.get(table, [])


if __name__ == '__main__':
    print(three_table_set)
    print(three_table_key_set)
    print('存货' in three_table_key_set)
    print('存货2' in three_table_key_set)
    print(len(three_table_key_set), len(three_table_key_list))

    one_of_three_table = match_fixed_tables('无形资产')
    related_tables = [one_of_three_table] if one_of_three_table else '123'
    print(related_tables)
