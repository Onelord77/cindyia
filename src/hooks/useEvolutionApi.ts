import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EvolutionAction = 
  | 'create-instance' 
  | 'get-qrcode' 
  | 'connect' 
  | 'disconnect' 
  | 'delete-instance' 
  | 'get-status'
  | 'fetch-instances';

interface EvolutionInstance {
  instanceName: string;
  instanceId?: string;
  status?: string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

interface ConnectionState {
  instance: string;
  state: 'open' | 'close' | 'connecting';
}

interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export function useEvolutionApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);

  const callEvolutionApi = async (
    action: EvolutionAction, 
    instanceName?: string,
    webhookUrl?: string
  ) => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para usar esta funcionalidade');
        return null;
      }

      const response = await supabase.functions.invoke('evolution-api', {
        body: { action, instanceName, webhookUrl },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data;
    } catch (error) {
      console.error('Evolution API error:', error);
      toast.error(`Erro na API Evolution: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInstances = async () => {
    const result = await callEvolutionApi('fetch-instances');
    if (result?.success && Array.isArray(result.data)) {
      setInstances(result.data);
      return result.data;
    }
    return [];
  };

  const createInstance = async (instanceName: string, webhookUrl?: string) => {
    const result = await callEvolutionApi('create-instance', instanceName, webhookUrl);
    if (result?.success) {
      toast.success('Instância criada com sucesso!');
      // If QR code is returned immediately, set it
      if (result.data?.qrcode?.base64) {
        setQrCode(result.data.qrcode.base64);
      }
      await fetchInstances();
      return result.data;
    }
    return null;
  };

  const getQRCode = async (instanceName: string) => {
    const result = await callEvolutionApi('get-qrcode', instanceName);
    if (result?.success) {
      const qrData = result.data as QRCodeResponse;
      if (qrData?.base64) {
        setQrCode(qrData.base64);
        return qrData;
      } else if (qrData?.code) {
        // Sometimes the QR code comes as a different format
        setQrCode(qrData.code);
        return qrData;
      }
    }
    return null;
  };

  const getConnectionStatus = async (instanceName: string) => {
    const result = await callEvolutionApi('get-status', instanceName);
    if (result?.success) {
      setConnectionState(result.data as ConnectionState);
      return result.data;
    }
    return null;
  };

  const connectInstance = async (instanceName: string) => {
    const result = await callEvolutionApi('connect', instanceName);
    if (result?.success) {
      // Check if we got a QR code
      if (result.data?.base64) {
        setQrCode(result.data.base64);
      }
      toast.info('Conectando instância...');
      return result.data;
    }
    return null;
  };

  const disconnectInstance = async (instanceName: string) => {
    const result = await callEvolutionApi('disconnect', instanceName);
    if (result?.success) {
      setQrCode(null);
      setConnectionState(null);
      toast.success('Instância desconectada!');
      await fetchInstances();
      return result.data;
    }
    return null;
  };

  const deleteInstance = async (instanceName: string) => {
    const result = await callEvolutionApi('delete-instance', instanceName);
    if (result?.success) {
      setQrCode(null);
      setConnectionState(null);
      toast.success('Instância excluída!');
      await fetchInstances();
      return result.data;
    }
    return null;
  };

  const clearQRCode = () => {
    setQrCode(null);
  };

  return {
    isLoading,
    qrCode,
    connectionState,
    instances,
    fetchInstances,
    createInstance,
    getQRCode,
    getConnectionStatus,
    connectInstance,
    disconnectInstance,
    deleteInstance,
    clearQRCode,
  };
}
