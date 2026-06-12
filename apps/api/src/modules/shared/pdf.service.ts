import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface PdfDocumentHeader {
  companyName: string;
  gstin?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface PdfLineItem {
  sn: number;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  amount: number;
}

interface PdfTaxBreakdown {
  label: string;
  rate: string;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoicePdfData {
  header: PdfDocumentHeader;
  documentType: 'Tax Invoice' | 'Proforma Invoice' | 'Credit Note';
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customerName: string;
  customerGstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  lines: PdfLineItem[];
  subtotal: number;
  discountAmount: number;
  taxBreakdown?: PdfTaxBreakdown[];
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  termsAndConditions?: string;
  bankDetails?: { bankName: string; accountNumber: string; ifsc: string; branch: string };
}

export interface PurchaseOrderPdfData {
  header: PdfDocumentHeader;
  orderNumber: string;
  orderDate: string;
  expectedDelivery: string;
  supplierName: string;
  supplierAddress?: string;
  lines: PdfLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
}

export interface QuotationPdfData {
  header: PdfDocumentHeader;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
  customerName: string;
  customerAddress?: string;
  lines: PdfLineItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
}

export interface ReportPdfData {
  header: PdfDocumentHeader;
  reportTitle: string;
  asOfDate: string;
  columns: { label: string; align: 'left' | 'right'; width: number }[];
  rows: { values: string[]; indent?: number; bold?: boolean; separator?: boolean }[];
  totals?: string[];
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  private formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // ─── Invoice PDF ───────────────────────────────────────

  async generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      this.drawDocumentHeader(doc, data.header, data.documentType);

      // Invoice details
      const detailsY = 140;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Invoice #: ${data.invoiceNumber}`, 40, detailsY);
      doc.text(`Date: ${data.issueDate}`, 40, detailsY + 14);
      doc.text(`Due Date: ${data.dueDate}`, 40, detailsY + 28);

      doc.text(`Bill To:`, 320, detailsY);
      doc.font('Helvetica-Bold').text(data.customerName, 320, detailsY + 14);
      doc.font('Helvetica');
      if (data.customerGstin) doc.text(`GSTIN: ${data.customerGstin}`, 320, detailsY + 28);
      if (data.billingAddress) doc.text(data.billingAddress, 320, detailsY + 42, { width: 200 });

      // Line items table
      const tableTop = detailsY + 80;
      this.drawLineItemsTable(doc, data.lines, tableTop);

      // Totals
      const totalsY = tableTop + 20 + data.lines.length * 18 + 10;
      this.drawTotals(doc, totalsY, [
        { label: 'Subtotal', value: data.subtotal },
        ...(data.discountAmount > 0 ? [{ label: 'Discount', value: -data.discountAmount }] : []),
        { label: 'Tax', value: data.taxAmount },
        { label: 'Total', value: data.totalAmount, bold: true },
        ...(data.amountPaid > 0 ? [{ label: 'Amount Paid', value: data.amountPaid }] : []),
        ...(data.balanceDue > 0 ? [{ label: 'Balance Due', value: data.balanceDue, bold: true }] : []),
      ]);

      // Notes & Terms
      let footerY = totalsY + 120;
      if (data.notes) {
        doc.fontSize(8).font('Helvetica-Bold').text('Notes:', 40, footerY);
        doc.font('Helvetica').text(data.notes, 40, footerY + 12, { width: 250 });
        footerY += 40;
      }

      if (data.bankDetails) {
        doc.fontSize(8).font('Helvetica-Bold').text('Bank Details:', 40, footerY);
        doc.font('Helvetica');
        doc.text(`Bank: ${data.bankDetails.bankName}`, 40, footerY + 12);
        doc.text(`A/C: ${data.bankDetails.accountNumber}`, 40, footerY + 24);
        doc.text(`IFSC: ${data.bankDetails.ifsc}`, 40, footerY + 36);
        doc.text(`Branch: ${data.bankDetails.branch}`, 40, footerY + 48);
      }

      if (data.termsAndConditions) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', 320, footerY);
        doc.font('Helvetica').text(data.termsAndConditions, 320, footerY + 12, { width: 220 });
      }

      doc.end();
    });
  }

  // ─── Purchase Order PDF ────────────────────────────────

  async generatePurchaseOrderPdf(data: PurchaseOrderPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawDocumentHeader(doc, data.header, 'Purchase Order');

      const detailsY = 140;
      doc.fontSize(9).font('Helvetica');
      doc.text(`PO #: ${data.orderNumber}`, 40, detailsY);
      doc.text(`Order Date: ${data.orderDate}`, 40, detailsY + 14);
      doc.text(`Expected Delivery: ${data.expectedDelivery}`, 40, detailsY + 28);

      doc.text('Supplier:', 320, detailsY);
      doc.font('Helvetica-Bold').text(data.supplierName, 320, detailsY + 14);
      doc.font('Helvetica');
      if (data.supplierAddress) doc.text(data.supplierAddress, 320, detailsY + 28, { width: 200 });

      const tableTop = detailsY + 70;
      this.drawLineItemsTable(doc, data.lines, tableTop);

      const totalsY = tableTop + 20 + data.lines.length * 18 + 10;
      this.drawTotals(doc, totalsY, [
        { label: 'Subtotal', value: data.subtotal },
        ...(data.discountAmount > 0 ? [{ label: 'Discount', value: -data.discountAmount }] : []),
        { label: 'Tax', value: data.taxAmount },
        { label: 'Total', value: data.totalAmount, bold: true },
      ]);

      if (data.notes) {
        doc.fontSize(8).font('Helvetica-Bold').text('Notes:', 40, totalsY + 80);
        doc.font('Helvetica').text(data.notes, 40, totalsY + 92, { width: 400 });
      }

      doc.end();
    });
  }

  // ─── Quotation PDF ────────────────────────────────────

  async generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawDocumentHeader(doc, data.header, 'Quotation');

      const detailsY = 140;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Quotation #: ${data.quotationNumber}`, 40, detailsY);
      doc.text(`Date: ${data.quotationDate}`, 40, detailsY + 14);
      doc.text(`Valid Until: ${data.validUntil}`, 40, detailsY + 28);

      doc.text('Customer:', 320, detailsY);
      doc.font('Helvetica-Bold').text(data.customerName, 320, detailsY + 14);
      doc.font('Helvetica');
      if (data.customerAddress) doc.text(data.customerAddress, 320, detailsY + 28, { width: 200 });

      const tableTop = detailsY + 70;
      this.drawLineItemsTable(doc, data.lines, tableTop);

      const totalsY = tableTop + 20 + data.lines.length * 18 + 10;
      this.drawTotals(doc, totalsY, [
        { label: 'Subtotal', value: data.subtotal },
        ...(data.discountAmount > 0 ? [{ label: 'Discount', value: -data.discountAmount }] : []),
        { label: 'Tax', value: data.taxAmount },
        { label: 'Total', value: data.totalAmount, bold: true },
      ]);

      let footerY = totalsY + 80;
      if (data.notes) {
        doc.fontSize(8).font('Helvetica-Bold').text('Notes:', 40, footerY);
        doc.font('Helvetica').text(data.notes, 40, footerY + 12, { width: 250 });
        footerY += 40;
      }
      if (data.termsAndConditions) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions:', 320, totalsY + 80);
        doc.font('Helvetica').text(data.termsAndConditions, 320, totalsY + 92, { width: 220 });
      }

      doc.end();
    });
  }

  // ─── Report PDF (Balance Sheet, P&L, Trial Balance) ───

  async generateReportPdf(data: ReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Company header
      doc.fontSize(14).font('Helvetica-Bold').text(data.header.companyName, 40, 40);
      if (data.header.gstin) doc.fontSize(8).font('Helvetica').text(`GSTIN: ${data.header.gstin}`, 40, 58);

      // Report title
      doc.fontSize(16).font('Helvetica-Bold').text(data.reportTitle, 40, 80, { align: 'center' });
      doc.fontSize(9).font('Helvetica').text(`As of ${data.asOfDate}`, 40, 100, { align: 'center' });

      // Column headers
      const tableTop = 130;
      let x = 40;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.moveTo(40, tableTop - 4).lineTo(555, tableTop - 4).stroke();

      for (const col of data.columns) {
        doc.text(col.label, x, tableTop, { width: col.width, align: col.align });
        x += col.width;
      }

      doc.moveTo(40, tableTop + 14).lineTo(555, tableTop + 14).stroke();

      // Data rows
      let y = tableTop + 20;
      for (const row of data.rows) {
        if (row.separator) {
          doc.moveTo(40, y - 2).lineTo(555, y - 2).stroke();
        }

        doc.font(row.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        x = 40 + (row.indent ?? 0) * 15;

        for (let i = 0; i < data.columns.length; i++) {
          const col = data.columns[i];
          const cellX = i === 0 ? x : 40 + data.columns.slice(0, i).reduce((s, c) => s + c.width, 0);
          const cellW = i === 0 ? col.width - (row.indent ?? 0) * 15 : col.width;
          doc.text(row.values[i] || '', cellX, y, { width: cellW, align: col.align });
        }

        y += 16;

        // Add new page if needed
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
      }

      // Totals row
      if (data.totals) {
        doc.moveTo(40, y).lineTo(555, y).stroke();
        y += 6;
        doc.font('Helvetica-Bold').fontSize(9);
        x = 40;
        for (let i = 0; i < data.columns.length; i++) {
          const col = data.columns[i];
          doc.text(data.totals[i] || '', x, y, { width: col.width, align: col.align });
          x += col.width;
        }
      }

      // Footer
      doc.fontSize(7).font('Helvetica')
        .text(`Generated on ${new Date().toLocaleDateString('en-IN')} by NexusERP`, 40, 780, { align: 'center' });

      doc.end();
    });
  }

  // ─── Helper Methods ────────────────────────────────────

  private drawDocumentHeader(doc: PDFKit.PDFDocument, header: PdfDocumentHeader, documentType: string) {
    // Company name
    doc.fontSize(16).font('Helvetica-Bold').text(header.companyName, 40, 40);

    // Company details
    doc.fontSize(8).font('Helvetica');
    let y = 60;
    if (header.gstin) { doc.text(`GSTIN: ${header.gstin}`, 40, y); y += 12; }
    if (header.address) { doc.text(header.address, 40, y, { width: 250 }); y += 12; }
    if (header.phone) { doc.text(`Phone: ${header.phone}`, 40, y); y += 12; }
    if (header.email) { doc.text(`Email: ${header.email}`, 40, y); }

    // Document type badge
    doc.fontSize(14).font('Helvetica-Bold').text(documentType, 400, 40, { align: 'right', width: 155 });

    // Separator
    doc.moveTo(40, 120).lineTo(555, 120).lineWidth(1).stroke();
  }

  private drawLineItemsTable(doc: PDFKit.PDFDocument, lines: PdfLineItem[], tableTop: number) {
    const cols = [
      { label: '#', width: 25, align: 'left' as const },
      { label: 'Description', width: 180, align: 'left' as const },
      { label: 'HSN', width: 50, align: 'left' as const },
      { label: 'Qty', width: 40, align: 'right' as const },
      { label: 'Rate', width: 70, align: 'right' as const },
      { label: 'Tax %', width: 45, align: 'right' as const },
      { label: 'Amount', width: 75, align: 'right' as const },
    ];

    // Header
    doc.fontSize(8).font('Helvetica-Bold');
    doc.rect(40, tableTop - 4, 515, 18).fill('#f3f4f6');
    doc.fillColor('#000');

    let x = 44;
    for (const col of cols) {
      doc.text(col.label, x, tableTop, { width: col.width, align: col.align });
      x += col.width;
    }

    // Rows
    doc.font('Helvetica').fontSize(8);
    let y = tableTop + 20;
    for (const line of lines) {
      x = 44;
      doc.text(String(line.sn), x, y, { width: 25 }); x += 25;
      doc.text(line.description, x, y, { width: 180 }); x += 180;
      doc.text(line.hsnCode || '-', x, y, { width: 50 }); x += 50;
      doc.text(String(line.quantity), x, y, { width: 40, align: 'right' }); x += 40;
      doc.text(this.formatCurrency(line.unitPrice), x, y, { width: 70, align: 'right' }); x += 70;
      doc.text(line.taxRate ? `${line.taxRate}%` : '-', x, y, { width: 45, align: 'right' }); x += 45;
      doc.text(this.formatCurrency(line.amount), x, y, { width: 75, align: 'right' });
      y += 18;
    }

    // Bottom line
    doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).stroke();
  }

  private drawTotals(
    doc: PDFKit.PDFDocument,
    startY: number,
    items: { label: string; value: number; bold?: boolean }[],
  ) {
    let y = startY;
    for (const item of items) {
      doc.font(item.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(item.bold ? 10 : 9);
      doc.text(item.label, 370, y, { width: 100, align: 'right' });
      doc.text(this.formatCurrency(item.value), 480, y, { width: 75, align: 'right' });
      y += 16;
    }
  }
}
