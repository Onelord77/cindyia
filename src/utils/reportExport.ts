import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  totalRevenue: number;
  totalAppointments: number;
  ticketMedio: number;
  cancelRate: number;
  dailyData: { name: string; receita: number; despesa: number }[];
  serviceData: { name: string; value: number }[];
  weekdayData: { name: string; agendamentos: number }[];
}

interface DateRange {
  from?: Date;
  to?: Date;
}

const formatCurrency = (value: number) => 
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateRange = (dateRange?: DateRange) => {
  if (!dateRange?.from) return 'Período completo';
  const from = format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR });
  const to = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : from;
  return `${from} - ${to}`;
};

export const exportToCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  
  let csv = BOM;
  csv += 'RELATÓRIO GERENCIAL\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  // KPIs
  csv += 'INDICADORES PRINCIPAIS\n';
  csv += 'Indicador,Valor\n';
  csv += `Faturamento Total,${formatCurrency(data.totalRevenue)}\n`;
  csv += `Total de Agendamentos,${data.totalAppointments}\n`;
  csv += `Ticket Médio,${formatCurrency(data.ticketMedio)}\n`;
  csv += `Taxa de Cancelamento,${data.cancelRate.toFixed(1)}%\n\n`;
  
  // Daily Data
  csv += 'RECEITAS E DESPESAS POR DIA\n';
  csv += 'Data,Receita,Despesa,Saldo\n';
  data.dailyData.forEach(day => {
    csv += `${day.name},${formatCurrency(day.receita)},${formatCurrency(day.despesa)},${formatCurrency(day.receita - day.despesa)}\n`;
  });
  csv += '\n';
  
  // Services
  csv += 'SERVIÇOS MAIS REALIZADOS\n';
  csv += 'Serviço,Quantidade,Percentual\n';
  const totalServices = data.serviceData.reduce((acc, s) => acc + s.value, 0);
  data.serviceData.forEach(service => {
    const percent = totalServices > 0 ? ((service.value / totalServices) * 100).toFixed(1) : '0.0';
    csv += `${service.name},${service.value},${percent}%\n`;
  });
  csv += '\n';
  
  // Weekday Data
  csv += 'AGENDAMENTOS POR DIA DA SEMANA\n';
  csv += 'Dia,Quantidade\n';
  data.weekdayData.forEach(day => {
    csv += `${day.name},${day.agendamentos}\n`;
  });
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: ReportData, dateRange?: DateRange) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para exportar o PDF');
    return;
  }

  const totalServices = data.serviceData.reduce((acc, s) => acc + s.value, 0);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório Gerencial</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          color: #1a1a1a;
          line-height: 1.5;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e5e5;
        }
        .header h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
        .header p { color: #666; font-size: 14px; }
        .kpis { 
          display: grid; 
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }
        .kpi { 
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .kpi-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .kpi-value { font-size: 20px; font-weight: 700; color: #111; margin-top: 4px; }
        .section { margin-bottom: 30px; }
        .section h2 { 
          font-size: 16px; 
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e5e5;
        }
        table { 
          width: 100%; 
          border-collapse: collapse;
          font-size: 13px;
        }
        th, td { 
          padding: 10px 12px; 
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        th { 
          background: #f8f9fa;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
        }
        tr:hover { background: #fafafa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        @media print {
          body { padding: 20px; }
          .kpis { grid-template-columns: repeat(4, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relatório Gerencial</h1>
        <p>Período: ${formatDateRange(dateRange)}</p>
        <p>Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="kpi-label">Faturamento Total</div>
          <div class="kpi-value">${formatCurrency(data.totalRevenue)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Agendamentos</div>
          <div class="kpi-value">${data.totalAppointments}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Ticket Médio</div>
          <div class="kpi-value">${formatCurrency(data.ticketMedio)}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Cancelamentos</div>
          <div class="kpi-value">${data.cancelRate.toFixed(1)}%</div>
        </div>
      </div>

      <div class="section">
        <h2>Receitas e Despesas por Dia</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th class="text-right">Receita</th>
              <th class="text-right">Despesa</th>
              <th class="text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            ${data.dailyData.map(day => `
              <tr>
                <td>${day.name}</td>
                <td class="text-right">${formatCurrency(day.receita)}</td>
                <td class="text-right">${formatCurrency(day.despesa)}</td>
                <td class="text-right">${formatCurrency(day.receita - day.despesa)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Serviços Mais Realizados</h2>
        <table>
          <thead>
            <tr>
              <th>Serviço</th>
              <th class="text-center">Quantidade</th>
              <th class="text-right">Percentual</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviceData.map(service => `
              <tr>
                <td>${service.name}</td>
                <td class="text-center">${service.value}</td>
                <td class="text-right">${totalServices > 0 ? ((service.value / totalServices) * 100).toFixed(1) : '0.0'}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Agendamentos por Dia da Semana</h2>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th class="text-center">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            ${data.weekdayData.map(day => `
              <tr>
                <td>${day.name}</td>
                <td class="text-center">${day.agendamentos}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="footer">
        Relatório gerado automaticamente pelo sistema
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
