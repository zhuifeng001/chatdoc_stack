'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-09-13 16:56:27
LastEditors: longsion
LastEditTime: 2024-09-13 17:05:39
'''


from pkg.es.es_p_doc_table import PDocTableES
from pkg.es.es_p_doc_item import PDocItemES
from pkg.es.es_p_doc_fragment import PDocFragmentES
from pkg.es.es_p_file import PFileES
from pkg.es import global_es, es_index_default_settings


def create_test_env_indexes():
    for es_obj in [PDocTableES(), PDocItemES(), PDocFragmentES(), PFileES()]:
        global_es.create_index(es_obj.index_name, dict(settings=es_index_default_settings, mappings=dict(properties=es_obj.properties)))


def create_indexes():
    PDocTableES().create_index()
    PDocItemES().create_index()
    PDocFragmentES().create_index()
    PFileES().create_index()


create_test_env_indexes()
