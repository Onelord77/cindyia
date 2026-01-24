import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface OnboardingFormData {
  companyName: string;
  phone: string;
  address: string;
  email: string;
  openTime: string;
  closeTime: string;
  workingDays: string[];
  notifyOnConfirmation: boolean;
  notifyOnReminder: boolean;
  reminderHours: string;
  notifyOnCancellation: boolean;
}

interface CompanyInfoStepProps {
  data: OnboardingFormData;
  onChange: <K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) => void;
}

export function CompanyInfoStep({ data, onChange }: CompanyInfoStepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">Nome da Empresa *</Label>
        <Input
          id="companyName"
          placeholder="Nome do seu estabelecimento"
          value={data.companyName}
          onChange={(e) => onChange('companyName', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone para contato *</Label>
        <Input
          id="phone"
          placeholder="(11) 99999-9999"
          value={data.phone}
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Endereço *</Label>
        <Textarea
          id="address"
          placeholder="Rua, número, bairro, cidade - UF"
          value={data.address}
          onChange={(e) => onChange('address', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail *</Label>
        <Input
          id="email"
          type="email"
          placeholder="contato@suaempresa.com"
          value={data.email}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </div>
    </div>
  );
}
