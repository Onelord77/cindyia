import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type EvolutionAction = 
  | 'create-instance' 
  | 'get-qrcode' 
  | 'connect' 
  | 'disconnect' 
  | 'delete-instance' 
  | 'get-status'
  | 'fetch-instances'
  | 'update-webhook';

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

// Normalize QR code to ensure correct format with data URI
const normalizeQRCode = (qrData: string | undefined): string | null => {
  if (!qrData) return null;
  
  // If already has data URI prefix, return as-is
  if (qrData.startsWith('data:image/')) {
    return qrData;
  }
  
  // Remove any whitespace or newlines that might corrupt the base64
  const cleanBase64 = qrData.replace(/\s/g, '');
  
  // Add data URI prefix for PNG
  return `data:image/png;base64,${cleanBase64}`;
};

export function useEvolutionApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
  const currentPollingInstanceRef = useRef<string | null>(null);

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
        
        // Get status from multiple possible sources
        // Evolution API can return: state, status, connectionStatus, or nested instance.state
        const rawStatus = 
          instance.state || 
          instance.status || 
          instance.connectionStatus ||
          item.state ||
          item.status ||
          'close';
        
        // Normalize status value to consistent format
        const statusStr = String(rawStatus).toLowerCase();
        let normalizedStatus = 'close';
        if (statusStr === 'open' || statusStr === 'connected' || statusStr === 'online') {
          normalizedStatus = 'open';
        } else if (statusStr === 'connecting' || statusStr === 'qrcode') {
          normalizedStatus = 'connecting';
        }
        
        return {
          instanceName: String(instance.instanceName || instance.name || item.instanceName || item.name || ''),
          instanceId: instance.instanceId ? String(instance.instanceId) : undefined,
          status: normalizedStatus,
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

  // Always fetch fresh QR code - no cache
  const getQRCode = async (instanceName: string, forceRefresh = true) => {
    if (!instanceName || instanceName.trim() === '') {
      console.error('getQRCode: instanceName is empty');
      toast.error('Nome da instância não informado');
      return null;
    }

    const trimmedName = instanceName.trim();
    
    // Clear existing QR code to force fresh fetch
    if (forceRefresh) {
      setQrCode(null);
    }

    console.log('getQRCode: Fetching fresh QR for instance:', trimmedName, 'timestamp:', Date.now());
    
    const result = await callEvolutionApi('get-qrcode', trimmedName);
    if (result?.success) {
      const qrData = result.data as QRCodeResponse;
      const rawQR = qrData?.base64 || qrData?.code;
      
      if (rawQR) {
        // Normalize and set QR code - never modify the base64 content
        const normalizedQR = normalizeQRCode(rawQR);
        console.log('getQRCode: QR received, length:', rawQR.length, 'normalized:', !!normalizedQR);
        setQrCode(normalizedQR);
        return { ...qrData, normalizedBase64: normalizedQR };
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

  // Stop any existing status polling
  const stopStatusPolling = useCallback(() => {
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
      statusPollingRef.current = null;
    }
    currentPollingInstanceRef.current = null;
  }, []);

  // Start polling for connection status
  const startStatusPolling = useCallback((instanceName: string, onConnected?: () => void) => {
    // Stop any existing polling
    stopStatusPolling();
    
    currentPollingInstanceRef.current = instanceName;
    
    const checkStatus = async () => {
      if (currentPollingInstanceRef.current !== instanceName) {
        stopStatusPolling();
        return;
      }
      
      try {
        const result = await callEvolutionApi('get-status', instanceName);
        if (result?.success) {
          const state = (result.data as ConnectionState)?.state;
          
          // Update instance status
          setInstances(prev => prev.map(inst => 
            inst.instanceName === instanceName 
              ? { ...inst, status: state || inst.status }
              : inst
          ));
          setConnectionState(result.data as ConnectionState);
          
          // If connected, stop polling and notify
          if (state === 'open') {
            stopStatusPolling();
            toast.success('WhatsApp conectado com sucesso!');
            setQrCode(null);
            onConnected?.();
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };
    
    // Check immediately
    checkStatus();
    
    // Then poll every 3 seconds
    statusPollingRef.current = setInterval(checkStatus, 3000);
    
    // Auto-stop after 2 minutes
    setTimeout(() => {
      if (currentPollingInstanceRef.current === instanceName) {
        stopStatusPolling();
      }
    }, 120000);
  }, [stopStatusPolling]);

  const connectInstance = async (instanceName: string) => {
    if (!instanceName || instanceName.trim() === '') {
      console.error('connectInstance: instanceName is empty');
      toast.error('Nome da instância não informado');
      return null;
    }

    const trimmedName = instanceName.trim();
    
    // Clear any cached QR code first
    setQrCode(null);
    
    console.log('connectInstance: Connecting instance:', trimmedName, 'timestamp:', Date.now());

    const result = await callEvolutionApi('connect', trimmedName);
    if (result?.success) {
      // Check if we got a QR code
      const rawQR = (result.data as QRCodeResponse)?.base64;
      if (rawQR) {
        const normalizedQR = normalizeQRCode(rawQR);
        console.log('connectInstance: QR received, length:', rawQR.length);
        setQrCode(normalizedQR);
      }
      toast.info('Escaneie o QR Code para conectar...');
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

    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para usar esta funcionalidade');
        return null;
      }

      const response = await supabase.functions.invoke('evolution-api', {
        body: { action: 'delete-instance', instanceName: trimmedName },
      });

      // Handle success OR 404 (instance already deleted)
      const isNotFoundError = response.data?.data?.status === 404 || 
        response.data?.data?.response?.message?.some?.((m: string) => m.includes('does not exist'));
      
      if (response.data?.success || isNotFoundError) {
        setQrCode(null);
        setConnectionState(null);
        
        // Remove instance from local state immediately
        setInstances(prev => prev.filter(inst => inst.instanceName !== trimmedName));
        
        if (isNotFoundError) {
          toast.success('Instância removida da lista!');
        } else {
          toast.success('Instância excluída!');
        }
        
        // Refresh from server to ensure sync
        await fetchInstances();
        return response.data?.data || { deleted: true };
      }

      // Handle other errors
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      throw new Error('Falha ao excluir instância');
    } catch (error) {
      console.error('Delete instance error:', error);
      toast.error(`Erro ao excluir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateInstanceWebhook = async (instanceName: string, webhookUrl?: string) => {
    const trimmedName = instanceName?.trim();
    if (!trimmedName) {
      toast.error('Nome da instância é obrigatório');
      return null;
    }

    const result = await callEvolutionApi('update-webhook', trimmedName, webhookUrl);
    if (result?.success) {
      toast.success(`Webhook atualizado para ${trimmedName}!`);
      return result.data;
    }
    return null;
  };

  const updateAllInstancesWebhook = async () => {
    const currentInstances = await fetchInstances();
    if (!currentInstances || currentInstances.length === 0) {
      toast.info('Nenhuma instância encontrada');
      return [];
    }

    const results = await Promise.all(
      currentInstances.map(async (instance) => {
        const result = await callEvolutionApi('update-webhook', instance.instanceName);
        return { instanceName: instance.instanceName, success: result?.success || false };
      })
    );

    const successCount = results.filter(r => r.success).length;
    toast.success(`Webhook atualizado em ${successCount}/${results.length} instâncias`);
    return results;
  };

  const clearQRCode = useCallback(() => {
    setQrCode(null);
    stopStatusPolling();
  }, [stopStatusPolling]);

  // Open QR code in new tab for easier scanning
  const openQRCodeInNewTab = useCallback(() => {
    if (!qrCode) return;
    
    // Create a new window with just the QR code image
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code WhatsApp</title>
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
            }
            img {
              max-width: 90vw;
              max-height: 90vh;
              image-rendering: pixelated;
            }
          </style>
        </head>
        <body>
          <img src="${qrCode}" alt="QR Code WhatsApp" />
        </body>
        </html>
      `);
      newWindow.document.close();
    }
  }, [qrCode]);

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
    updateInstanceWebhook,
    updateAllInstancesWebhook,
    clearQRCode,
    openQRCodeInNewTab,
    startStatusPolling,
    stopStatusPolling,
  };
}
