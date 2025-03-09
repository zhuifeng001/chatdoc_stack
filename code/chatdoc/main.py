
from pkg.response import return_data
from pkg.utils.logger import logger

from flask import Flask, request, Response, g
from opentelemetry.instrumentation.flask import FlaskInstrumentor
import json
import tracemalloc
from pkg.utils.thread_with_return_value import set_thread_context_by_flask

from pre_import import *


tracemalloc.start()

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)


@app.before_request
def set_request_id():
    from opentelemetry.trace import get_current_span
    # 赋予trace_id
    if not hasattr(g, 'request_id'):
        # g.request_id = str(uuid.uuid4()).replace("-", "")  # 使用uuid库生成随机UUID作为请求ID
        g.request_id = f"{get_current_span().context.trace_id:0x}"
    request.environ['REQUEST_ID'] = g.request_id  # 也可以存放在请求环境变量中

    set_thread_context_by_flask()


@app.route("/api/v1/analyst/parse", methods=["POST", "GET"])
def parse_analyst_file():
    from pkg.doc import process, Params, FileProcessException
    params = Params(**json.loads(request.get_data()))

    logger.info(f"parse analyst file params: {params.model_dump_json()}")

    try:
        result = process(params)
    except FileProcessException as fe:
        return return_data(500, {"msg": fe.message})
    except Exception as e:
        return return_data(500, {"msg": str(e)})

    return return_data(200, result.answer_response.model_dump())


@app.route("/api/v1/analyst/delete", methods=["POST"])
def delete_analyst_file():
    from pkg.doc import delete_process, DeleteParams
    params = DeleteParams(**json.loads(request.get_data()))
    logger.info(f"delete personal file params: {params.model_dump_json()}")
    try:
        if delete_process(params):
            return return_data(200, {"msg": "Delete success!"})
        else:
            return return_data(500, {"msg": "Delete failed!"})
    except Exception as e:
        return return_data(500, {"msg": str(e)})


@app.route("/api/v1/personal/parse", methods=["POST", "GET"])
def parse_personal_file():
    from pkg.personal_doc import process, Params, FileProcessException
    params = Params(**json.loads(request.get_data()))

    logger.info(f"parse personal file params: {params.model_dump_json()}")

    try:
        result = process(params)
    except FileProcessException as fe:
        return return_data(500, {"msg": fe.message})
    except Exception as e:
        return return_data(500, {"msg": str(e)})

    return return_data(200, result.answer_response.model_dump())


@app.route("/api/v1/personal/delete", methods=["POST"])
def delete_personal_file():
    from pkg.personal_doc import delete_process, DeleteParams
    params = DeleteParams(**json.loads(request.get_data()))
    logger.info(f"delete personal file params: {params.model_dump_json()}")
    try:
        if delete_process(params):
            return return_data(200, {"msg": "Delete success!"})
        else:
            return return_data(500, {"msg": "Delete failed!"})
    except Exception as e:
        return return_data(500, {"msg": str(e)})


@app.route("/api/v1/analyst/infer", methods=["POST", "GET"])
def infer_analyst():
    from pkg.analyst import process, Params
    params = Params(**json.loads(request.get_data()))
    params.compliance_check = False

    logger.info(f"analyst infer params: {params.model_dump_json()}")
    result = process(params)
    logger.info(f"resp trace_id: {result.trace_id}")
    if result.answer_response_iter:
        return Response(result.answer_response_iter, status=200, mimetype="text/event-stream", headers={"Connection": "keep-alive", "Cache-Control": "no-cache"})

    else:
        return return_data(200, result.answer_response.model_dump())


@app.route("/api/v1/personal/infer", methods=["POST", "GET"])
def infer_personal():
    from pkg.personal import process, Params
    params = Params(**json.loads(request.get_data()))

    params.compliance_check = False

    logger.info(f"personal infer params: {params.model_dump_json()}")
    result = process(params)
    logger.info(f"resp trace_id: {result.trace_id}")
    if result.answer_response_iter:
        return Response(result.answer_response_iter, status=200, mimetype="text/event-stream", headers={"Connection": "keep-alive", "Cache-Control": "no-cache"})

    else:
        return return_data(200, result.answer_response.model_dump())


@app.route("/api/v1/global/infer", methods=["POST"])
def infer_global():
    from pkg.global_ import process, Params
    params = Params(**json.loads(request.get_data()))

    params.compliance_check = False

    logger.info(f"global infer params: {params.model_dump_json()}")
    result = process(params)
    logger.info(f"resp trace_id: {result.trace_id}")
    if result.answer_response_iter:
        return Response(result.answer_response_iter, status=200, mimetype="text/event-stream", headers={"Connection": "keep-alive", "Cache-Control": "no-cache"})

    else:
        return return_data(200, result.answer_response.model_dump())


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
