'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-05-21 16:37:23
LastEditors: longsion
LastEditTime: 2024-07-10 20:28:20
'''

from pkg.es.es_doc_table import DocTableES
from pkg.es.es_doc_item import DocItemES
from pkg.es.es_doc_fragment import DocFragmentES
from pkg.es.es_file import FileES
from pkg.es.es_company import CompanyES


def create_indexes():
    DocTableES().create_index()
    DocItemES().create_index()
    DocFragmentES().create_index()
    # FileES().create_index()
    # CompanyES().create_index()


create_indexes()
