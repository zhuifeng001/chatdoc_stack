'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-18 14:53:36
LastEditors: longsion
LastEditTime: 2024-05-11 11:21:13
'''
import os

default_path = __file__
DATA_DIR = os.getenv("DATA_PATH", os.path.dirname(default_path))
ROOT_DIR = os.path.dirname(default_path)
print("DATA_DIR", DATA_DIR, "ROOT_DIR", ROOT_DIR)
