import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  totalRevenue: number;
  totalExpenses: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  ticketMedio: number;
  cancelRate: number;
  dailyData: { name: string; receita: number; despesa: number }[];
  serviceData: { name: string; value: number; color?: string }[];
  weekdayData: { name: string; agendamentos: number }[];
}

interface DateRange {
  from?: Date;
  to?: Date;
}

export type ReportType = 'financeiro' | 'agendamentos' | 'servicos' | 'desempenho' | 'clientes' | 'horarios';

const formatCurrency = (value: number) => 
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDateRange = (dateRange?: DateRange) => {
  if (!dateRange?.from) return 'Período completo';
  const from = format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR });
  const to = dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR }) : from;
  return `${from} - ${to}`;
};

const getReportTitle = (reportType: ReportType): string => {
  const titles: Record<ReportType, string> = {
    financeiro: 'Relatório Financeiro',
    agendamentos: 'Relatório de Agendamentos',
    servicos: 'Relatório de Serviços',
    desempenho: 'Relatório de Desempenho',
    clientes: 'Relatório de Clientes',
    horarios: 'Relatório de Horários',
  };
  return titles[reportType];
};

// ========== FINANCEIRO ==========
const exportFinanceiroCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF';
  let csv = BOM;
  csv += 'RELATÓRIO FINANCEIRO\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  csv += 'INDICADORES FINANCEIROS\n';
  csv += 'Indicador,Valor\n';
  csv += `Receita Total,${formatCurrency(data.totalRevenue)}\n`;
  csv += `Despesas Totais,${formatCurrency(data.totalExpenses)}\n`;
  csv += `Lucro Líquido,${formatCurrency(data.totalRevenue - data.totalExpenses)}\n`;
  csv += `Margem de Lucro,${data.totalRevenue > 0 ? (((data.totalRevenue - data.totalExpenses) / data.totalRevenue) * 100).toFixed(1) : '0.0'}%\n\n`;
  
  csv += 'FLUXO DIÁRIO\n';
  csv += 'Data,Receita,Despesa,Saldo\n';
  data.dailyData.forEach(day => {
    csv += `${day.name},${formatCurrency(day.receita)},${formatCurrency(day.despesa)},${formatCurrency(day.receita - day.despesa)}\n`;
  });
  
  return csv;
};

const exportFinanceiroPDF = (data: ReportData) => {
  return `
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Receita Total</div>
        <div class="kpi-value">${formatCurrency(data.totalRevenue)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Despesas Totais</div>
        <div class="kpi-value">${formatCurrency(data.totalExpenses)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Lucro Líquido</div>
        <div class="kpi-value">${formatCurrency(data.totalRevenue - data.totalExpenses)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Margem de Lucro</div>
        <div class="kpi-value">${data.totalRevenue > 0 ? (((data.totalRevenue - data.totalExpenses) / data.totalRevenue) * 100).toFixed(1) : '0.0'}%</div>
      </div>
    </div>
    <div class="section">
      <h2>Fluxo Diário de Caixa</h2>
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
  `;
};

// ========== AGENDAMENTOS ==========
const exportAgendamentosCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF';
  let csv = BOM;
  csv += 'RELATÓRIO DE AGENDAMENTOS\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  csv += 'INDICADORES DE AGENDAMENTOS\n';
  csv += 'Indicador,Valor\n';
  csv += `Total de Agendamentos,${data.totalAppointments}\n`;
  csv += `Agendamentos Concluídos,${data.completedAppointments}\n`;
  csv += `Agendamentos Cancelados,${data.cancelledAppointments}\n`;
  csv += `Taxa de Conclusão,${data.totalAppointments > 0 ? ((data.completedAppointments / data.totalAppointments) * 100).toFixed(1) : '0.0'}%\n`;
  csv += `Taxa de Cancelamento,${data.cancelRate.toFixed(1)}%\n\n`;
  
  csv += 'AGENDAMENTOS POR DIA DA SEMANA\n';
  csv += 'Dia,Quantidade\n';
  data.weekdayData.forEach(day => {
    csv += `${day.name},${day.agendamentos}\n`;
  });
  
  return csv;
};

const exportAgendamentosPDF = (data: ReportData) => {
  return `
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Total de Agendamentos</div>
        <div class="kpi-value">${data.totalAppointments}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Concluídos</div>
        <div class="kpi-value">${data.completedAppointments}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cancelados</div>
        <div class="kpi-value">${data.cancelledAppointments}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Taxa de Cancelamento</div>
        <div class="kpi-value">${data.cancelRate.toFixed(1)}%</div>
      </div>
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
  `;
};

// ========== SERVIÇOS ==========
const exportServicosCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF';
  let csv = BOM;
  csv += 'RELATÓRIO DE SERVIÇOS\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  const totalServices = data.serviceData.reduce((acc, s) => acc + s.value, 0);
  
  csv += 'INDICADORES DE SERVIÇOS\n';
  csv += 'Indicador,Valor\n';
  csv += `Total de Serviços Realizados,${totalServices}\n`;
  csv += `Tipos de Serviços,${data.serviceData.length}\n\n`;
  
  csv += 'SERVIÇOS MAIS REALIZADOS\n';
  csv += 'Serviço,Quantidade,Percentual\n';
  data.serviceData.forEach(service => {
    const percent = totalServices > 0 ? ((service.value / totalServices) * 100).toFixed(1) : '0.0';
    csv += `${service.name},${service.value},${percent}%\n`;
  });
  
  return csv;
};

const exportServicosPDF = (data: ReportData) => {
  const totalServices = data.serviceData.reduce((acc, s) => acc + s.value, 0);
  
  return `
    <div class="kpis" style="grid-template-columns: repeat(2, 1fr);">
      <div class="kpi">
        <div class="kpi-label">Total de Serviços</div>
        <div class="kpi-value">${totalServices}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Tipos de Serviços</div>
        <div class="kpi-value">${data.serviceData.length}</div>
      </div>
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
  `;
};

// ========== DESEMPENHO ==========
const exportDesempenhoCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF';
  let csv = BOM;
  csv += 'RELATÓRIO DE DESEMPENHO\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  const taxaConversao = data.totalAppointments > 0 ? ((data.completedAppointments / data.totalAppointments) * 100) : 0;
  
  csv += 'INDICADORES DE DESEMPENHO\n';
  csv += 'Indicador,Valor\n';
  csv += `Ticket Médio,${formatCurrency(data.ticketMedio)}\n`;
  csv += `Taxa de Conversão,${taxaConversao.toFixed(1)}%\n`;
  csv += `Taxa de Cancelamento,${data.cancelRate.toFixed(1)}%\n`;
  csv += `Agendamentos Concluídos,${data.completedAppointments}\n\n`;
  
  csv += 'EVOLUÇÃO DIÁRIA\n';
  csv += 'Data,Receita,Despesa\n';
  data.dailyData.forEach(day => {
    csv += `${day.name},${formatCurrency(day.receita)},${formatCurrency(day.despesa)}\n`;
  });
  
  return csv;
};

const exportDesempenhoPDF = (data: ReportData) => {
  const taxaConversao = data.totalAppointments > 0 ? ((data.completedAppointments / data.totalAppointments) * 100) : 0;
  
  return `
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value">${formatCurrency(data.ticketMedio)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Taxa de Conversão</div>
        <div class="kpi-value">${taxaConversao.toFixed(1)}%</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Taxa de Cancelamento</div>
        <div class="kpi-value">${data.cancelRate.toFixed(1)}%</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Concluídos</div>
        <div class="kpi-value">${data.completedAppointments}</div>
      </div>
    </div>
    <div class="section">
      <h2>Evolução Diária</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th class="text-right">Receita</th>
            <th class="text-right">Despesa</th>
          </tr>
        </thead>
        <tbody>
          ${data.dailyData.map(day => `
            <tr>
              <td>${day.name}</td>
              <td class="text-right">${formatCurrency(day.receita)}</td>
              <td class="text-right">${formatCurrency(day.despesa)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ========== CLIENTES ==========
const exportClientesCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF';
  let csv = BOM;
  csv += 'RELATÓRIO DE CLIENTES\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  csv += 'INDICADORES DE CLIENTES\n';
  csv += 'Indicador,Valor\n';
  csv += `Total de Atendimentos,${data.totalAppointments}\n`;
  csv += `Atendimentos Concluídos,${data.completedAppointments}\n`;
  csv += `Ticket Médio por Cliente,${formatCurrency(data.ticketMedio)}\n`;
  csv += `Taxa de Retorno,${data.totalAppointments > 0 ? ((data.completedAppointments / data.totalAppointments) * 100).toFixed(1) : '0.0'}%\n\n`;
  
  csv += 'SERVIÇOS MAIS PROCURADOS\n';
  csv += 'Serviço,Quantidade\n';
  data.serviceData.forEach(service => {
    csv += `${service.name},${service.value}\n`;
  });
  
  return csv;
};

const exportClientesPDF = (data: ReportData) => {
  return `
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Total de Atendimentos</div>
        <div class="kpi-value">${data.totalAppointments}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Concluídos</div>
        <div class="kpi-value">${data.completedAppointments}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Ticket Médio</div>
        <div class="kpi-value">${formatCurrency(data.ticketMedio)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Taxa de Retorno</div>
        <div class="kpi-value">${data.totalAppointments > 0 ? ((data.completedAppointments / data.totalAppointments) * 100).toFixed(1) : '0.0'}%</div>
      </div>
    </div>
    <div class="section">
      <h2>Serviços Mais Procurados</h2>
      <table>
        <thead>
          <tr>
            <th>Serviço</th>
            <th class="text-center">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          ${data.serviceData.map(service => `
            <tr>
              <td>${service.name}</td>
              <td class="text-center">${service.value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ========== HORÁRIOS ==========
const exportHorariosCSV = (data: ReportData, dateRange?: DateRange) => {
  const BOM = '\uFEFF';
  let csv = BOM;
  csv += 'RELATÓRIO DE HORÁRIOS\n';
  csv += `Período: ${formatDateRange(dateRange)}\n`;
  csv += `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}\n\n`;
  
  const totalAgendamentos = data.weekdayData.reduce((acc, d) => acc + d.agendamentos, 0);
  const diaMaisMovimentado = data.weekdayData.reduce((max, d) => d.agendamentos > max.agendamentos ? d : max, data.weekdayData[0]);
  const diaMenosMovimentado = data.weekdayData.reduce((min, d) => d.agendamentos < min.agendamentos ? d : min, data.weekdayData[0]);
  
  csv += 'INDICADORES DE HORÁRIOS\n';
  csv += 'Indicador,Valor\n';
  csv += `Total de Agendamentos,${totalAgendamentos}\n`;
  csv += `Dia Mais Movimentado,${diaMaisMovimentado?.name || '-'}\n`;
  csv += `Dia Menos Movimentado,${diaMenosMovimentado?.name || '-'}\n`;
  csv += `Média por Dia,${(totalAgendamentos / 7).toFixed(1)}\n\n`;
  
  csv += 'AGENDAMENTOS POR DIA DA SEMANA\n';
  csv += 'Dia,Quantidade,Percentual\n';
  data.weekdayData.forEach(day => {
    const percent = totalAgendamentos > 0 ? ((day.agendamentos / totalAgendamentos) * 100).toFixed(1) : '0.0';
    csv += `${day.name},${day.agendamentos},${percent}%\n`;
  });
  
  return csv;
};

const exportHorariosPDF = (data: ReportData) => {
  const totalAgendamentos = data.weekdayData.reduce((acc, d) => acc + d.agendamentos, 0);
  const diaMaisMovimentado = data.weekdayData.reduce((max, d) => d.agendamentos > max.agendamentos ? d : max, data.weekdayData[0]);
  const diaMenosMovimentado = data.weekdayData.reduce((min, d) => d.agendamentos < min.agendamentos ? d : min, data.weekdayData[0]);
  
  return `
    <div class="kpis">
      <div class="kpi">
        <div class="kpi-label">Total de Agendamentos</div>
        <div class="kpi-value">${totalAgendamentos}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Dia Mais Movimentado</div>
        <div class="kpi-value">${diaMaisMovimentado?.name || '-'}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Dia Menos Movimentado</div>
        <div class="kpi-value">${diaMenosMovimentado?.name || '-'}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Média por Dia</div>
        <div class="kpi-value">${(totalAgendamentos / 7).toFixed(1)}</div>
      </div>
    </div>
    <div class="section">
      <h2>Agendamentos por Dia da Semana</h2>
      <table>
        <thead>
          <tr>
            <th>Dia</th>
            <th class="text-center">Quantidade</th>
            <th class="text-right">Percentual</th>
          </tr>
        </thead>
        <tbody>
          ${data.weekdayData.map(day => `
            <tr>
              <td>${day.name}</td>
              <td class="text-center">${day.agendamentos}</td>
              <td class="text-right">${totalAgendamentos > 0 ? ((day.agendamentos / totalAgendamentos) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// ========== EXPORT FUNCTIONS ==========
export const exportToCSV = (data: ReportData, dateRange?: DateRange, reportType?: ReportType) => {
  let csv: string;
  
  switch (reportType) {
    case 'financeiro':
      csv = exportFinanceiroCSV(data, dateRange);
      break;
    case 'agendamentos':
      csv = exportAgendamentosCSV(data, dateRange);
      break;
    case 'servicos':
      csv = exportServicosCSV(data, dateRange);
      break;
    case 'desempenho':
      csv = exportDesempenhoCSV(data, dateRange);
      break;
    case 'clientes':
      csv = exportClientesCSV(data, dateRange);
      break;
    case 'horarios':
      csv = exportHorariosCSV(data, dateRange);
      break;
    default:
      csv = exportFinanceiroCSV(data, dateRange);
  }
  
  const fileName = reportType 
    ? `relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
    : `relatorio_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (data: ReportData, dateRange?: DateRange, reportType?: ReportType) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para exportar o PDF');
    return;
  }

  let reportContent: string;
  const title = reportType ? getReportTitle(reportType) : 'Relatório Gerencial';
  
  switch (reportType) {
    case 'financeiro':
      reportContent = exportFinanceiroPDF(data);
      break;
    case 'agendamentos':
      reportContent = exportAgendamentosPDF(data);
      break;
    case 'servicos':
      reportContent = exportServicosPDF(data);
      break;
    case 'desempenho':
      reportContent = exportDesempenhoPDF(data);
      break;
    case 'clientes':
      reportContent = exportClientesPDF(data);
      break;
    case 'horarios':
      reportContent = exportHorariosPDF(data);
      break;
    default:
      reportContent = exportFinanceiroPDF(data);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
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
        <h1>${title}</h1>
        <p>Período: ${formatDateRange(dateRange)}</p>
        <p>Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
      </div>

      ${reportContent}

      <div class="footer">
        Relatório gerado automaticamente pelo sistema - powered by Onelord
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
