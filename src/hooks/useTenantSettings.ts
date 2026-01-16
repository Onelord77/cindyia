import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface TenantSettings {
  // Company settings
  companyName: string;
  phone: string;
  address: string;
  email: string;
  whatsapp: string;
  
  // Scheduling settings
  openTime: string;
  closeTime: string;
  workingDays: string[];
  
  // Cancellation settings
  allowCancellation: boolean;
  cancelHoursMinimum: string;
  
  // Notification settings
  notifyOnConfirmation: boolean;
  notifyOnReminder: boolean;
  reminderHours: string;
  notifyOnCancellation: boolean;
}

const defaultSettings: TenantSettings = {
  companyName: '',
  phone: '',
  address: '',
  email: '',
  whatsapp: '',
  openTime: '09:00',
  closeTime: '19:00',
  workingDays: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
  allowCancellation: true,
  cancelHoursMinimum: '2',
  notifyOnConfirmation: true,
  notifyOnReminder: true,
  reminderHours: '2',
  notifyOnCancellation: true,
};

// Função helper para ajustar horários dos funcionários (fora do hook)
async function adjustEmployeeWorkingHoursHelper(
  tenantId: string,
  openTime: string,
  closeTime: string,
  workingDays: string[]
): Promise<number> {
  try {
    // Busca todos os funcionários do tenant
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, working_hours')
      .eq('tenant_id', tenantId);

    if (fetchError) {
      console.error('Error fetching employees:', fetchError);
      return 0;
    }

    if (!employees || employees.length === 0) return 0;

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    let adjustedCount = 0;

    for (const employee of employees) {
      const workingHours = (employee.working_hours as Record<string, { enabled: boolean; start: string; end: string }>) || {};
      let needsUpdate = false;
      const adjustedHours: Record<string, { enabled: boolean; start: string; end: string }> = {};

      // Para cada dia da semana
      const allDays = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
      for (const day of allDays) {
        const daySchedule = workingHours[day] || { enabled: false, start: '09:00', end: '18:00' };
        
        // Se o dia não está nos dias de funcionamento da empresa, desabilita
        if (!workingDays.includes(day) && daySchedule.enabled) {
          adjustedHours[day] = { ...daySchedule, enabled: false };
          needsUpdate = true;
          continue;
        }

        // Se o dia está habilitado, ajusta os horários
        if (daySchedule.enabled) {
          const [startH, startM] = daySchedule.start.split(':').map(Number);
          const [endH, endM] = daySchedule.end.split(':').map(Number);
          const startMins = startH * 60 + startM;
          const endMins = endH * 60 + endM;

          let newStart = daySchedule.start;
          let newEnd = daySchedule.end;

          // Ajusta horário de início se estiver antes da abertura
          if (startMins < openMins) {
            newStart = openTime;
            needsUpdate = true;
          }

          // Ajusta horário de fim se estiver depois do fechamento
          if (endMins > closeMins) {
            newEnd = closeTime;
            needsUpdate = true;
          }

          adjustedHours[day] = { enabled: true, start: newStart, end: newEnd };
        } else {
          adjustedHours[day] = daySchedule;
        }
      }

      // Se precisa atualizar, faz o update
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('employees')
          .update({ working_hours: adjustedHours })
          .eq('id', employee.id);

        if (!updateError) {
          adjustedCount++;
        }
      }
    }

    return adjustedCount;
  } catch (error) {
    console.error('Error adjusting employee hours:', error);
    return 0;
  }
}

export function useTenantSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<TenantSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch tenant settings
  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get user's tenant_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setLoading(false);
        return;
      }

      if (!profile?.tenant_id) {
        console.log('No tenant_id found for user');
        setLoading(false);
        return;
      }

      setTenantId(profile.tenant_id);

      // Fetch tenant data
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name, email, phone, address, settings')
        .eq('id', profile.tenant_id)
        .single();

      if (tenantError) {
        console.error('Error fetching tenant:', tenantError);
        setLoading(false);
        return;
      }

      // Merge tenant base data with settings
      const storedSettings = (tenant.settings as Record<string, unknown>) || {};
      
      setSettings({
        companyName: tenant.name || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        email: tenant.email || '',
        whatsapp: (storedSettings.whatsapp as string) || '',
        openTime: (storedSettings.openTime as string) || '09:00',
        closeTime: (storedSettings.closeTime as string) || '19:00',
        workingDays: (storedSettings.workingDays as string[]) || ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
        allowCancellation: storedSettings.allowCancellation !== false,
        cancelHoursMinimum: (storedSettings.cancelHoursMinimum as string) || '2',
        notifyOnConfirmation: storedSettings.notifyOnConfirmation !== false,
        notifyOnReminder: storedSettings.notifyOnReminder !== false,
        reminderHours: (storedSettings.reminderHours as string) || '2',
        notifyOnCancellation: storedSettings.notifyOnCancellation !== false,
      });
    } catch (error) {
      console.error('Error in fetchSettings:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Save settings
  const saveSettings = useCallback(async (newSettings: TenantSettings) => {
    if (!tenantId) {
      toast.error('Tenant não encontrado');
      return false;
    }

    try {
      setSaving(true);

      // Separate base tenant fields from settings
      const { companyName, phone, address, email, ...restSettings } = newSettings;

      const { error } = await supabase
        .from('tenants')
        .update({
          name: companyName,
          phone,
          address,
          email,
          settings: restSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (error) {
        console.error('Error saving settings:', error);
        toast.error('Erro ao salvar configurações');
        return false;
      }

      // Ajusta horários dos funcionários automaticamente
      const adjustedCount = await adjustEmployeeWorkingHoursHelper(
        tenantId,
        newSettings.openTime,
        newSettings.closeTime,
        newSettings.workingDays
      );

      setSettings(newSettings);
      
      if (adjustedCount > 0) {
        toast.success(`Configurações salvas! ${adjustedCount} funcionário(s) tiveram horários ajustados.`);
      } else {
        toast.success('Configurações salvas com sucesso!');
      }
      
      return true;
    } catch (error) {
      console.error('Error in saveSettings:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    } finally {
      setSaving(false);
    }
  }, [tenantId]);

  // Update single setting locally
  const updateSetting = useCallback(<K extends keyof TenantSettings>(
    key: K,
    value: TenantSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Toggle working day
  const toggleWorkingDay = useCallback((dayKey: string) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(dayKey)
        ? prev.workingDays.filter(d => d !== dayKey)
        : [...prev.workingDays, dayKey]
    }));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    updateSetting,
    toggleWorkingDay,
    refetch: fetchSettings,
  };
}
