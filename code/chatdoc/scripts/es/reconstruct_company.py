'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-11 16:44:40
LastEditors: longsion
LastEditTime: 2024-05-11 16:45:56
'''
import os
from pkg.es.es_company import CompanyES, global_es


def insert_demo_data(index_name, demo_path: str):
    import pandas as pd
    import uuid
    from itertools import zip_longest

    df = pd.read_excel(demo_path)

    companys = [
        dict(
            eid=eid if not pd.isna(eid) else "",
            name=name if not pd.isna(name) else "",
            short_name=short_names if not pd.isna(short_names) else "",
            alias=list(filter(lambda x: x, (alias if not pd.isna(alias) else "").split(",")))
        )
        # for eid, name, short_names, alias in zip_longest(df["eid"], df["name"], df["short_names"], df["alias"]) if not eid or pd.isna(eid)
        for eid, name, short_names, alias in zip_longest(df["eid"], df["name"], df["short_names"], df["alias"])
    ]

    batch_size = 1000
    for i in range(0, len(companys), batch_size):
        global_es.insert(
            index_name, [
                {
                    "_index": index_name,
                    "_source": {
                        "uuid": str(uuid.uuid4()).replace("-", ""),
                        "name": company["name"],
                        "eid": company["eid"],
                        "alias": company["alias"]
                        + [company["short_name"]] if company["short_name"] else [],
                    }
                }
                for company in companys[i:i + batch_size]
            ]
        )


if __name__ == '__main__':
    company_es = CompanyES()
    company_es.delete_index()
    company_es.create_index()
    insert_demo_data(company_es.index_name, os.path.join(os.path.dirname(__file__), "../../assets/上市公司简称.xlsx"))
