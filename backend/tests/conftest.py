"""backend/tests 的公共夹具。

sse_starlette 把退出状态放在**模块级**，并且只在它为 None 时才新建 Event：

    if AppStatus.should_exit_event is None:
        AppStatus.should_exit_event = anyio.Event()
    ...
    await AppStatus.should_exit_event.wait()

anyio.Event 一旦绑定到某个事件循环，换一个循环再 await 就会抛
`RuntimeError: ... is bound to a different event loop`。而 TestClient 每个用例
（不进入上下文管理器时甚至每次请求）都跑在自己的事件循环里，于是**同一进程内
只有第一个流式用例能通过**。

此前仓库里只有一个流式用例（test_pdf_stream_threadpool.py），所以没暴露；
一旦再增加一个 SSE 用例，先后顺序就决定了谁红。这个夹具在每个用例前后把
sse_starlette 的模块级状态复位，使结果与用例顺序无关。

纯测试夹具，不参与运行时代码路径。
"""
import pytest


@pytest.fixture(autouse=True)
def _reset_sse_app_status():
    from sse_starlette.sse import AppStatus

    AppStatus.should_exit = False
    AppStatus.should_exit_event = None
    yield
    AppStatus.should_exit = False
    AppStatus.should_exit_event = None