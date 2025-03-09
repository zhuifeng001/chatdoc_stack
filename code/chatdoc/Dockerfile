FROM python:3.9

RUN ln -fs /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && echo "Asia/Shanghai" > /etc/timezone

RUN mkdir -p "/app"
RUN mkdir -p /data/parse/catalog /data/parse/doc-paser /data/parse/extract /data/file /data/parse/structure /data/parse/title

WORKDIR /app
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

COPY . /app
ENTRYPOINT ["gunicorn","-w","4","-b","0.0.0.0:5000","main:app","--error-logfile","-","--access-logfile","-", "--timeout", "600", "--keep-alive", "65"]


