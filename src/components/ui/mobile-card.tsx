import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileCardField {
  label: string;
  value: React.ReactNode;
}

interface MobileCardProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  fields: MobileCardField[];
  actions?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MobileCard({
  title,
  subtitle,
  badge,
  avatar,
  fields,
  actions,
  className,
  onClick,
}: MobileCardProps) {
  return (
    <Card
      className={cn(
        'p-4 transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50 active:bg-muted',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        {avatar && <div className="flex-shrink-0">{avatar}</div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2 mb-3">
          {fields.map((field, index) => (
            <div key={index} className="flex justify-between items-center text-sm gap-2">
              <span className="text-muted-foreground flex-shrink-0">{field.label}</span>
              <span className="text-right truncate">{field.value}</span>
            </div>
          ))}
        </div>
      )}

      {actions && (
        <div className="pt-3 border-t border-border">{actions}</div>
      )}
    </Card>
  );
}
