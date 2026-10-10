"""PDF SSE 载荷编码的兼容性测试。

背景：`/api/pdf/render/stream` 历史上把 PDF 字节 hex 编码放进 SSE 的 data 字段，
体积是原始字节的 2 倍。改成 base64 能省 1/3 流量，但**老前端只会按 hex 解析**，
默认切换会让未刷新的页面拿到损坏的 PDF。

因此编码按请求头 `X-PDF-Payload-Encoding` 显式协商，本文件锁住两条约定：
  1. 不带该头时必须仍然发 hex 的 `pdf` 事件（老客户端 / admin 远程流）；
  2. 带 base64 时必须发 `pdf_b64`，且能精确还原原始字节。
"""
import base64
import os
import sys
from io import BytesIO

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from fastapi.testclient import TestClient

from backend.main import app
import backend.routes.pdf as pdf_route
import backend.latex_generator as latex_generator

FAKE_PDF = b"%PDF-1.4\n%encoding probe payload\n%%EOF\n"

RENDER_BODY = {"resume": {"name": "tester"}, "section_order": []}


def _patch_render_pipeline(monkeypatch):
    """让渲染管线返回固定字节，不依赖 xelatex。"""

    async def fake_run_in_threadpool(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(pdf_route, "run_in_threadpool", fake_run_in_threadpool, raising=False)
    monkeypatch.setattr(
        latex_generator,
        "json_to_latex",
        lambda _resume, _order=None: "\\documentclass{article}\\begin{document}ok\\end{document}",
    )
    monkeypatch.setattr(
        latex_generator,
        "compile_latex_to_pdf",
        lambda _latex, _template_dir, resume_data=None: BytesIO(FAKE_PDF),
    )


def _event_names(text: str) -> list:
    return [
        line[len("event: ") :].strip()
        for line in text.replace("\r\n", "\n").split("\n")
        if line.startswith("event: ")
    ]


def _payload_of(text: str, event: str) -> str:
    current = None
    for line in text.replace("\r\n", "\n").split("\n"):
        if line.startswith("event: "):
            current = line[len("event: ") :].strip()
        elif line.startswith("data: ") and current == event:
            return line[len("data: ") :].strip()
    raise AssertionError(f"未找到事件 {event}，实际事件序列: {_event_names(text)}")


def test_stream_defaults_to_hex_payload_for_legacy_clients(monkeypatch):
    """不带协商头 → 与改动前完全一致：hex 的 `pdf` 事件。"""
    _patch_render_pipeline(monkeypatch)

    response = TestClient(app).post("/api/pdf/render/stream", json=RENDER_BODY)

    assert response.status_code == 200
    events = _event_names(response.text)
    assert pdf_route.PDF_EVENT_HEX in events
    assert pdf_route.PDF_EVENT_BASE64 not in events
    assert bytes.fromhex(_payload_of(response.text, pdf_route.PDF_EVENT_HEX)) == FAKE_PDF


def test_stream_returns_base64_when_client_requests_it(monkeypatch):
    """带协商头 → 只发 base64 的 `pdf_b64` 事件，且能精确还原字节。"""
    _patch_render_pipeline(monkeypatch)

    response = TestClient(app).post(
        "/api/pdf/render/stream",
        json=RENDER_BODY,
        headers={pdf_route.PDF_PAYLOAD_ENCODING_HEADER: pdf_route.PDF_PAYLOAD_BASE64},
    )

    assert response.status_code == 200
    events = _event_names(response.text)
    assert pdf_route.PDF_EVENT_BASE64 in events
    assert pdf_route.PDF_EVENT_HEX not in events
    payload = _payload_of(response.text, pdf_route.PDF_EVENT_BASE64)
    assert base64.b64decode(payload) == FAKE_PDF
    # base64 载荷不应混入 hex 之外的分隔/换行，否则前端按行取值会截断
    assert "\n" not in payload


def test_base64_payload_is_smaller_than_hex():
    """协议收益本身：base64 体积必须是 hex 的 2/3。"""
    hex_payload = pdf_route._encode_pdf_event(FAKE_PDF, "")["data"]
    b64_payload = pdf_route._encode_pdf_event(FAKE_PDF, pdf_route.PDF_PAYLOAD_BASE64)["data"]

    assert len(hex_payload) == len(FAKE_PDF) * 2
    assert len(b64_payload) < len(hex_payload)
    assert len(b64_payload) == len(base64.b64encode(FAKE_PDF))


def test_encode_pdf_event_falls_back_to_hex_for_unknown_encoding():
    """未知取值一律回退 hex，避免将来新增编码时误伤老客户端。"""
    for requested in ["", "hex", "gzip", "base64url", "utf-8"]:
        event = pdf_route._encode_pdf_event(FAKE_PDF, requested)
        assert event["event"] == pdf_route.PDF_EVENT_HEX
        assert event["data"] == FAKE_PDF.hex()


def test_encode_pdf_event_accepts_case_and_whitespace():
    for requested in ["base64", "BASE64", " Base64 ", "\tbase64\n"]:
        event = pdf_route._encode_pdf_event(FAKE_PDF, requested)
        assert event["event"] == pdf_route.PDF_EVENT_BASE64
        assert base64.b64decode(event["data"]) == FAKE_PDF