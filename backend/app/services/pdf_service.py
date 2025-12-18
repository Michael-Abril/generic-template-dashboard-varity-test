"""
PDF Report Generation Service for Varity Dashboard
Creates professional business reports in PDF format
"""
import os
import io
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
    Flowable
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from io import BytesIO
import numpy as np

logger = logging.getLogger(__name__)


class ChartGenerator:
    """Generate charts for PDF reports"""

    def create_revenue_chart(self, data: List[Dict[str, Any]]) -> BytesIO:
        """
        Create revenue chart image

        Args:
            data: List of revenue data points

        Returns:
            BytesIO object containing the chart image
        """
        fig, ax = plt.subplots(figsize=(8, 4))

        # Extract dates and values
        dates = [datetime.strptime(d['date'], '%Y-%m-%d') if isinstance(d['date'], str)
                else d['date'] for d in data]
        values = [d['value'] for d in data]

        # Create line plot
        ax.plot(dates, values, color='#1976d2', linewidth=2)
        ax.fill_between(dates, values, color='#1976d2', alpha=0.3)

        # Format axes
        ax.set_xlabel('Date')
        ax.set_ylabel('Revenue ($)')
        ax.set_title('Revenue Over Time')
        ax.grid(True, alpha=0.3)

        # Format date axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%b %d'))
        ax.xaxis.set_major_locator(mdates.DayLocator(interval=7))
        fig.autofmt_xdate()

        # Save to BytesIO
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        plt.close()

        return buffer

    def create_pie_chart(self, data: Dict[str, float], title: str = "Distribution") -> BytesIO:
        """
        Create pie chart image

        Args:
            data: Dictionary of labels and values
            title: Chart title

        Returns:
            BytesIO object containing the chart image
        """
        fig, ax = plt.subplots(figsize=(6, 6))

        # Create pie chart
        wedges, texts, autotexts = ax.pie(
            data.values(),
            labels=data.keys(),
            autopct='%1.1f%%',
            colors=['#1976d2', '#4CAF50', '#FFC107', '#F44336', '#9C27B0'],
            startangle=90
        )

        # Improve text appearance
        for text in texts:
            text.set_fontsize(10)
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontsize(10)
            autotext.set_fontweight('bold')

        ax.set_title(title, fontsize=12, fontweight='bold')

        # Save to BytesIO
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        plt.close()

        return buffer

    def create_bar_chart(self, categories: List[str], values: List[float],
                        title: str = "Comparison") -> BytesIO:
        """
        Create bar chart image

        Args:
            categories: List of category names
            values: List of values
            title: Chart title

        Returns:
            BytesIO object containing the chart image
        """
        fig, ax = plt.subplots(figsize=(8, 4))

        # Create bar chart
        bars = ax.bar(categories, values, color=['#1976d2', '#4CAF50', '#FFC107', '#F44336'])

        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'{height:,.0f}',
                   ha='center', va='bottom', fontsize=10)

        # Format axes
        ax.set_ylabel('Value')
        ax.set_title(title, fontsize=12, fontweight='bold')
        ax.grid(True, axis='y', alpha=0.3)

        # Rotate x-axis labels if needed
        if len(categories) > 5:
            plt.xticks(rotation=45, ha='right')

        # Save to BytesIO
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        plt.close()

        return buffer


class PDFReportGenerator:
    """
    PDF Report Generator for business dashboards
    Creates professional reports with charts, tables, and branding
    """

    def __init__(self):
        """Initialize PDF generator with styles and settings"""
        self.styles = getSampleStyleSheet()
        self.chart_generator = ChartGenerator()

        # Custom styles
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1976d2'),
            spaceAfter=30,
            alignment=TA_CENTER
        ))

        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
            spaceBefore=12
        ))

        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#666666'),
            alignment=TA_CENTER
        ))

        logger.info("PDF Report Generator initialized")

    def _create_header(self, canvas, doc):
        """Add header to each page"""
        canvas.saveState()

        # Add logo/branding
        canvas.setFont('Helvetica-Bold', 16)
        canvas.setFillColor(colors.HexColor('#1976d2'))
        canvas.drawString(inch, doc.pagesize[1] - 0.5*inch, "Varity Dashboard")

        # Add date
        canvas.setFont('Helvetica', 10)
        canvas.setFillColor(colors.HexColor('#666666'))
        canvas.drawRightString(
            doc.pagesize[0] - inch,
            doc.pagesize[1] - 0.5*inch,
            datetime.now().strftime('%B %d, %Y')
        )

        # Add line
        canvas.setLineWidth(1)
        canvas.setStrokeColor(colors.HexColor('#e0e0e0'))
        canvas.line(inch, doc.pagesize[1] - 0.7*inch,
                   doc.pagesize[0] - inch, doc.pagesize[1] - 0.7*inch)

        canvas.restoreState()

    def _create_footer(self, canvas, doc):
        """Add footer to each page"""
        canvas.saveState()

        # Add page number
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.HexColor('#666666'))
        page_num = f"Page {doc.page}"
        canvas.drawCentredString(doc.pagesize[0]/2, 0.5*inch, page_num)

        # Add "Powered by" text
        canvas.setFont('Helvetica-Oblique', 8)
        canvas.drawCentredString(
            doc.pagesize[0]/2,
            0.3*inch,
            "Powered by Varity - Decentralized AI Dashboards"
        )

        canvas.restoreState()

    async def generate_business_report(
        self,
        company_name: str,
        report_type: str,
        report_data: Dict[str, Any],
        include_charts: bool = True
    ) -> bytes:
        """
        Generate comprehensive business report PDF

        Args:
            company_name: Company name for the report
            report_type: Type of report (daily, weekly, monthly, quarterly)
            report_data: Dictionary containing report data
            include_charts: Whether to include charts

        Returns:
            PDF file as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )

        # Build content
        story = []

        # Title
        title = f"{company_name} {report_type.title()} Business Report"
        story.append(Paragraph(title, self.styles['CustomTitle']))
        story.append(Spacer(1, 12))

        # Executive Summary
        story.append(Paragraph("Executive Summary", self.styles['SectionHeading']))
        summary_text = report_data.get('summary',
            f"This {report_type} report provides a comprehensive overview of "
            f"{company_name}'s business performance and key metrics."
        )
        story.append(Paragraph(summary_text, self.styles['Normal']))
        story.append(Spacer(1, 12))

        # Key Metrics Table
        if 'metrics' in report_data:
            story.append(Paragraph("Key Performance Indicators", self.styles['SectionHeading']))
            metrics_table = self._create_metrics_table(report_data['metrics'])
            story.append(metrics_table)
            story.append(Spacer(1, 12))

        # Revenue Chart
        if include_charts and 'revenue_data' in report_data:
            story.append(Paragraph("Revenue Analysis", self.styles['SectionHeading']))
            revenue_chart = self.chart_generator.create_revenue_chart(
                report_data['revenue_data']
            )
            img = Image(revenue_chart, width=6*inch, height=3*inch)
            story.append(img)
            story.append(Spacer(1, 12))

        # Sales by Category
        if include_charts and 'sales_by_category' in report_data:
            story.append(Paragraph("Sales Distribution", self.styles['SectionHeading']))
            pie_chart = self.chart_generator.create_pie_chart(
                report_data['sales_by_category'],
                "Sales by Category"
            )
            img = Image(pie_chart, width=4*inch, height=4*inch)
            story.append(img)
            story.append(Spacer(1, 12))

        # Transactions Table
        if 'transactions' in report_data:
            story.append(Paragraph("Recent Transactions", self.styles['SectionHeading']))
            trans_table = self._create_transactions_table(report_data['transactions'][:10])
            story.append(trans_table)
            story.append(Spacer(1, 12))

        # Insights and Recommendations
        if 'insights' in report_data:
            story.append(PageBreak())
            story.append(Paragraph("AI-Generated Insights", self.styles['SectionHeading']))
            for insight in report_data['insights']:
                story.append(Paragraph(f"• {insight}", self.styles['Normal']))
            story.append(Spacer(1, 12))

        # Build PDF
        doc.build(story, onFirstPage=self._create_header, onLaterPages=self._create_header)

        # Add footers (requires second pass)
        buffer.seek(0)
        return buffer.getvalue()

    def _create_metrics_table(self, metrics: Dict[str, Any]) -> Table:
        """Create a formatted metrics table"""
        data = [['Metric', 'Value', 'Change']]

        for key, value in metrics.items():
            change = ""
            if isinstance(value, dict):
                actual_value = value.get('value', '')
                change = value.get('change', '')
                if change:
                    change_color = colors.green if float(change.replace('%', '')) > 0 else colors.red
                    change = f"{change}"
            else:
                actual_value = value

            # Format the key name
            formatted_key = key.replace('_', ' ').title()
            data.append([formatted_key, str(actual_value), change])

        table = Table(data, colWidths=[3*inch, 2*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
        ]))

        return table

    def _create_transactions_table(self, transactions: List[Dict[str, Any]]) -> Table:
        """Create a formatted transactions table"""
        data = [['Date', 'Description', 'Amount', 'Status']]

        for trans in transactions:
            date = trans.get('date', '')
            if isinstance(date, datetime):
                date = date.strftime('%Y-%m-%d')

            data.append([
                date,
                trans.get('description', '')[:30],
                f"${trans.get('amount', 0):,.2f}",
                trans.get('status', 'Completed')
            ])

        table = Table(data, colWidths=[1.5*inch, 3*inch, 1.5*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
        ]))

        return table

    async def generate_invoice(
        self,
        invoice_data: Dict[str, Any]
    ) -> bytes:
        """
        Generate invoice PDF

        Args:
            invoice_data: Dictionary containing invoice information

        Returns:
            PDF file as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []

        # Invoice header
        story.append(Paragraph("INVOICE", self.styles['CustomTitle']))
        story.append(Spacer(1, 12))

        # Invoice details
        invoice_info = Table([
            ['Invoice Number:', invoice_data.get('invoice_number', 'INV-001')],
            ['Date:', datetime.now().strftime('%B %d, %Y')],
            ['Due Date:', (datetime.now() + timedelta(days=30)).strftime('%B %d, %Y')],
        ], colWidths=[2*inch, 4*inch])

        invoice_info.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))

        story.append(invoice_info)
        story.append(Spacer(1, 20))

        # Bill to section
        story.append(Paragraph("Bill To:", self.styles['Heading3']))
        bill_to = invoice_data.get('bill_to', {})
        story.append(Paragraph(bill_to.get('company', 'Company Name'), self.styles['Normal']))
        story.append(Paragraph(bill_to.get('address', 'Address'), self.styles['Normal']))
        story.append(Paragraph(bill_to.get('city_state_zip', 'City, State ZIP'), self.styles['Normal']))
        story.append(Spacer(1, 20))

        # Line items table
        items_data = [['Description', 'Quantity', 'Rate', 'Amount']]
        line_items = invoice_data.get('line_items', [])
        total = 0

        for item in line_items:
            qty = item.get('quantity', 1)
            rate = item.get('rate', 0)
            amount = qty * rate
            total += amount

            items_data.append([
                item.get('description', ''),
                str(qty),
                f"${rate:,.2f}",
                f"${amount:,.2f}"
            ])

        # Add total row
        items_data.append(['', '', 'Total:', f"${total:,.2f}"])

        items_table = Table(items_data, colWidths=[3.5*inch, 1*inch, 1.5*inch, 1.5*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -2), 1, colors.grey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
        ]))

        story.append(items_table)
        story.append(Spacer(1, 30))

        # Payment terms
        story.append(Paragraph("Payment Terms:", self.styles['Heading3']))
        story.append(Paragraph(
            invoice_data.get('payment_terms', 'Net 30 - Payment due within 30 days'),
            self.styles['Normal']
        ))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    async def generate_analytics_report(
        self,
        analytics_data: Dict[str, Any]
    ) -> bytes:
        """
        Generate analytics report PDF with custom visualizations

        Args:
            analytics_data: Dictionary containing analytics data

        Returns:
            PDF file as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []

        # Title
        story.append(Paragraph("Analytics Report", self.styles['CustomTitle']))
        story.append(Paragraph(
            f"Period: {analytics_data.get('period', 'Last 30 Days')}",
            self.styles['Normal']
        ))
        story.append(Spacer(1, 20))

        # Traffic Overview
        if 'traffic' in analytics_data:
            story.append(Paragraph("Traffic Overview", self.styles['SectionHeading']))
            traffic_data = analytics_data['traffic']

            traffic_table = Table([
                ['Metric', 'Value'],
                ['Total Visits', f"{traffic_data.get('total_visits', 0):,}"],
                ['Unique Visitors', f"{traffic_data.get('unique_visitors', 0):,}"],
                ['Page Views', f"{traffic_data.get('page_views', 0):,}"],
                ['Avg. Session Duration', traffic_data.get('avg_duration', '0:00')],
                ['Bounce Rate', f"{traffic_data.get('bounce_rate', 0)}%"],
            ])

            traffic_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976d2')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ]))

            story.append(traffic_table)
            story.append(Spacer(1, 20))

        # Conversion Funnel
        if 'conversion_funnel' in analytics_data:
            story.append(Paragraph("Conversion Funnel", self.styles['SectionHeading']))

            funnel_data = analytics_data['conversion_funnel']
            categories = list(funnel_data.keys())
            values = list(funnel_data.values())

            funnel_chart = self.chart_generator.create_bar_chart(
                categories, values, "Conversion Funnel"
            )
            img = Image(funnel_chart, width=6*inch, height=3*inch)
            story.append(img)
            story.append(Spacer(1, 20))

        # User Demographics
        if 'demographics' in analytics_data:
            story.append(PageBreak())
            story.append(Paragraph("User Demographics", self.styles['SectionHeading']))

            demo_data = analytics_data['demographics']

            # Age distribution pie chart
            if 'age_distribution' in demo_data:
                age_chart = self.chart_generator.create_pie_chart(
                    demo_data['age_distribution'],
                    "Age Distribution"
                )
                img = Image(age_chart, width=4*inch, height=4*inch)
                story.append(img)

            # Geographic distribution
            if 'geographic' in demo_data:
                story.append(Spacer(1, 12))
                story.append(Paragraph("Geographic Distribution", self.styles['Heading3']))

                geo_table = Table([['Country', 'Users']] +
                    [[k, v] for k, v in demo_data['geographic'].items()])
                geo_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4CAF50')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('GRID', (0, 0), (-1, -1), 1, colors.grey),
                ]))
                story.append(geo_table)

        # Custom Insights
        if 'insights' in analytics_data:
            story.append(Spacer(1, 20))
            story.append(Paragraph("Key Insights", self.styles['SectionHeading']))

            for insight in analytics_data['insights']:
                story.append(Paragraph(f"• {insight}", self.styles['Normal']))

        # Build PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()


# Singleton instance
pdf_service = PDFReportGenerator()