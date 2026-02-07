
from app.core.distiller import DOMDistiller
from app.schemas import DOMData, DOMElement


def test_distill_basic():
    """Test basic DOM distillation from a list of elements."""
    mock_dom = DOMData(
        title="Test Page",
        url="https://test.com/",
        elements=[
            DOMElement(role="heading", text="Hello World", selector="h1", in_viewport=True),
            DOMElement(role="button", text="Click Me", selector="#btn", in_viewport=True),
            DOMElement(role="link", text="Read More", selector="a", in_viewport=False)
        ]
    )

    distilled = DOMDistiller.distill(mock_dom)

    assert distilled.title == "Test Page"
    assert len(distilled.summary) == 1
    assert distilled.summary[0].t == "Hello World"
    assert len(distilled.actions) == 2
    assert distilled.actions[0].r == "button"
    assert distilled.actions[1].r == "link"

def test_distill_deduplication():
    """Test that duplicate text elements are filtered out."""
    mock_dom = DOMData(
        title="Dedupe Page",
        url="https://test.com/",
        elements=[
            DOMElement(role="link", text="Home", selector="nav1"),
            DOMElement(role="link", text="Home", selector="nav2"),
            DOMElement(role="text", text="Unique Text", selector="p1")
        ]
    )

    distilled = DOMDistiller.distill(mock_dom)

    # "Home" should appear only once
    home_elements = [el for el in distilled.actions if el.t == "Home"]
    assert len(home_elements) == 1
    assert len(distilled.summary) == 1

def test_distill_html_elements():
    """Test distilling raw HTML into structured data."""
    html = """
    <html>
        <head><title>HTML Test</title></head>
        <body>
            <h1>Main Title</h1>
            <p>Some descriptive text about the page.</p>
            <button aria-label="Submit Form">Submit</button>
            <a href="/next">Next Page</a>
            <input type="text" placeholder="Your Name">
        </body>
    </html>
    """
    url = "https://html-test.com/"
    distilled = DOMDistiller.distill_html(html, url)

    assert distilled.title == "HTML Test"
    assert len(distilled.summary) == 2  # h1 and p
    assert any(el.r == "heading" and el.t == "Main Title" for el in distilled.summary)

    assert len(distilled.actions) == 3  # button, a, input
    assert any(el.r == "button" and el.t == "Submit" for el in distilled.actions)
    assert any(el.r == "input" and el.t == "Your Name" for el in distilled.actions)

def test_distill_html_empty_input():
    """Test that input elements without text use placeholder/aria-label."""
    html = '<input type="email" placeholder="email@example.com">'
    distilled = DOMDistiller.distill_html(html, "https://test.com/")

    assert len(distilled.actions) == 1
    assert distilled.actions[0].t == "email@example.com"

def test_distill_max_elements():
    """Test that max_elements constraint is respected."""
    elements = [DOMElement(role="text", text=f"Text {i}", selector=f"p{i}") for i in range(50)]
    mock_dom = DOMData(title="Limit Test", url="https://test.com/", elements=elements)

    distilled = DOMDistiller.distill(mock_dom, max_elements=10)
    assert len(distilled.summary) == 10
