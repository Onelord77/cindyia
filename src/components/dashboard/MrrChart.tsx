import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MrrChartProps {
  data: { month: string; mrr: number; newMrr: number; churnedMrr: number }[];
}

export function MrrChart({ data }: MrrChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$${(value / 1000).toFixed(1)}k`;
    }
    return `R$${value}`;
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Evolucao do MRR</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 90%)" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(220, 10%, 45%)' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(220, 10%, 45%)' }}
                tickFormatter={formatCurrency}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(220, 20%, 90%)',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    mrr: 'MRR Total',
                    newMrr: 'Novo MRR',
                    churnedMrr: 'MRR Perdido',
                  };
                  return [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    labels[name] || name
                  ];
                }}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="mrr"
                name="mrr"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMrr)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
