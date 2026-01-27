import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type WhatsAppAction = 'create-instance' | 'connect' | 'disconnect' | 'delete-instance' | 'get-status' | 'fetch-instances' | 'set-webhook' | 'set-webhook-all';

export interface WhatsAppInstance {
  instanceName: string;
  instanceId?: string;
  status?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export interface ConnectionState {
  instance: {
    state: 'connected' | 'disconnected' | 'connecting';
    profileName?: string;
    profilePicUrl?: string;
  };
  qrcode?: string;
}

export function useWhatsappApi() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingStartRef = useRef<number>(0);

  const callWhatsappApi = useCallback(async (action: WhatsAppAction, instanceName?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Sessão expirada. Faça login novamente.');
      return null;
    }

    const { data, error } = await supabase.functions.invoke('whatsapp-api', {
      body: { action, instanceName },
    });

    if (error) {
      console.error(`WhatsApp API error (${action}):`, error);
      throw new Error(error.message || 'Erro na comunicação com a API');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }, []);

  const fetchInstances = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await callWhatsappApi('fetch-instances');
      if (Array.isArray(data)) {
        setInstances(data);
      }
      return data;
    } catch (error) {
      console.error('Error fetching instances:', error);
      toast.error('Erro ao buscar instâncias');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callWhatsappApi]);

  const createInstance = useCallback(async (instanceName: string) => {
    try {
      const data = await callWhatsappApi('create-instance', instanceName);
      if (data?.success) {
        toast.success('Instância criada com sucesso!');
        await fetchInstances();
      }
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar instância');
      throw error;
    }
  }, [callWhatsappApi, fetchInstances]);

  const connectInstance = useCallback(async (instanceName: string) => {
    try {
      const data = await callWhatsappApi('connect', instanceName);
      if (data?.qrcode) {
        setQrCode(data.qrcode);
      }
      setConnectionState('connecting');
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar instância');
      throw error;
    }
  }, [callWhatsappApi]);

  const getConnectionStatus = useCallback(async (instanceName: string) => {
    try {
      const data = await callWhatsappApi('get-status', instanceName);
      if (data?.instance) {
        setConnectionState(data.instance.state);
        if (data.qrcode) {
          setQrCode(data.qrcode);
        }
      }
      return data;
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  }, [callWhatsappApi]);

  const disconnectInstance = useCallback(async (instanceName: string) => {
    try {
      await callWhatsappApi('disconnect', instanceName);
      toast.success('Instância desconectada');
      setConnectionState('disconnected');
      await fetchInstances();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar');
      throw error;
    }
  }, [callWhatsappApi, fetchInstances]);

  const deleteInstance = useCallback(async (instanceName: string) => {
    try {
      await callWhatsappApi('delete-instance', instanceName);
      toast.success('Instância removida');
      await fetchInstances();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover instância');
      throw error;
    }
  }, [callWhatsappApi, fetchInstances]);

  const setWebhook = useCallback(async (instanceName: string) => {
    try {
      await callWhatsappApi('set-webhook', instanceName);
    } catch (error) {
      console.error('Error setting webhook:', error);
    }
  }, [callWhatsappApi]);

  const setWebhookAll = useCallback(async () => {
    try {
      const data = await callWhatsappApi('set-webhook-all');
      return data;
    } catch (error) {
      console.error('Error setting webhook for all instances:', error);
      return null;
    }
  }, [callWhatsappApi]);

  const startStatusPolling = useCallback((instanceName: string, onConnected?: () => void) => {
    stopStatusPolling();
    pollingStartRef.current = Date.now();

    pollingRef.current = setInterval(async () => {
      // Stop after 2 minutes
      if (Date.now() - pollingStartRef.current > 120000) {
        stopStatusPolling();
        toast.error('Tempo esgotado para conexão');
        return;
      }

      const data = await getConnectionStatus(instanceName);
      if (data?.instance?.state === 'connected') {
        stopStatusPolling();
        toast.success('WhatsApp conectado com sucesso!');
        await setWebhook(instanceName);
        await fetchInstances();
        onConnected?.();
      }
    }, 3000);
  }, [getConnectionStatus, fetchInstances, setWebhook]);

  const stopStatusPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearQRCode = useCallback(() => {
    setQrCode(null);
  }, []);

  return {
    instances,
    isLoading,
    qrCode,
    connectionState,
    fetchInstances,
    createInstance,
    connectInstance,
    getConnectionStatus,
    disconnectInstance,
    deleteInstance,
    startStatusPolling,
    stopStatusPolling,
    clearQRCode,
    setWebhookAll,
  };
}
