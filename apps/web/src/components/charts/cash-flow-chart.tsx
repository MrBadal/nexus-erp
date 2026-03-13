'use client';

import {
  BarChart,
  Bar,
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

interface CashFlowDataPoint {
  month: string;
  inflow: number;
  outflow: number;
}

interface CashFlowChartProps {
  data: CashFlowDataPoint[];
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

  const net = (payload[0]?.value ?? 0) - (payload[1]?.value ?? 0);

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
      <div className="mt-1.5 border-t pt-1.5 text-sm">
        <span className="text-muted-foreground">Net: </span>
        <span className={net >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>
          {formatCurrency(net)}
        </span>
      </div>
    </div>
  );
}

export function CashFlowChart({ data, className }: CashFlowChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Cash Flow</CardTitle>
        <CardDescription>Inflow vs Outflow - Last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
            >
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
              <Bar
                dataKey="inflow"
                fill="hsl(142, 71%, 45%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="outflow"
                fill="hsl(0, 84%, 60%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export type { CashFlowDataPoint };
