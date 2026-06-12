'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface RevenueExpenseDataPoint {
  month: string;
  revenue: number;
  /** Optional — when absent the expenses series is not drawn. */
  expenses?: number;
}

interface RevenueExpenseChartProps {
  data: RevenueExpenseDataPoint[];
  className?: string;
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueExpenseChart({ data, className }: RevenueExpenseChartProps) {
  const hasExpenses = data.some((d) => typeof d.expenses === 'number');

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">
          {hasExpenses ? 'Revenue vs Expenses' : 'Revenue'}
        </CardTitle>
        <CardDescription>Last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) =>
                  `$${(value / 1000).toFixed(0)}k`
                }
                className="text-muted-foreground"
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              {hasExpenses && (
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="hsl(var(--destructive))"
                  fill="url(#colorExpenses)"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export type { RevenueExpenseDataPoint };
