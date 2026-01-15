"""
Live Content Service - On-Demand File Content Fetching

MVP Implementation (January 15, 2026)
Purpose: Fetch actual file CONTENT (not just metadata) from integrations
         so AI Assistant can answer questions about file contents.

Architecture:
    User Query → AI detects need for file content → LiveContentService
                                                           ↓
                                               Download file via OAuth API
                                                           ↓
                                               Extract text (PDF, DOCX, etc.)
                                                           ↓
                                               Return text to AI for answering

Supported File Types (MVP):
    - PDF (via PyMuPDF or pdfplumber)
    - Google Docs (export as text)
    - Google Sheets (export as CSV)
    - Plain text files (txt, md, csv, json)
    - Word documents (via python-docx)

Future: Microsoft OneDrive, Slack files, etc.
"""

import logging
import io
import base64
from typing import Optional, Dict, Any, Tuple
import httpx
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.purchase import OAuthToken
from app.api.v1.integrations import refresh_oauth_token

logger = logging.getLogger(__name__)

# Constants
DEFAULT_TIMEOUT = 30.0
DOWNLOAD_TIMEOUT = 60.0
MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50MB max for content extraction


class LiveContentService:
    """
    Fetch file content on-demand from integrations.

    This service is called when the AI Assistant needs to read
    actual file CONTENT to answer user questions.

    Example:
        User: "What does my Q3 report say about revenue?"
        AI: Detects need for file content → calls read_file_content()
        Service: Downloads Q3 Report.pdf, extracts text
        AI: Answers based on actual document content
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def read_file_content(
        self,
        integration: str,
        file_id: str,
        wallet_address: str,
        file_name: Optional[str] = None,
        mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Download a file and extract its text content.

        Args:
            integration: Integration name (google, microsoft)
            file_id: Unique file ID from the integration
            wallet_address: User's wallet address for OAuth
            file_name: Optional file name (for logging)
            mime_type: Optional MIME type (speeds up processing)

        Returns:
            {
                "success": bool,
                "content": str,  # Extracted text
                "file_name": str,
                "mime_type": str,
                "char_count": int,
                "extraction_method": str,  # pdf, docx, text, google_doc, etc.
                "error": str | None
            }
        """
        try:
            if integration == "google":
                return await self._read_google_file(
                    file_id, wallet_address, file_name, mime_type
                )
            elif integration == "microsoft":
                return await self._read_microsoft_file(
                    file_id, wallet_address, file_name, mime_type
                )
            else:
                return {
                    "success": False,
                    "content": "",
                    "error": f"Unsupported integration: {integration}"
                }
        except Exception as e:
            logger.error(f"LiveContentService error for {integration}/{file_id}: {e}")
            return {
                "success": False,
                "content": "",
                "error": str(e)
            }

    # =========================================================================
    # Google Drive Implementation
    # =========================================================================

    async def _read_google_file(
        self,
        file_id: str,
        wallet_address: str,
        file_name: Optional[str] = None,
        mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Read file content from Google Drive.

        Handles:
        - Native files (PDF, DOCX, TXT) - direct download
        - Google Docs - export as plain text
        - Google Sheets - export as CSV
        - Google Slides - export as plain text
        """
        access_token = await self._get_google_token(wallet_address)
        if not access_token:
            return {
                "success": False,
                "content": "",
                "error": "Google not connected or token expired. Please reconnect."
            }

        async with httpx.AsyncClient() as client:
            # Step 1: Get file metadata if not provided
            if not mime_type:
                metadata = await self._get_google_file_metadata(
                    client, access_token, file_id
                )
                if not metadata:
                    return {
                        "success": False,
                        "content": "",
                        "error": f"File not found or access denied: {file_id}"
                    }
                mime_type = metadata.get("mimeType", "")
                file_name = file_name or metadata.get("name", "unknown")
                file_size = metadata.get("size")

                # Check file size for non-Google native files
                if file_size and int(file_size) > MAX_FILE_SIZE_BYTES:
                    return {
                        "success": False,
                        "content": "",
                        "error": f"File too large ({int(file_size) / 1024 / 1024:.1f}MB). Max: 50MB"
                    }

            # Step 2: Download file content based on MIME type
            file_content, extraction_method = await self._download_google_file(
                client, access_token, file_id, mime_type
            )

            if file_content is None:
                return {
                    "success": False,
                    "content": "",
                    "file_name": file_name,
                    "mime_type": mime_type,
                    "error": "Failed to download file content"
                }

            # Step 3: Extract text based on content type
            text_content = await self._extract_text(
                file_content, mime_type, file_name, extraction_method
            )

            return {
                "success": True,
                "content": text_content,
                "file_name": file_name,
                "mime_type": mime_type,
                "char_count": len(text_content),
                "extraction_method": extraction_method
            }

    async def _get_google_file_metadata(
        self,
        client: httpx.AsyncClient,
        access_token: str,
        file_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get file metadata from Google Drive."""
        try:
            response = await client.get(
                f"https://www.googleapis.com/drive/v3/files/{file_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "id,name,mimeType,size,modifiedTime"},
                timeout=DEFAULT_TIMEOUT
            )
            if response.status_code == 200:
                return response.json()
            logger.warning(f"Google metadata fetch failed: {response.status_code}")
            return None
        except Exception as e:
            logger.error(f"Error fetching Google metadata: {e}")
            return None

    async def _download_google_file(
        self,
        client: httpx.AsyncClient,
        access_token: str,
        file_id: str,
        mime_type: str
    ) -> Tuple[Optional[bytes], str]:
        """
        Download file content from Google Drive.

        Returns: (file_bytes, extraction_method)
        """
        try:
            # Google native documents need export
            if mime_type == "application/vnd.google-apps.document":
                # Export Google Doc as plain text
                response = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"mimeType": "text/plain"},
                    timeout=DOWNLOAD_TIMEOUT
                )
                return (response.content, "google_doc_export") if response.status_code == 200 else (None, "")

            elif mime_type == "application/vnd.google-apps.spreadsheet":
                # Export Google Sheet as CSV
                response = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"mimeType": "text/csv"},
                    timeout=DOWNLOAD_TIMEOUT
                )
                return (response.content, "google_sheet_export") if response.status_code == 200 else (None, "")

            elif mime_type == "application/vnd.google-apps.presentation":
                # Export Google Slides as plain text
                response = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"mimeType": "text/plain"},
                    timeout=DOWNLOAD_TIMEOUT
                )
                return (response.content, "google_slides_export") if response.status_code == 200 else (None, "")

            else:
                # Regular files - direct download
                response = await client.get(
                    f"https://www.googleapis.com/drive/v3/files/{file_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"alt": "media"},
                    timeout=DOWNLOAD_TIMEOUT
                )
                if response.status_code == 200:
                    # Determine extraction method from mime type
                    if "pdf" in mime_type:
                        method = "pdf_download"
                    elif "word" in mime_type or "document" in mime_type:
                        method = "docx_download"
                    elif "spreadsheet" in mime_type or "excel" in mime_type:
                        method = "xlsx_download"
                    else:
                        method = "binary_download"
                    return (response.content, method)
                return (None, "")

        except Exception as e:
            logger.error(f"Error downloading Google file: {e}")
            return (None, "")

    # =========================================================================
    # Microsoft OneDrive Implementation
    # =========================================================================

    async def _read_microsoft_file(
        self,
        file_id: str,
        wallet_address: str,
        file_name: Optional[str] = None,
        mime_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Read file content from Microsoft OneDrive.
        """
        access_token = await self._get_microsoft_token(wallet_address)
        if not access_token:
            return {
                "success": False,
                "content": "",
                "error": "Microsoft 365 not connected or token expired. Please reconnect."
            }

        async with httpx.AsyncClient() as client:
            # Get metadata if not provided
            if not mime_type:
                metadata_url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}"
                metadata_response = await client.get(
                    metadata_url,
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=DEFAULT_TIMEOUT
                )
                if metadata_response.status_code != 200:
                    return {
                        "success": False,
                        "content": "",
                        "error": f"File not found or access denied: {file_id}"
                    }
                metadata = metadata_response.json()
                mime_type = metadata.get("file", {}).get("mimeType", "")
                file_name = file_name or metadata.get("name", "unknown")
                file_size = metadata.get("size", 0)

                if file_size > MAX_FILE_SIZE_BYTES:
                    return {
                        "success": False,
                        "content": "",
                        "error": f"File too large ({file_size / 1024 / 1024:.1f}MB). Max: 50MB"
                    }

            # Download file content
            download_url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content"
            download_response = await client.get(
                download_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=DOWNLOAD_TIMEOUT,
                follow_redirects=True
            )

            if download_response.status_code != 200:
                return {
                    "success": False,
                    "content": "",
                    "error": "Failed to download file content"
                }

            # Determine extraction method
            if "pdf" in mime_type.lower():
                extraction_method = "pdf_download"
            elif "word" in mime_type.lower() or "document" in mime_type.lower():
                extraction_method = "docx_download"
            else:
                extraction_method = "binary_download"

            # Extract text
            text_content = await self._extract_text(
                download_response.content, mime_type, file_name, extraction_method
            )

            return {
                "success": True,
                "content": text_content,
                "file_name": file_name,
                "mime_type": mime_type,
                "char_count": len(text_content),
                "extraction_method": extraction_method
            }

    # =========================================================================
    # Text Extraction
    # =========================================================================

    async def _extract_text(
        self,
        file_content: bytes,
        mime_type: str,
        file_name: str,
        extraction_method: str
    ) -> str:
        """
        Extract text from file content based on type.

        Uses same extraction logic as ai.py analyze-document endpoint.
        """
        # Google Docs/Sheets already exported as text
        if extraction_method in ["google_doc_export", "google_sheet_export", "google_slides_export"]:
            try:
                return file_content.decode("utf-8")
            except UnicodeDecodeError:
                return file_content.decode("latin-1")

        # PDF extraction
        if "pdf" in mime_type.lower() or extraction_method == "pdf_download":
            return self._extract_pdf_text(file_content, file_name)

        # Word document extraction
        if "word" in mime_type.lower() or "document" in mime_type.lower() or extraction_method == "docx_download":
            return self._extract_docx_text(file_content, file_name)

        # Plain text files
        text_types = ["text/", "application/json", "application/xml", "text/csv"]
        if any(t in mime_type.lower() for t in text_types):
            try:
                return file_content.decode("utf-8")
            except UnicodeDecodeError:
                return file_content.decode("latin-1")

        # Excel files
        if "spreadsheet" in mime_type.lower() or "excel" in mime_type.lower():
            return self._extract_xlsx_text(file_content, file_name)

        # Unknown type
        return f"[Binary file: {file_name}]\n\nThis file type ({mime_type}) cannot be read as text."

    def _extract_pdf_text(self, content: bytes, file_name: str) -> str:
        """Extract text from PDF using PyMuPDF or pdfplumber."""
        try:
            # Try PyMuPDF (fitz) first - faster
            try:
                import fitz
                pdf_doc = fitz.open(stream=content, filetype="pdf")
                text_parts = []
                for page_num, page in enumerate(pdf_doc):
                    page_text = page.get_text()
                    if page_text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                if text_parts:
                    logger.info(f"PDF extracted with PyMuPDF: {len(pdf_doc)} pages")
                    return "\n\n".join(text_parts)
            except ImportError:
                pass

            # Fallback to pdfplumber
            try:
                import pdfplumber
                with pdfplumber.open(io.BytesIO(content)) as pdf:
                    text_parts = []
                    for page_num, page in enumerate(pdf.pages):
                        page_text = page.extract_text() or ""
                        if page_text.strip():
                            text_parts.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    if text_parts:
                        logger.info(f"PDF extracted with pdfplumber: {len(pdf.pages)} pages")
                        return "\n\n".join(text_parts)
            except ImportError:
                pass

            return f"[PDF Document: {file_name}]\n\nPDF text extraction requires PyMuPDF or pdfplumber library."

        except Exception as e:
            logger.error(f"PDF extraction failed: {e}")
            return f"[PDF Document: {file_name}]\n\nFailed to extract text: {str(e)}"

    def _extract_docx_text(self, content: bytes, file_name: str) -> str:
        """Extract text from Word document."""
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            if paragraphs:
                logger.info(f"DOCX extracted: {len(paragraphs)} paragraphs")
                return "\n\n".join(paragraphs)
            return f"[Word Document: {file_name}]\n\nThe document appears to be empty or contains only images."
        except ImportError:
            return f"[Word Document: {file_name}]\n\nWord document extraction requires python-docx library."
        except Exception as e:
            logger.error(f"DOCX extraction failed: {e}")
            return f"[Word Document: {file_name}]\n\nFailed to extract text: {str(e)}"

    def _extract_xlsx_text(self, content: bytes, file_name: str) -> str:
        """Extract text from Excel spreadsheet."""
        try:
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            text_parts = []
            for sheet_name in wb.sheetnames:
                sheet = wb[sheet_name]
                rows = []
                for row in sheet.iter_rows(values_only=True):
                    row_text = ", ".join(str(cell) if cell is not None else "" for cell in row)
                    if row_text.strip(", "):
                        rows.append(row_text)
                if rows:
                    text_parts.append(f"--- Sheet: {sheet_name} ---\n" + "\n".join(rows[:100]))
            if text_parts:
                logger.info(f"XLSX extracted: {len(wb.sheetnames)} sheets")
                return "\n\n".join(text_parts)
            return f"[Excel Spreadsheet: {file_name}]\n\nThe spreadsheet appears to be empty."
        except ImportError:
            return f"[Excel Spreadsheet: {file_name}]\n\nExcel extraction requires openpyxl library."
        except Exception as e:
            logger.error(f"XLSX extraction failed: {e}")
            return f"[Excel Spreadsheet: {file_name}]\n\nFailed to extract text: {str(e)}"

    # =========================================================================
    # Token Management
    # =========================================================================

    async def _get_google_token(self, wallet_address: str) -> Optional[str]:
        """Get active Google OAuth access token."""
        try:
            result = await self.db.execute(
                select(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == wallet_address.lower(),
                        OAuthToken.provider == "google"
                    )
                )
            )
            token = result.scalar_one_or_none()

            if not token:
                logger.warning(f"No Google token found for {wallet_address[:10]}...")
                return None

            # Check expiration and refresh if needed
            now = datetime.utcnow()
            if token.expires_at and token.expires_at < now:
                logger.info(f"Google token expired, attempting refresh...")
                refresh_success = await refresh_oauth_token(token, "google", self.db)
                if not refresh_success:
                    logger.warning(f"Google token refresh failed")
                    return None

            # Use auth context to decrypt token
            with OAuthToken.auth_context(wallet_address.lower()):
                return token.access_token

        except Exception as e:
            logger.error(f"Error getting Google token: {e}")
            return None

    async def _get_microsoft_token(self, wallet_address: str) -> Optional[str]:
        """Get active Microsoft OAuth access token."""
        try:
            result = await self.db.execute(
                select(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == wallet_address.lower(),
                        OAuthToken.provider == "microsoft"
                    )
                )
            )
            token = result.scalar_one_or_none()

            if not token:
                logger.warning(f"No Microsoft token found for {wallet_address[:10]}...")
                return None

            # Check expiration and refresh if needed
            now = datetime.utcnow()
            if token.expires_at and token.expires_at < now:
                logger.info(f"Microsoft token expired, attempting refresh...")
                refresh_success = await refresh_oauth_token(token, "microsoft", self.db)
                if not refresh_success:
                    logger.warning(f"Microsoft token refresh failed")
                    return None

            # Use auth context to decrypt token
            with OAuthToken.auth_context(wallet_address.lower()):
                return token.access_token

        except Exception as e:
            logger.error(f"Error getting Microsoft token: {e}")
            return None


# =========================================================================
# Convenience Functions
# =========================================================================

async def read_integration_file(
    db: AsyncSession,
    integration: str,
    file_id: str,
    wallet_address: str,
    file_name: Optional[str] = None,
    mime_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to read file content.

    Usage in AI endpoint:
        from app.services.live_content_service import read_integration_file

        content = await read_integration_file(
            db=db,
            integration="google",
            file_id="1abc123",
            wallet_address="0x..."
        )

        if content["success"]:
            file_text = content["content"]
            # Use file_text in AI response
    """
    service = LiveContentService(db)
    return await service.read_file_content(
        integration=integration,
        file_id=file_id,
        wallet_address=wallet_address,
        file_name=file_name,
        mime_type=mime_type
    )


async def read_multiple_files(
    db: AsyncSession,
    files: list,
    wallet_address: str
) -> Dict[str, Dict[str, Any]]:
    """
    Read multiple files and return combined results.

    Args:
        db: Database session
        files: List of {integration, file_id, file_name, mime_type}
        wallet_address: User's wallet address

    Returns:
        Dict mapping file_id to read result
    """
    service = LiveContentService(db)
    results = {}

    for file_info in files:
        file_id = file_info.get("file_id") or file_info.get("id")
        result = await service.read_file_content(
            integration=file_info.get("integration", "google"),
            file_id=file_id,
            wallet_address=wallet_address,
            file_name=file_info.get("file_name") or file_info.get("name"),
            mime_type=file_info.get("mime_type") or file_info.get("mimeType")
        )
        results[file_id] = result

    return results
