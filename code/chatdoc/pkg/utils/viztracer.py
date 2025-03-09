'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-04-25 17:56:33
LastEditors: longsion
LastEditTime: 2024-04-25 17:56:56
'''


from functools import wraps
from viztracer import VizTracer


def viztrace(func):

    @wraps(func)
    def wrapper(*args, **kw):
        with VizTracer(output_file="optional.json"):
            result = func(*args, **kw)
            return result

    return wrapper
