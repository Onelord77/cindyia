-- =============================================================
-- SEED DE DADOS DE TESTE - CindyIA
-- Execute no SQL Editor do Supabase: bvlejewukfsnubtryjlo
-- =============================================================
-- ANTES DE RODAR: verifique seu tenant_id executando:
--   SELECT id, name FROM tenants LIMIT 5;
-- e substitua na variável abaixo se necessário.
-- O script auto-detecta o primeiro tenant ativo.
-- =============================================================

DO $$
DECLARE
  v_tenant_id UUID;
  v_emp1 UUID := gen_random_uuid();
  v_emp2 UUID := gen_random_uuid();
  v_emp3 UUID := gen_random_uuid();

  v_svc_corte UUID := gen_random_uuid();
  v_svc_coloracao UUID := gen_random_uuid();
  v_svc_escova UUID := gen_random_uuid();
  v_svc_hidratacao UUID := gen_random_uuid();
  v_svc_manicure UUID := gen_random_uuid();
  v_svc_pedicure UUID := gen_random_uuid();
  v_svc_sobrancelha UUID := gen_random_uuid();
  v_svc_depilacao UUID := gen_random_uuid();
  v_svc_massagem UUID := gen_random_uuid();

  v_cli1 UUID := gen_random_uuid();
  v_cli2 UUID := gen_random_uuid();
  v_cli3 UUID := gen_random_uuid();
  v_cli4 UUID := gen_random_uuid();
  v_cli5 UUID := gen_random_uuid();
  v_cli6 UUID := gen_random_uuid();
  v_cli7 UUID := gen_random_uuid();
  v_cli8 UUID := gen_random_uuid();

  v_apt1 UUID := gen_random_uuid();
  v_apt2 UUID := gen_random_uuid();
  v_apt3 UUID := gen_random_uuid();
  v_apt4 UUID := gen_random_uuid();
  v_apt5 UUID := gen_random_uuid();
  v_apt6 UUID := gen_random_uuid();
  v_apt7 UUID := gen_random_uuid();
  v_apt8 UUID := gen_random_uuid();
  v_apt9 UUID := gen_random_uuid();
  v_apt10 UUID := gen_random_uuid();
  v_apt11 UUID := gen_random_uuid();
  v_apt12 UUID := gen_random_uuid();

  v_lead1 UUID := gen_random_uuid();
  v_lead2 UUID := gen_random_uuid();
  v_lead3 UUID := gen_random_uuid();
  v_lead4 UUID := gen_random_uuid();

  v_tag1 UUID := gen_random_uuid();
  v_tag2 UUID := gen_random_uuid();
  v_tag3 UUID := gen_random_uuid();

  v_now TIMESTAMPTZ := NOW();
BEGIN

  -- Auto-detecta tenant
  SELECT id INTO v_tenant_id FROM tenants WHERE status = 'active' ORDER BY created_at LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum tenant ativo encontrado. Crie sua conta primeiro.';
  END IF;

  RAISE NOTICE 'Usando tenant_id: %', v_tenant_id;

  -- =============================================================
  -- FUNCIONÁRIOS
  -- =============================================================
  INSERT INTO employees (id, tenant_id, name, email, phone, role, commission_rate, is_active, specialties, working_hours)
  VALUES
    (v_emp1, v_tenant_id, 'Ana Paula Silva', 'ana.paula@salao.com', '(11) 91234-5678', 'Cabeleireira', 40.00, true,
      ARRAY['Corte', 'Coloração', 'Escova', 'Hidratação'],
      '{"monday":{"start":"08:00","end":"18:00"},"tuesday":{"start":"08:00","end":"18:00"},"wednesday":{"start":"08:00","end":"18:00"},"thursday":{"start":"08:00","end":"18:00"},"friday":{"start":"08:00","end":"17:00"},"saturday":{"start":"08:00","end":"13:00"}}'::jsonb),
    (v_emp2, v_tenant_id, 'Mariana Costa', 'mariana.costa@salao.com', '(11) 92345-6789', 'Manicure', 45.00, true,
      ARRAY['Manicure', 'Pedicure', 'Sobrancelha'],
      '{"monday":{"start":"09:00","end":"19:00"},"tuesday":{"start":"09:00","end":"19:00"},"wednesday":{"start":"09:00","end":"19:00"},"thursday":{"start":"09:00","end":"19:00"},"friday":{"start":"09:00","end":"19:00"}}'::jsonb),
    (v_emp3, v_tenant_id, 'Fernanda Oliveira', 'fernanda.oliveira@salao.com', '(11) 93456-7890', 'Esteticista', 50.00, true,
      ARRAY['Depilação', 'Massagem', 'Hidratação'],
      '{"tuesday":{"start":"10:00","end":"20:00"},"wednesday":{"start":"10:00","end":"20:00"},"thursday":{"start":"10:00","end":"20:00"},"friday":{"start":"10:00","end":"20:00"},"saturday":{"start":"09:00","end":"15:00"}}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- SERVIÇOS
  -- =============================================================
  INSERT INTO services (id, tenant_id, name, description, price, duration, category, is_active)
  VALUES
    (v_svc_corte,       v_tenant_id, 'Corte Feminino',     'Corte personalizado para todos os tipos de cabelo', 80.00,  60,  'Cabelo',     true),
    (v_svc_coloracao,   v_tenant_id, 'Coloração Completa', 'Coloração com produtos profissionais Wella',        200.00, 180, 'Cabelo',     true),
    (v_svc_escova,      v_tenant_id, 'Escova Progressiva', 'Escova progressiva com produto de qualidade',       250.00, 180, 'Cabelo',     true),
    (v_svc_hidratacao,  v_tenant_id, 'Hidratação Capilar', 'Hidratação profunda com ativação a vapor',          90.00,  60,  'Cabelo',     true),
    (v_svc_manicure,    v_tenant_id, 'Manicure Simples',   'Esmaltação simples com corte e lixamento',          40.00,  45,  'Unhas',      true),
    (v_svc_pedicure,    v_tenant_id, 'Pedicure Completa',  'Pedicure com esfoliação e hidratação dos pés',      55.00,  60,  'Unhas',      true),
    (v_svc_sobrancelha, v_tenant_id, 'Design de Sobrancelha', 'Design e modelagem com henna',                  45.00,  30,  'Estética',   true),
    (v_svc_depilacao,   v_tenant_id, 'Depilação Pernas',   'Depilação completa com cera quente',               80.00,  60,  'Depilação',  true),
    (v_svc_massagem,    v_tenant_id, 'Massagem Relaxante', 'Massagem corporal relaxante 60 minutos',           120.00,  60,  'Estética',   true)
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- VÍNCULO FUNCIONÁRIO x SERVIÇO
  -- =============================================================
  INSERT INTO employee_services (employee_id, service_id)
  VALUES
    (v_emp1, v_svc_corte),
    (v_emp1, v_svc_coloracao),
    (v_emp1, v_svc_escova),
    (v_emp1, v_svc_hidratacao),
    (v_emp2, v_svc_manicure),
    (v_emp2, v_svc_pedicure),
    (v_emp2, v_svc_sobrancelha),
    (v_emp3, v_svc_hidratacao),
    (v_emp3, v_svc_depilacao),
    (v_emp3, v_svc_massagem)
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- CLIENTES
  -- =============================================================
  INSERT INTO clients (id, tenant_id, name, email, phone, birth_date, notes, total_visits, last_visit, is_lead)
  VALUES
    (v_cli1, v_tenant_id, 'Juliana Ferreira',    'juliana.f@email.com',   '(11) 94567-8901', '1990-03-15', 'Prefere agendamentos pela manhã',     8,  v_now - INTERVAL '5 days',  false),
    (v_cli2, v_tenant_id, 'Camila Rodrigues',    'camila.r@email.com',    '(11) 95678-9012', '1985-07-22', 'Alergia a amônia - usar só sem amônia', 3,  v_now - INTERVAL '12 days', false),
    (v_cli3, v_tenant_id, 'Patrícia Souza',      'patricia.s@email.com',  '(11) 96789-0123', '1995-11-08', NULL,                                  12, v_now - INTERVAL '3 days',  false),
    (v_cli4, v_tenant_id, 'Renata Lima',         'renata.l@email.com',    '(11) 97890-1234', '1988-01-30', 'VIP - sempre priorizar agenda',        5,  v_now - INTERVAL '20 days', false),
    (v_cli5, v_tenant_id, 'Beatriz Alves',       'beatriz.a@email.com',   '(11) 98901-2345', '2000-06-14', NULL,                                  1,  v_now - INTERVAL '30 days', false),
    (v_cli6, v_tenant_id, 'Larissa Mendes',      'larissa.m@email.com',   '(11) 99012-3456', '1993-09-25', 'Vem com a filha às vezes',            6,  v_now - INTERVAL '7 days',  false),
    (v_cli7, v_tenant_id, 'Gabriela Santos',     'gabriela.s@email.com',  '(11) 90123-4567', '1997-12-03', NULL,                                  2,  v_now - INTERVAL '45 days', false),
    (v_cli8, v_tenant_id, 'Isabela Pereira',     'isabela.p@email.com',   '(11) 91234-0000', '1982-04-19', 'Cliente antiga - desconto fidelidade', 20, v_now - INTERVAL '2 days',  false)
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- AGENDAMENTOS (passados, presentes e futuros)
  -- =============================================================
  INSERT INTO appointments (id, tenant_id, client_id, employee_id, service_id, scheduled_at, duration, status, payment_status, price, notes)
  VALUES
    -- Passados concluídos
    (v_apt1,  v_tenant_id, v_cli1, v_emp1, v_svc_corte,      v_now - INTERVAL '10 days' + TIME '09:00', 60,  'completed', 'paid',    80.00,  NULL),
    (v_apt2,  v_tenant_id, v_cli3, v_emp1, v_svc_coloracao,  v_now - INTERVAL '8 days'  + TIME '10:00', 180, 'completed', 'paid',   200.00,  'Cliente ficou muito satisfeita'),
    (v_apt3,  v_tenant_id, v_cli8, v_emp2, v_svc_manicure,   v_now - INTERVAL '7 days'  + TIME '14:00', 45,  'completed', 'paid',    40.00,  NULL),
    (v_apt4,  v_tenant_id, v_cli2, v_emp3, v_svc_massagem,   v_now - INTERVAL '5 days'  + TIME '11:00', 60,  'completed', 'paid',   120.00,  NULL),
    (v_apt5,  v_tenant_id, v_cli6, v_emp1, v_svc_escova,     v_now - INTERVAL '3 days'  + TIME '09:30', 180, 'completed', 'paid',   250.00,  NULL),
    (v_apt6,  v_tenant_id, v_cli4, v_emp2, v_svc_pedicure,   v_now - INTERVAL '2 days'  + TIME '15:00', 60,  'completed', 'partial', 55.00,  'Pagou 30 agora, restante semana que vem'),
    -- Cancelado
    (v_apt7,  v_tenant_id, v_cli5, v_emp1, v_svc_hidratacao, v_now - INTERVAL '4 days'  + TIME '13:00', 60,  'cancelled', 'pending', 90.00,  'Desmarcou no dia'),
    -- Hoje / Em andamento
    (v_apt8,  v_tenant_id, v_cli3, v_emp2, v_svc_sobrancelha, v_now::date + TIME '10:00', 30, 'in_progress', 'pending', 45.00, NULL),
    -- Hoje confirmado
    (v_apt9,  v_tenant_id, v_cli1, v_emp3, v_svc_depilacao,  v_now::date + TIME '14:00', 60,  'confirmed', 'pending',  80.00,  NULL),
    -- Futuros agendados
    (v_apt10, v_tenant_id, v_cli7, v_emp1, v_svc_corte,      v_now + INTERVAL '1 day'   + TIME '09:00', 60,  'scheduled', 'pending', 80.00,  NULL),
    (v_apt11, v_tenant_id, v_cli8, v_emp2, v_svc_manicure,   v_now + INTERVAL '2 days'  + TIME '11:00', 45,  'scheduled', 'pending', 40.00,  NULL),
    (v_apt12, v_tenant_id, v_cli2, v_emp1, v_svc_hidratacao, v_now + INTERVAL '3 days'  + TIME '10:00', 60,  'scheduled', 'pending', 90.00,  'Confirmar por WhatsApp')
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- LANÇAMENTOS FINANCEIROS
  -- =============================================================
  INSERT INTO financial_entries (tenant_id, appointment_id, type, category, description, amount, date, payment_method)
  VALUES
    -- Receitas de serviços (vinculadas a agendamentos)
    (v_tenant_id, v_apt1,  'income', 'Serviços',    'Corte Feminino - Juliana Ferreira',    80.00,  v_now - INTERVAL '10 days', 'pix'),
    (v_tenant_id, v_apt2,  'income', 'Serviços',    'Coloração Completa - Patrícia Souza',  200.00, v_now - INTERVAL '8 days',  'cartão_crédito'),
    (v_tenant_id, v_apt3,  'income', 'Serviços',    'Manicure - Isabela Pereira',           40.00,  v_now - INTERVAL '7 days',  'dinheiro'),
    (v_tenant_id, v_apt4,  'income', 'Serviços',    'Massagem Relaxante - Camila Rodrigues',120.00, v_now - INTERVAL '5 days',  'pix'),
    (v_tenant_id, v_apt5,  'income', 'Serviços',    'Escova Progressiva - Larissa Mendes',  250.00, v_now - INTERVAL '3 days',  'cartão_débito'),
    (v_tenant_id, v_apt6,  'income', 'Serviços',    'Pedicure - Renata Lima (parcial)',       30.00, v_now - INTERVAL '2 days',  'dinheiro'),
    -- Despesas operacionais
    (v_tenant_id, NULL,    'expense', 'Produtos',   'Compra de tinturas Wella',             350.00, v_now - INTERVAL '9 days',  'pix'),
    (v_tenant_id, NULL,    'expense', 'Produtos',   'Esmaltes e acetona',                    85.00, v_now - INTERVAL '6 days',  'dinheiro'),
    (v_tenant_id, NULL,    'expense', 'Aluguel',    'Aluguel do espaço - Abril',           1200.00, v_now - INTERVAL '15 days', 'transferência'),
    (v_tenant_id, NULL,    'expense', 'Utilities',  'Conta de luz',                         180.00, v_now - INTERVAL '12 days', 'débito_automático'),
    (v_tenant_id, NULL,    'expense', 'Salários',   'Comissão Ana Paula - semana 1',        320.00, v_now - INTERVAL '4 days',  'transferência'),
    (v_tenant_id, NULL,    'expense', 'Salários',   'Comissão Mariana - semana 1',          200.00, v_now - INTERVAL '4 days',  'transferência'),
    (v_tenant_id, NULL,    'expense', 'Marketing',  'Impulsionamento Instagram',              80.00, v_now - INTERVAL '11 days', 'cartão_crédito'),
    (v_tenant_id, NULL,    'income',  'Outros',     'Venda de produtos (shampoo)',            65.00, v_now - INTERVAL '1 day',   'pix')
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- TAGS DE LEADS
  -- =============================================================
  INSERT INTO lead_tags (id, tenant_id, name, color)
  VALUES
    (v_tag1, v_tenant_id, 'Interessado',      '#22c55e'),
    (v_tag2, v_tenant_id, 'Aguardando Resp.', '#f59e0b'),
    (v_tag3, v_tenant_id, 'VIP Potencial',    '#8b5cf6')
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- LEADS DO WHATSAPP
  -- =============================================================
  INSERT INTO leads (id, tenant_id, whatsapp_number, name, status, source, first_contact_at, last_message_at)
  VALUES
    (v_lead1, v_tenant_id, '5511911112222', 'Tatiana Martins',  'in_conversation', 'whatsapp', v_now - INTERVAL '2 days', v_now - INTERVAL '1 hour'),
    (v_lead2, v_tenant_id, '5511922223333', 'Roberta Gomes',    'new',             'whatsapp', v_now - INTERVAL '6 hours', v_now - INTERVAL '6 hours'),
    (v_lead3, v_tenant_id, '5511933334444', 'Claudia Neves',    'scheduled',       'whatsapp', v_now - INTERVAL '5 days', v_now - INTERVAL '1 day'),
    (v_lead4, v_tenant_id, '5511944445555', 'Simone Barros',    'not_scheduled',   'whatsapp', v_now - INTERVAL '3 days', v_now - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- MENSAGENS DOS LEADS
  -- =============================================================
  INSERT INTO lead_messages (lead_id, direction, content, sent_at)
  VALUES
    -- Tatiana - conversa ativa
    (v_lead1, 'inbound',  'Oi! Vi o Instagram de vocês. Quanto custa o corte?',             v_now - INTERVAL '2 days'),
    (v_lead1, 'outbound', 'Olá Tatiana! Tudo bem? Nosso corte feminino é R$ 80. 😊 Quer agendar?', v_now - INTERVAL '2 days' + INTERVAL '5 minutes'),
    (v_lead1, 'inbound',  'Boa tarde! Sim, quero agendar para semana que vem',               v_now - INTERVAL '1 hour'),
    (v_lead1, 'outbound', 'Que ótimo! Temos horário na terça às 9h ou 14h. Qual prefere?',  v_now - INTERVAL '50 minutes'),

    -- Roberta - novo contato
    (v_lead2, 'inbound',  'Boa noite! Vocês fazem coloração?',                               v_now - INTERVAL '6 hours'),

    -- Claudia - agendou
    (v_lead3, 'inbound',  'Quero fazer escova progressiva',                                   v_now - INTERVAL '5 days'),
    (v_lead3, 'outbound', 'Oi Claudia! Nossa escova progressiva é R$ 250, dura em média 3h. Vem?', v_now - INTERVAL '5 days' + INTERVAL '10 minutes'),
    (v_lead3, 'inbound',  'Sim! Posso na sexta?',                                             v_now - INTERVAL '4 days'),
    (v_lead3, 'outbound', 'Perfeito! Agendei você na sexta às 10h com a Ana Paula. ✅',       v_now - INTERVAL '4 days' + INTERVAL '5 minutes'),
    (v_lead3, 'inbound',  'Obrigada!',                                                        v_now - INTERVAL '1 day'),

    -- Simone - não agendou
    (v_lead4, 'inbound',  'Oi, quanto custa a depilação completa?',                           v_now - INTERVAL '3 days'),
    (v_lead4, 'outbound', 'Olá! Pernas completas R$ 80. Gostaria de agendar?',               v_now - INTERVAL '3 days' + INTERVAL '8 minutes'),
    (v_lead4, 'inbound',  'Vou pensar e entro em contato',                                    v_now - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

  -- =============================================================
  -- TAGS NOS LEADS
  -- =============================================================
  INSERT INTO lead_tag_links (lead_id, tag_id)
  VALUES
    (v_lead1, v_tag1),
    (v_lead2, v_tag2),
    (v_lead3, v_tag1),
    (v_lead3, v_tag3),
    (v_lead4, v_tag2)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Seed concluído com sucesso para tenant: %', v_tenant_id;
  RAISE NOTICE '   - 3 funcionárias criadas';
  RAISE NOTICE '   - 9 serviços criados';
  RAISE NOTICE '   - 8 clientes criados';
  RAISE NOTICE '   - 12 agendamentos (passados, hoje, futuros)';
  RAISE NOTICE '   - 14 lançamentos financeiros';
  RAISE NOTICE '   - 4 leads do WhatsApp com mensagens';
  RAISE NOTICE '   - 3 tags de lead';

END $$;
