import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Scissors, Star, TrendingUp, Award } from 'lucide-react';

interface ReportServicosProps {
  data: {
    serviceData: Array<{ name: string; value: number; color: string }>;
    totalAppointments: number;
  };
}

export function ReportServicos({ data }: ReportServicosProps) {
  const totalServices = data.serviceData.reduce((acc, s) => acc + s.value, 0);
  const topService = data.serviceData[0];
  const avgPerService = data.serviceData.length > 0 ? totalServices / data.serviceData.length : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs de Serviços */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-purple-500/10 p-2 sm:p-3">
                <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total de Serviços</p>
                <p className="text-lg sm:text-2xl font-bold">{totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-amber-500/10 p-2 sm:p-3">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Tipos de Serviço</p>
                <p className="text-lg sm:text-2xl font-bold">{data.serviceData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-pink-500/10 p-2 sm:p-3">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Mais Popular</p>
                <p className="text-sm sm:text-lg font-bold truncate">{topService?.name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-cyan-500/10 p-2 sm:p-3">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Média por Tipo</p>
                <p className="text-lg sm:text-2xl font-bold">{avgPerService.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Distribuição de Serviços */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Distribuição de Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[350px]">
              {data.serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.serviceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.serviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} agendamentos`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ranking de Serviços */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Ranking de Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] sm:h-[350px]">
              {data.serviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.serviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      fontSize={12}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(220, 15%, 90%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value} agendamentos`}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(280, 65%, 55%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista detalhada */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Detalhamento por Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.serviceData.length > 0 ? (
              data.serviceData.map((service, index) => {
                const percentage = totalServices > 0 ? (service.value / totalServices) * 100 : 0;
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: service.color }}
                      />
                      <span className="text-sm font-medium truncate">{service.name}</span>
                    </div>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: service.color 
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                      {service.value} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhum serviço encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
