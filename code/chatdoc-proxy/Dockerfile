FROM python:3.9

RUN ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo "Asia/Shanghai" > /etc/timezone

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
COPY ./app /code/app
COPY ./config /code/config

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]