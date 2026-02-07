from unittest.mock import MagicMock, patch

from app.core.distiller import DOMDistiller
from app.schemas import DOMData, DOMElement


def test_distill_element_error():
    # Test internal try-except in elements loop
    dom_data = MagicMock(spec=DOMData)
    dom_data.elements = [None] # This will cause an error when accessing .role
    dom_data.url = "http://t.com"
    dom_data.title = "T"
    res = DOMDistiller.distill(dom_data)
    assert res.title == "T"
    assert len(res.summary) == 0

def test_distill_critical_error():
    # Test outer try-except
    res = DOMDistiller.distill(None)
    assert res.title == "Unknown"

def test_distill_html_critical_error():
    with patch("bs4.BeautifulSoup", side_effect=Exception("BS Error")):
        res = DOMDistiller.distill_html("<html>", "http://t.com")
        assert res.title == "Error"

def test_distill_html_no_body():
    html = "<html><title>T</title></html>" # No body tag
    res = DOMDistiller.distill_html(html, "http://t.com")
    assert res.title == "T"

def test_distill_duplicate_text():
    dom_data = DOMData(
        title="T", url="http://t.com",
        elements=[
            DOMElement(role="button", text="Click"),
            DOMElement(role="button", text="Click") # Duplicate
        ]
    )
    res = DOMDistiller.distill(dom_data)
    assert len(res.actions) == 1

def test_distill_empty_text_generic():
    dom_data = DOMData(
        title="T", url="http://t.com",
        elements=[
            DOMElement(role="p", text="") # Should be skipped
        ]
    )
    res = DOMDistiller.distill(dom_data)
    assert len(res.summary) == 0

def test_distill_duplicate_text_case():
    dom_data = DOMData(
        title="T", url="http://t.com",
        elements=[
            DOMElement(role="p", text="Hello"),
            DOMElement(role="p", text="hello") # Case-insensitive duplicate
        ]
    )
    res = DOMDistiller.distill(dom_data)
    assert len(res.summary) == 1

def test_distill_html_select_and_duplicate():
    html = """
    <html><body>
    <select><option>Opt</option></select>
    <p></p>
    <p>Duplicate</p>
    <p>duplicate</p>
    </body></html>
    """
    res = DOMDistiller.distill_html(html, "http://t.com")
    assert any(el.r == "select" for el in res.actions)
    assert sum(1 for el in res.summary if el.t.lower() == "duplicate") == 1


