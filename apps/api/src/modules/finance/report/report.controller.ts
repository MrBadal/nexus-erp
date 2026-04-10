import { Controller, Get, Query, Param, Res, Inject, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { eq } from 'drizzle-orm';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportService } from './report.service.js';
import { PdfService, type ReportPdfData } from '../../shared/pdf.service.js';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { tenants } from '../../../database/schema/index.js';
import { JwtAuthGuard } from '../../../common/guards/auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator.js';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator.js';
import { UuidValidationPipe } from '../../../common/pipes/uuid-validation.pipe.js';

@Controller('finance/reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly pdfService: PdfService,
    @Inject(DATABASE) private readonly db: DrizzleDB,
  ) {}

  @Get('general-ledger')
  @RequirePermissions('finance:read')
  async getGeneralLedger(
    @CurrentTenant() tenantId: string,
    @Query('accountId') accountId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reportService.getGeneralLedger(tenantId, {
      accountId,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('trial-balance')
  @RequirePermissions('finance:read')
  async getTrialBalance(
    @CurrentTenant() tenantId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportService.getTrialBalance(tenantId, asOfDate);
  }

  @Get('profit-loss')
  @RequirePermissions('finance:read')
  async getProfitAndLoss(
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportService.getProfitAndLoss(tenantId, fromDate, toDate);
  }

  @Get('balance-sheet')
  @RequirePermissions('finance:read')
  async getBalanceSheet(
    @CurrentTenant() tenantId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportService.getBalanceSheet(tenantId, asOfDate);
  }

  @Get('cash-flow')
  @RequirePermissions('finance:read')
  async getCashFlow(
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportService.getCashFlow(tenantId, fromDate, toDate);
  }

  @Get('receivable-aging')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Accounts receivable aging report' })
  @ApiQuery({ name: 'asOfDate', required: false })
  async getReceivableAging(
    @CurrentTenant() tenantId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportService.getReceivableAging(tenantId, asOfDate);
  }

  @Get('payable-aging')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Accounts payable aging report' })
  @ApiQuery({ name: 'asOfDate', required: false })
  async getPayableAging(
    @CurrentTenant() tenantId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportService.getPayableAging(tenantId, asOfDate);
  }

  @Get('budget-variance/:budgetId')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Budget variance report' })
  async getBudgetVariance(
    @CurrentTenant() tenantId: string,
    @Param('budgetId', UuidValidationPipe) budgetId: string,
  ) {
    return this.reportService.getBudgetVarianceReport(tenantId, budgetId);
  }

  @Get('vendor-ledger/:supplierId')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Vendor ledger report' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  async getVendorLedger(
    @CurrentTenant() tenantId: string,
    @Param('supplierId', UuidValidationPipe) supplierId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportService.getVendorLedger(tenantId, supplierId, fromDate, toDate);
  }

  @Get('tds-payment')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'TDS payment report' })
  @ApiQuery({ name: 'fiscalYear', required: true })
  @ApiQuery({ name: 'quarter', required: false, type: Number })
  async getTdsPayment(
    @CurrentTenant() tenantId: string,
    @Query('fiscalYear') fiscalYear: string,
    @Query('quarter') quarter?: number,
  ) {
    return this.reportService.getTdsPaymentReport(tenantId, fiscalYear, quarter ? Number(quarter) : undefined);
  }

  @Get('tds-return')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'TDS return report (26Q format)' })
  @ApiQuery({ name: 'fiscalYear', required: true })
  @ApiQuery({ name: 'quarter', required: true, type: Number })
  async getTdsReturn(
    @CurrentTenant() tenantId: string,
    @Query('fiscalYear') fiscalYear: string,
    @Query('quarter') quarter: number,
  ) {
    return this.reportService.getTdsReturnReport(tenantId, fiscalYear, Number(quarter));
  }

  // ─── PDF Report Exports ───────────────────────────────────

  @Get('trial-balance/pdf')
  @RequirePermissions('finance:read')
  async trialBalancePdf(
    @CurrentTenant() tenantId: string,
    @Query('asOfDate') asOfDate?: string,
    @Res() res?: Response,
  ) {
    const data = await this.reportService.getTrialBalance(tenantId, asOfDate);
    const tenant = await this.getTenantName(tenantId);
    const dateStr = asOfDate || new Date().toISOString().split('T')[0];

    const pdfData: ReportPdfData = {
      header: { companyName: tenant },
      reportTitle: 'Trial Balance',
      asOfDate: dateStr,
      columns: [
        { label: 'Account', align: 'left', width: 260 },
        { label: 'Debit', align: 'right', width: 127 },
        { label: 'Credit', align: 'right', width: 128 },
      ],
      rows: data.rows.map((a) => ({
        values: [
          `${a.accountCode} - ${a.accountName}`,
          this.fmtCurrency(parseFloat(a.debitBalance)),
          this.fmtCurrency(parseFloat(a.creditBalance)),
        ],
      })),
      totals: [
        'Total',
        this.fmtCurrency(parseFloat(data.totalDebits)),
        this.fmtCurrency(parseFloat(data.totalCredits)),
      ],
    };

    const buffer = await this.pdfService.generateReportPdf(pdfData);
    this.sendPdf(res!, buffer, `Trial-Balance-${dateStr}.pdf`);
  }

  @Get('profit-loss/pdf')
  @RequirePermissions('finance:read')
  async profitLossPdf(
    @CurrentTenant() tenantId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Res() res?: Response,
  ) {
    const data = await this.reportService.getProfitAndLoss(tenantId, fromDate, toDate);
    const tenant = await this.getTenantName(tenantId);
    const dateStr = toDate || new Date().toISOString().split('T')[0];

    const rows: ReportPdfData['rows'] = [];

    // Revenue section
    rows.push({ values: ['Revenue', '', ''], bold: true, separator: true });
    for (const r of data.revenue) {
      rows.push({
        values: [`${r.accountCode} - ${r.accountName}`, '', this.fmtCurrency(parseFloat(r.amount))],
        indent: 1,
      });
    }
    rows.push({ values: ['Total Revenue', '', this.fmtCurrency(parseFloat(data.totalRevenue))], bold: true });

    // Expense section
    rows.push({ values: ['Expenses', '', ''], bold: true, separator: true });
    for (const e of data.expenses) {
      rows.push({
        values: [`${e.accountCode} - ${e.accountName}`, this.fmtCurrency(parseFloat(e.amount)), ''],
        indent: 1,
      });
    }
    rows.push({ values: ['Total Expenses', this.fmtCurrency(parseFloat(data.totalExpenses)), ''], bold: true });

    const pdfData: ReportPdfData = {
      header: { companyName: tenant },
      reportTitle: 'Profit & Loss Statement',
      asOfDate: fromDate ? `${fromDate} to ${dateStr}` : `Up to ${dateStr}`,
      columns: [
        { label: 'Account', align: 'left', width: 260 },
        { label: 'Debit', align: 'right', width: 127 },
        { label: 'Credit', align: 'right', width: 128 },
      ],
      rows,
      totals: ['Net Profit / (Loss)', '', this.fmtCurrency(parseFloat(data.netIncome))],
    };

    const buffer = await this.pdfService.generateReportPdf(pdfData);
    this.sendPdf(res!, buffer, `Profit-Loss-${dateStr}.pdf`);
  }

  @Get('balance-sheet/pdf')
  @RequirePermissions('finance:read')
  async balanceSheetPdf(
    @CurrentTenant() tenantId: string,
    @Query('asOfDate') asOfDate?: string,
    @Res() res?: Response,
  ) {
    const data = await this.reportService.getBalanceSheet(tenantId, asOfDate);
    const tenant = await this.getTenantName(tenantId);
    const dateStr = asOfDate || new Date().toISOString().split('T')[0];

    const rows: ReportPdfData['rows'] = [];

    // Assets
    rows.push({ values: ['Assets', '', ''], bold: true, separator: true });
    for (const a of data.assets) {
      rows.push({
        values: [`${a.accountCode} - ${a.accountName}`, '', this.fmtCurrency(parseFloat(a.balance))],
        indent: 1,
      });
    }
    rows.push({ values: ['Total Assets', '', this.fmtCurrency(parseFloat(data.totalAssets))], bold: true });

    // Liabilities
    rows.push({ values: ['Liabilities', '', ''], bold: true, separator: true });
    for (const l of data.liabilities) {
      rows.push({
        values: [`${l.accountCode} - ${l.accountName}`, '', this.fmtCurrency(parseFloat(l.balance))],
        indent: 1,
      });
    }
    rows.push({ values: ['Total Liabilities', '', this.fmtCurrency(parseFloat(data.totalLiabilities))], bold: true });

    // Equity
    rows.push({ values: ['Equity', '', ''], bold: true, separator: true });
    for (const e of data.equity) {
      rows.push({
        values: [`${e.accountCode} - ${e.accountName}`, '', this.fmtCurrency(parseFloat(e.balance))],
        indent: 1,
      });
    }
    rows.push({ values: ['Total Equity', '', this.fmtCurrency(parseFloat(data.totalEquity))], bold: true });

    const pdfData: ReportPdfData = {
      header: { companyName: tenant },
      reportTitle: 'Balance Sheet',
      asOfDate: dateStr,
      columns: [
        { label: 'Account', align: 'left', width: 300 },
        { label: '', align: 'right', width: 100 },
        { label: 'Amount', align: 'right', width: 115 },
      ],
      rows,
      totals: [
        'Total Liabilities + Equity',
        '',
        this.fmtCurrency(parseFloat(data.totalLiabilities) + parseFloat(data.totalEquity)),
      ],
    };

    const buffer = await this.pdfService.generateReportPdf(pdfData);
    this.sendPdf(res!, buffer, `Balance-Sheet-${dateStr}.pdf`);
  }

  private fmtCurrency(amount: number): string {
    if (!amount || amount === 0) return '-';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private async getTenantName(tenantId: string): Promise<string> {
    const [tenant] = await this.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    return tenant?.name || 'Company';
  }

  private sendPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
