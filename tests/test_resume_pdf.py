import base64
import io

import pytest
from pypdf import PdfWriter

from server import extract_resume_pdf


def test_rejects_non_pdf():
    with pytest.raises(ValueError, match="PDF"):
        extract_resume_pdf({"pdf": base64.b64encode(b"not a pdf").decode()})


def test_rejects_pdf_without_text():
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    data = io.BytesIO()
    writer.write(data)
    with pytest.raises(ValueError, match="No readable text"):
        extract_resume_pdf({"pdf": base64.b64encode(data.getvalue()).decode()})
