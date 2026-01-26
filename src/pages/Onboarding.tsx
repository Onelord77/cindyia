import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Calendar, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { CompanyInfoStep, type OnboardingFormData } from '@/components/onboarding/CompanyInfoStep';
import { ScheduleStep } from '@/components/onboarding/ScheduleStep';
import { NotificationsStep } from '@/components/onboarding/NotificationsStep';
import { unmaskPhone } from '@/lib/utils';

const STEP_LABELS = ['Empresa', 'Horários', 'Notificações'];
const TOTAL_STEPS = 3;

const initialFormData: OnboardingFormData = {
  companyName: '',
  phone: '',
  address: '',
  email: '',
  openTime: '09:00',
  closeTime: '19:00',
  workingDays: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'],
  notifyOnConfirmation: true,
  notifyOnReminder: true,
  reminderHours: '2',
  notifyOnCancellation: true,
};

export default function Onboarding() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = <K extends keyof OnboardingFormData>(
    key: K,
    value: OnboardingFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const isStep1Valid = () => {
    return (
      formData.companyName.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.address.trim() !== '' &&
      formData.email.trim() !== ''
    );
  };

  const isStep2Valid = () => {
    return (
      formData.openTime !== '' &&
      formData.closeTime !== '' &&
      formData.workingDays.length > 0
    );
  };

  const isCurrentStepValid = () => {
    switch (currentStep) {
      case 1:
        return isStep1Valid();
      case 2:
        return isStep2Valid();
      case 3:
        return true; // Notifications always have valid defaults
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    if (!user?.id) return;

    setIsSaving(true);

    try {
      // Get tenant_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        toast.error('Erro ao identificar sua empresa');
        setIsSaving(false);
        return;
      }

      const { companyName, phone, address, email, ...settingsData } = formData;

      // Save tenant data + mark onboarding as completed
      const { error } = await supabase
        .from('tenants')
        .update({
          name: companyName,
          phone: unmaskPhone(phone),
          address,
          email,
          settings: settingsData,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.tenant_id);

      if (error) {
        console.error('Error saving onboarding:', error);
        toast.error('Erro ao salvar configurações');
        setIsSaving(false);
        return;
      }

      toast.success('Configurações salvas com sucesso!');
      // Full page reload to ensure fresh onboarding status
      window.location.href = '/';
    } catch (error) {
      console.error('Error in onboarding finish:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Configure seu estabelecimento</CardTitle>
          <CardDescription>
            Preencha as informações abaixo para começar a usar o CindyIA
          </CardDescription>
          <div className="pt-4">
            <StepIndicator
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              labels={STEP_LABELS}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === 1 && (
            <CompanyInfoStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 2 && (
            <ScheduleStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 3 && (
            <NotificationsStep data={formData} onChange={handleChange} />
          )}

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isSaving}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button
                onClick={handleNext}
                disabled={!isCurrentStepValid()}
                className="gap-2"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Concluir
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
