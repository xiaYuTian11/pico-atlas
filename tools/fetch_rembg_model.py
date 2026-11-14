"""预下载 rembg 的抠图模型（出图后处理要用），断网也能先备好。"""
import sys

from rembg import new_session

name = sys.argv[1] if len(sys.argv) > 1 else "u2net"
s = new_session(name)
print(f"rembg 模型 {name} 就绪：{s}")
