'use client';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Play } from 'lucide-react';

interface ReportFiltersProps {
  showAccountFilter?: boolean;
  account?: string;
  onAccountChange?: (value: string) => void;
  accounts?: { label: string; value: string }[];
  showDateRange?: boolean;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  showAsOfDate?: boolean;
  asOfDate?: string;
  onAsOfDateChange?: (value: string) => void;
  onGenerate?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  isLoading?: boolean;
}

export function ReportFilters({
  showAccountFilter,
  account,
  onAccountChange,
  accounts = [],
  showDateRange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showAsOfDate,
  asOfDate,
  onAsOfDateChange,
  onGenerate,
  onExportCsv,
  onExportPdf,
  isLoading,
}: ReportFiltersProps) {
  return (
    <div className="no-print flex flex-row items-end gap-3 px-6 py-3 border-b bg-muted/30">
      {showAccountFilter && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Account</label>
          <Select value={account} onValueChange={onAccountChange}>
            <SelectTrigger className="h-8 w-[220px] text-sm">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acct) => (
                <SelectItem key={acct.value} value={acct.value}>
                  {acct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDateRange && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <DatePicker
              value={dateFrom ? new Date(dateFrom) : undefined}
              onChange={(date) => onDateFromChange?.(date.toISOString().split('T')[0])}
              placeholder="Start date"
              className="h-8 w-[160px] text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <DatePicker
              value={dateTo ? new Date(dateTo) : undefined}
              onChange={(date) => onDateToChange?.(date.toISOString().split('T')[0])}
              placeholder="End date"
              className="h-8 w-[160px] text-sm"
            />
          </div>
        </>
      )}

      {showAsOfDate && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">As of Date</label>
          <DatePicker
            value={asOfDate ? new Date(asOfDate) : undefined}
            onChange={(date) => onAsOfDateChange?.(date.toISOString().split('T')[0])}
            placeholder="As of date"
            className="h-8 w-[160px] text-sm"
          />
        </div>
      )}

      <Button size="sm" className="h-8" onClick={onGenerate} disabled={isLoading}>
        <Play className="mr-1.5 h-3.5 w-3.5" />
        Generate
      </Button>

      <Button
        size="sm"
        variant="outline"
        className="h-8"
        onClick={onExportCsv}
        disabled={isLoading}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export CSV
      </Button>

      {onExportPdf && (
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={onExportPdf}
          disabled={isLoading}
        >
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Download PDF
        </Button>
      )}
    </div>
  );
}

export type { ReportFiltersProps };
