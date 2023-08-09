from flask import Flask, request, jsonify, stream_with_context, Response
from jupyter_client import KernelManager
import uuid
import json
import subprocess  # 用于执行 shell 指令
from flask_cors import CORS, cross_origin
import logging
import atexit

logging.basicConfig(level="INFO")

app = Flask(__name__)
CORS(app)


# 存储所有活跃的 kernel
kernels = {}

@cross_origin()
@app.route('/execute', methods=['POST'])
def execute():
    execution_data = request.json.get('executionData')
    session_id = request.json.get('sessionId')

    logging.info(f"session_id: {session_id}",)

    if not execution_data:
        return jsonify({"error": "No execution data provided"}), 400

    if "code" in execution_data:
        action = "python"
        code_or_command = execution_data["code"]
    elif "command" in execution_data:
        action = "shell"
        code_or_command = execution_data["command"]
    else:
        return jsonify({"error": "Invalid execution data"}), 400

    # 为新 session 创建 kernel
    if not session_id:
        session_id = str(uuid.uuid4())

    if session_id not in kernels:
        km = KernelManager(kernel_name='python3')
        km.start_kernel()
        kernels[session_id] = km

    if action == "python":
        return Response(stream_with_context(run_code(code_or_command, kernels[session_id], session_id)), content_type="text/event-stream")
    else:  # action == "shell"
        return Response(stream_with_context(run_shell(code_or_command, session_id)), content_type="text/event-stream")


def shutdown_kernels():
    for session_id, km in kernels.items():
        try:
            km.shutdown_kernel()
            logging.info(f"Shutdown kernel for session {session_id}")
        except Exception as e:
            logging.error(f"Failed to shutdown kernel for session {session_id}. Error: {e}")


atexit.register(shutdown_kernels)


def run_shell(command, session_id):
    try:
        shell_output = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT).decode("utf-8")
        yield format_sse(shell_output, session_id, True)
    except Exception as e:
        yield format_sse(str(e), session_id, True)


def run_code(code, km, session_id):
    client = km.client()
    client.start_channels()
    client.allow_stdin = False

    output_received = False

    try:
        msg_id = client.execute(code)
        while True:
            msg = client.get_iopub_msg()
            msg_type = msg['msg_type']
            content = msg['content']

            if msg['parent_header'].get('msg_id') == msg_id:
                if msg_type in ['stream', 'execute_result', 'error']:
                    output_received = True
                    
                    if msg_type == 'stream':
                        yield format_sse(content['text'], session_id)
                    elif msg_type == 'execute_result':
                        yield format_sse(content['data'].get('text/plain', ''), session_id)
                    elif msg_type == 'error':
                        yield format_sse("\n".join(content['traceback']), session_id)
          
            if msg_type == 'status' and content.get('execution_state') == 'idle':
                if not output_received:
                    yield format_sse("No output from the code execution.", session_id)
                else:
                    yield format_sse("", session_id)
                break

    finally:
        yield format_sse("", session_id, True)
        pass


def format_sse(content: str, session_id:str, is_end: bool = False) -> str:
    data = {
        "content": content,
        "end": is_end,
        "session_id": session_id
    }
    message = json.dumps(data)
    logging.info(f"message: {message}",)
    return f"data: {message}\n\n"



if __name__ == '__main__':
    app.run(debug=True)
