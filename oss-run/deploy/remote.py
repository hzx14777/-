#!/usr/bin/env python3
"""极简远程执行/传输工具（参数化登录，不落盘保存口令）

用法:
    python remote.py exec "<shell 命令>"
    python remote.py put  <本地路径> <远程路径>
    python remote.py get  <远程路径> <本地路径>

连接参数取自环境变量: YJ_HOST / YJ_USER / YJ_PASS / YJ_PORT(默认22)
"""
import os
import sys

import paramiko

HOST = os.environ.get("YJ_HOST", "8.134.60.240")
PORT = int(os.environ.get("YJ_PORT", "22"))
USER = os.environ.get("YJ_USER", "root")
PWD = os.environ.get("YJ_PASS", "")


def connect(timeout=20):
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(
        hostname=HOST,
        port=PORT,
        username=USER,
        password=PWD,
        timeout=timeout,
        banner_timeout=timeout,
        auth_timeout=timeout,
        look_for_keys=False,
        allow_agent=False,
    )
    return c


def do_exec(cmd, timeout=600):
    c = connect()
    try:
        stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout, get_pty=False)
        out = stdout.read().decode("utf-8", "replace")
        err = stderr.read().decode("utf-8", "replace")
        code = stdout.channel.recv_exit_status()
        if out:
            sys.stdout.write(out)
        if err:
            sys.stderr.write(err)
        return code
    finally:
        c.close()


def do_put(local, remote):
    """流式上传（不用 sftp.put，避开 paramiko 5.x 的 open 异常）"""
    c = connect()
    try:
        sftp = c.open_sftp()
        total = os.path.getsize(local)
        sent = 0
        with open(local, "rb") as fsrc, sftp.open(remote, "wb") as fdst:
            fdst.set_pipelined(True)
            while True:
                chunk = fsrc.read(262144)
                if not chunk:
                    break
                fdst.write(chunk)
                sent += len(chunk)
        size = sftp.stat(remote).st_size
        sftp.close()
        if size != total:
            print(f"uploaded {local} -> {remote} but size mismatch: {size} != {total}")
            return 1
        print(f"uploaded {local} -> {remote} ({size} bytes)")
        return 0
    finally:
        c.close()


def do_get(remote, local):
    c = connect()
    try:
        sftp = c.open_sftp()
        sftp.get(remote, local)
        sftp.close()
        print(f"downloaded {remote} -> {local}")
        return 0
    finally:
        c.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    action = sys.argv[1]
    if action == "exec":
        sys.exit(do_exec(sys.argv[2]))
    elif action == "put":
        sys.exit(do_put(sys.argv[2], sys.argv[3]))
    elif action == "get":
        sys.exit(do_get(sys.argv[2], sys.argv[3]))
    else:
        print(f"unknown action: {action}")
        sys.exit(2)
