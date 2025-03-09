from flask import jsonify


def return_data(code, data):
    if code == 500:
        data = {
            "err": data
        }
    return jsonify(
        {
            "code": code,
            "data": data
        }
    )


NO_FILE = {
    "code": 400,
    "msg": "无文件"
}

REQUIRE_ARGS = {
    "code": 400,
    "msg": "缺少参数"
}
