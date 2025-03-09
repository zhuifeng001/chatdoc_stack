'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-17 16:36:31
LastEditors: longsion
LastEditTime: 2024-07-09 11:50:31
'''

import uuid
from pkg.config import config
from pkg.es import global_es, EsBaseItem, es_index_default_settings
import requests

from pkg.utils import ensure_list


class ESCompanyObject(EsBaseItem):
    eid: str = None
    uuid: str = None
    name: str = None
    alias: list[str] = []


class CompanyES(object):

    @property
    def index_name(self):
        return config["es"]["index_company"]

    @property
    def settings(self):
        return {
            "index": es_index_default_settings
        }

    @property
    def properties(self):
        return {
            "uuid": {
                "type": "keyword",
                "ignore_above": 100
            },
            "eid": {
                "type": "keyword",
                "ignore_above": 100
            },
            "name": {
                "type": "text"
            },
            "alias": {
                "type": "text"
            },
            "created_at": {
                "type": "date",  # 字段类型为日期
                "format": "yyyy-MM-dd HH:mm:ss"  # 日期格式示例，根据实际需求调整
            }
        }

    def create_index(self):
        global_es.create_index(self.index_name, dict(settings=self.settings, mappings=dict(properties=self.properties)))

    def search_company(self, search_text, size=10) -> list[ESCompanyObject]:
        hits = global_es.search(self.index_name, {
            "_source": ["eid", "name", "alias", "uuid"],
            "size": size,
            "query": {
                "multi_match": {
                    "query": search_text,
                    "fields": ["name^2", "alias^1"],
                    "type": "best_fields",
                    "tie_breaker": 0.7
                }
            }
        })
        return [
            ESCompanyObject(
                uuid=hit["_source"]["uuid"],
                eid=hit["_source"]["eid"],
                name=hit["_source"]["name"],
                alias=ensure_list(hit["_source"]["alias"]),
            ) for hit in hits
        ]

    def search_company_by_eid(self, eid) -> list[ESCompanyObject]:
        hits = global_es.search(self.index_name, {
            "_source": ["eid", "name", "alias", "uuid"],
            "query": {
                "bool": {
                    "filter": [
                        dict(term=dict(eid=eid))
                    ]
                }
            }
        })
        return [
            ESCompanyObject(
                uuid=hit["_source"]["uuid"],
                eid=hit["_source"]["eid"],
                name=hit["_source"]["name"],
                alias=ensure_list(hit["_source"]["alias"]),
            ) for hit in hits
        ]

    def search_company_by_eids_or_uids(self, ids) -> list[ESCompanyObject]:
        hits = global_es.search(self.index_name, {
            "_source": ["eid", "name", "alias", "uuid"],
            "query": {
                "bool": {
                    "minimum_should_match": 1,
                    "should": [
                        {"terms": {"eid": ids}},
                        {"terms": {"uuid": ids}}
                    ]
                }
            },
            "size": 1.5 * len(ids)
        })
        return [
            ESCompanyObject(
                uuid=hit["_source"]["uuid"],
                eid=hit["_source"]["eid"],
                name=hit["_source"]["name"],
                alias=ensure_list(hit["_source"]["alias"]),
            ) for hit in hits
        ]

    def delete_index(self):
        url = config["es"]["hosts"] + "/" + self.index_name
        requests.delete(url)
        self.wait_delete_index_done()

    def wait_delete_index_done(self):
        import time

        retry_times = 50
        while retry_times > 0:
            flag = (
                not global_es.conn.indices.exists(self.index_name)
            )

            if flag:
                break

            retry_times -= 1
            time.sleep(1)

        if retry_times == 0:
            raise Exception("wait_delete_done timeout")

    def insert_company(self, company: ESCompanyObject) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": company.model_dump()
            }
        ])

        pass

    def insert_companys(self, companys: list[ESCompanyObject]) -> bool:
        """
        插入数据
        :param data:
        :return:
        """
        global_es.insert(self.index_name, docs=[
            {
                "_index": self.index_name,
                "_source": company.model_dump()
            } for company in companys
        ])


if __name__ == "__main__":
    company_es = CompanyES()
    company_es.insert_company(ESCompanyObject(
        uuid=str(uuid.uuid4()),
        eid="e8cdf5e0-97ad-4e1e-a8e4-29358f8a9866",
        name="上海合合信息科技股份有限公司",
        alias=["合合", "合合信息"]
    ))
