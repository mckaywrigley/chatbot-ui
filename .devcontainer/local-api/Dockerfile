FROM python:3.11-buster


RUN pip3 --disable-pip-version-check --no-cache-dir \
      install \
        llama-cpp-python \
        uvicorn \
        fastapi \
        sse_starlette \
        typing_extensions


RUN apt-get update && apt-get install -y git
RUN git clone https://github.com/abetlen/llama-cpp-python.git /app

EXPOSE 8000

ADD ./entrypoint.sh /
ENTRYPOINT [ "sh", "/entrypoint.sh" ]
