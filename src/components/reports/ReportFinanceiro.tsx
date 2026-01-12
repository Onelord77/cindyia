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
} from 'recharts';
import { DollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';

interface ReportFinanceiroProps {
  data: {
    totalRevenue: number;
    totalExpenses: number;
    dailyData: Array<{ name: string; receita: number; despesa: number }>;
  };
}

export function ReportFinanceiro({ data }: ReportFinanceiroProps) {
  const lucroLiquido = data.totalRevenue - data.totalExpenses;
  const margemLucro = data.totalRevenue > 0 ? (lucroLiquido / data.totalRevenue) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs Financeiros */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-emerald-500/10 p-2 sm:p-3">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Receita Total</p>
                <p className="text-lg sm:text-2xl font-bold truncate text-emerald-600">
                  R$ {data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-red-500/10 p-2 sm:p-3">
                <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Despesa Total</p>
                <p className="text-lg sm:text-2xl font-bold truncate text-red-600">
                  R$ {data.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-blue-500/10 p-2 sm:p-3">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Lucro Líquido</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  R$ {lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-purple-500/10 p-2 sm:p-3">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Margem de Lucro</p>
                <p className={`text-lg sm:text-2xl font-bold truncate ${margemLucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {margemLucro.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Receitas x Despesas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Evolução Financeira Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyData}>
                <defs>
                  <linearGradient id="colorReceitaFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152, 70%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesaFin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="receita"
                  name="Receita"
                  stroke="hsl(152, 70%, 45%)"
                  fillOpacity={1}
                  fill="url(#colorReceitaFin)"
                />
                <Area
                  type="monotone"
                  dataKey="despesa"
                  name="Despesa"
                  stroke="hsl(0, 84%, 60%)"
                  fillOpacity={1}
                  fill="url(#colorDespesaFin)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras Comparativo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Comparativo Receita x Despesa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyData}>
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
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
