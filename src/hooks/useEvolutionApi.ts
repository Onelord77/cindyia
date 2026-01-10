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
    // Validate instanceName for actions that require it
    const actionsRequiringInstance: EvolutionAction[] = [
      'create-instance', 'get-qrcode', 'connect', 'disconnect', 'delete-instance', 'get-status'
    ];
    
    if (actionsRequiringInstance.includes(action) && (!instanceName || instanceName.trim() === '')) {
      console.error('Evolution API: instanceName is required for action:', action);
      toast.error('Nome da instância é obrigatório');
      return null;
    }

    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para usar esta funcionalidade');
        return null;
      }

      // Ensure instanceName is trimmed and properly sent
      const requestBody = {
        action,
        instanceName: instanceName?.trim() || undefined,
        webhookUrl: webhookUrl?.trim() || undefined,
      };

      console.log('Evolution API request:', { action, instanceName: requestBody.instanceName });

      const response = await supabase.functions.invoke('evolution-api', {
        body: requestBody,
      });

      if (response.error) {
        console.error('Evolution API response error:', response.error);
        throw new Error(response.error.message);
      }

      // Check if the response indicates an error from Evolution API
      if (response.data && !response.data.success && response.data.error) {
        throw new Error(response.data.error);
      }

      console.log('Evolution API response:', response.data);
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
      // Normalize instances - Evolution API returns array of objects with different structures
      const normalizedInstances: EvolutionInstance[] = result.data.map((item: Record<string, unknown>) => {
        // Handle both flat structure and nested instance structure
        const instance = (item.instance || item) as Record<string, unknown>;
        return {
          instanceName: String(instance.instanceName || instance.name || ''),
          instanceId: instance.instanceId ? String(instance.instanceId) : undefined,
          status: String(instance.status || instance.state || 'close'),
          owner: instance.owner ? String(instance.owner) : undefined,
          profileName: instance.profileName ? String(instance.profileName) : undefined,
          profilePictureUrl: instance.profilePictureUrl ? String(instance.profilePictureUrl) : undefined,
        };
      }).filter((inst: EvolutionInstance) => inst.instanceName); // Filter out invalid instances
      
      console.log('Fetched instances:', normalizedInstances);
      setInstances(normalizedInstances);
      return normalizedInstances;
    }
    setInstances([]);
    return [];
  };

  const createInstance = async (instanceName: string, webhookUrl?: string) => {
    // Validate instanceName before calling API
    const trimmedName = instanceName?.trim();
    if (!trimmedName) {
      toast.error('Nome da instância é obrigatório');
      return null;
    }

    const result = await callEvolutionApi('create-instance', trimmedName, webhookUrl);
    if (result?.success) {
      toast.success('Instância criada com sucesso!');
      
      // If QR code is returned immediately, set it
      if (result.data?.qrcode?.base64) {
        setQrCode(result.data.qrcode.base64);
      }
      
      // Refresh instances list to show the new instance
      await fetchInstances();
      
      // Return the instance name for reference
      return { ...result.data, instanceName: trimmedName };
    }
    return null;
  };

  const getQRCode = async (instanceName: string) => {
    if (!instanceName || instanceName.trim() === '') {
      console.error('getQRCode: instanceName is empty');
      toast.error('Nome da instância não informado');
      return null;
    }

    const result = await callEvolutionApi('get-qrcode', instanceName.trim());
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
    const trimmedName = instanceName?.trim();
    if (!trimmedName) {
      console.error('getConnectionStatus: instanceName is empty');
      return null;
    }

    const result = await callEvolutionApi('get-status', trimmedName);
    if (result?.success) {
      // Update the instance status in the list
      setInstances(prev => prev.map(inst => 
        inst.instanceName === trimmedName 
          ? { ...inst, status: (result.data as ConnectionState)?.state || inst.status }
          : inst
      ));
      setConnectionState(result.data as ConnectionState);
      return result.data;
    }
    return null;
  };

  const connectInstance = async (instanceName: string) => {
    if (!instanceName || instanceName.trim() === '') {
      console.error('connectInstance: instanceName is empty');
      toast.error('Nome da instância não informado');
      return null;
    }

    const result = await callEvolutionApi('connect', instanceName.trim());
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
    const trimmedName = instanceName?.trim();
    if (!trimmedName) {
      toast.error('Nome da instância é obrigatório');
      return null;
    }

    const result = await callEvolutionApi('disconnect', trimmedName);
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
    const trimmedName = instanceName?.trim();
    if (!trimmedName) {
      toast.error('Nome da instância é obrigatório');
      return null;
    }

    const result = await callEvolutionApi('delete-instance', trimmedName);
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
