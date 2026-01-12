import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import { TrendingUp, DollarSign, Target, Percent } from 'lucide-react';

interface ReportDesempenhoProps {
  data: {
    totalRevenue: number;
    totalExpenses: number;
    ticketMedio: number;
    totalAppointments: number;
    completedAppointments: number;
    dailyData: Array<{ name: string; receita: number; despesa: number }>;
  };
}

export function ReportDesempenho({ data }: ReportDesempenhoProps) {
  const lucroLiquido = data.totalRevenue - data.totalExpenses;
  const roi = data.totalExpenses > 0 ? ((lucroLiquido / data.totalExpenses) * 100) : 0;
  const eficiencia = data.totalAppointments > 0 
    ? (data.completedAppointments / data.totalAppointments) * 100 
    : 0;

  // Calcular dados de performance
  const performanceData = data.dailyData.map(day => ({
    ...day,
    lucro: day.receita - day.despesa,
    margem: day.receita > 0 ? ((day.receita - day.despesa) / day.receita) * 100 : 0,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs de Desempenho */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-orange-500/10 p-2 sm:p-3">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-lg sm:text-2xl font-bold">
                  R$ {data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-emerald-500/10 p-2 sm:p-3">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">ROI</p>
                <p className={`text-lg sm:text-2xl font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {roi.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-blue-500/10 p-2 sm:p-3">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Eficiência</p>
                <p className="text-lg sm:text-2xl font-bold">{eficiencia.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-purple-500/10 p-2 sm:p-3">
                <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Margem Média</p>
                <p className={`text-lg sm:text-2xl font-bold ${lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.totalRevenue > 0 ? ((lucroLiquido / data.totalRevenue) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Lucro */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Evolução do Lucro Diário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={performanceData}>
                <defs>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} fontSize={12} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(220, 15%, 90%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'margem') return `${value.toFixed(1)}%`;
                    return `R$ ${value.toFixed(2)}`;
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="lucro"
                  name="Lucro"
                  stroke="hsl(152, 70%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorLucro)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margem"
                  name="Margem %"
                  stroke="hsl(280, 65%, 55%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(280, 65%, 55%)', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparativo de Performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Receita vs Despesa vs Lucro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(220, 15%, 90%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="hsl(152, 70%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
