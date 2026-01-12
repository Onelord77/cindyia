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
import { Users, UserCheck, UserPlus, Star } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useMemo } from 'react';

interface ReportClientesProps {
  data: {
    totalAppointments: number;
    completedAppointments: number;
  };
}

export function ReportClientes({ data }: ReportClientesProps) {
  const { clients } = useClients();

  const clientStats = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter(c => (c.total_visits || 0) > 0).length;
    const newClients = clients.filter(c => (c.total_visits || 0) === 1).length;
    const returningClients = clients.filter(c => (c.total_visits || 0) > 1).length;

    // Distribuição por visitas
    const visitDistribution = [
      { name: '1 visita', value: clients.filter(c => (c.total_visits || 0) === 1).length, color: 'hsl(217, 91%, 60%)' },
      { name: '2-3 visitas', value: clients.filter(c => (c.total_visits || 0) >= 2 && (c.total_visits || 0) <= 3).length, color: 'hsl(152, 70%, 45%)' },
      { name: '4-5 visitas', value: clients.filter(c => (c.total_visits || 0) >= 4 && (c.total_visits || 0) <= 5).length, color: 'hsl(280, 65%, 55%)' },
      { name: '6+ visitas', value: clients.filter(c => (c.total_visits || 0) >= 6).length, color: 'hsl(340, 65%, 55%)' },
    ].filter(item => item.value > 0);

    // Top clientes
    const topClients = [...clients]
      .sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0))
      .slice(0, 5)
      .map(c => ({
        name: c.name.split(' ')[0],
        visitas: c.total_visits || 0,
      }));

    const retentionRate = totalClients > 0 ? (returningClients / totalClients) * 100 : 0;

    return {
      totalClients,
      activeClients,
      newClients,
      returningClients,
      visitDistribution,
      topClients,
      retentionRate,
    };
  }, [clients]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPIs de Clientes */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-pink-500/10 p-2 sm:p-3">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-lg sm:text-2xl font-bold">{clientStats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-emerald-500/10 p-2 sm:p-3">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Clientes Ativos</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600">{clientStats.activeClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-blue-500/10 p-2 sm:p-3">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Clientes Novos</p>
                <p className="text-lg sm:text-2xl font-bold">{clientStats.newClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="rounded-full bg-amber-500/10 p-2 sm:p-3">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Taxa de Retenção</p>
                <p className="text-lg sm:text-2xl font-bold">{clientStats.retentionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Distribuição por Visitas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Distribuição por Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
              {clientStats.visitDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientStats.visitDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {clientStats.visitDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value} clientes`} />
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

        {/* Top Clientes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg">Top 5 Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
              {clientStats.topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientStats.topClients} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(220, 15%, 90%)',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value} visitas`}
                    />
                    <Bar 
                      dataKey="visitas" 
                      fill="hsl(340, 65%, 55%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum cliente encontrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes Frequentes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg">Clientes Mais Frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clientStats.topClients.length > 0 ? (
              clientStats.topClients.map((client, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2 w-24">
                      <div 
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ 
                          width: `${Math.min((client.visitas / (clientStats.topClients[0]?.visitas || 1)) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                      {client.visitas} visitas
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
