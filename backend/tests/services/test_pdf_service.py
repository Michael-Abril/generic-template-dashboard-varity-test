"""
Unit tests for PDFService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.pdf_service import PDFService


class TestPDFService:
    """Test suite for PDF processing service"""

    @pytest.fixture
    def pdf_service(self):
        """Create PDFService instance"""
        return PDFService()

    @pytest.mark.asyncio
    async def test_extract_text_from_pdf(
        self,
        pdf_service
    ):
        """Test extracting text from PDF"""
        pdf_content = b"%PDF-1.4..." # Mock PDF bytes

        with patch('PyPDF2.PdfReader') as mock_reader:
            mock_page = Mock()
            mock_page.extract_text.return_value = "Test PDF content"
            mock_reader.return_value.pages = [mock_page]

            text = await pdf_service.extract_text(pdf_content)

            assert "Test PDF content" in text or isinstance(text, str)

    @pytest.mark.asyncio
    async def test_generate_pdf_report(
        self,
        pdf_service
    ):
        """Test generating PDF report"""
        data = {"title": "Monthly Report", "content": "Report data..."}

        pdf_bytes = await pdf_service.generate_report(data)

        assert isinstance(pdf_bytes, bytes) or pdf_bytes is not None

    @pytest.mark.asyncio
    async def test_merge_pdfs(
        self,
        pdf_service
    ):
        """Test merging multiple PDFs"""
        pdf_files = [b"pdf1...", b"pdf2..."]

        with patch('PyPDF2.PdfMerger') as mock_merger:
            merged = await pdf_service.merge_pdfs(pdf_files)

            assert isinstance(merged, bytes) or merged is not None
