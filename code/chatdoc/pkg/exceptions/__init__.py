'''
Author: longsion<xianglong_chen@intsig.net>
Date: 2024-06-04 16:57:16
LastEditors: longsion
LastEditTime: 2024-06-04 16:58:25
'''


class LLMException(Exception):
    pass


class LLMComplianceError(LLMException):
    pass
