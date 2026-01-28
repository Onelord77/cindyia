import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SaasStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function SaasStatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  size = 'md'
}: SaasStatsCardProps) {
  const variants = {
    default: 'bg-card',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
    danger: 'bg-destructive/5 border-destructive/20',
  };

  const iconVariants = {
    default: 'bg-secondary text-secondary-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-6',
  };

  const valueClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const TrendIcon = trend?.value && trend.value > 0
    ? TrendingUp
    : trend?.value && trend.value < 0
      ? TrendingDown
      : Minus;

  return (
    <Card className={cn('border transition-all duration-200 hover:shadow-lg animate-fade-in', variants[variant])}>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('font-bold tracking-tight', valueClasses[size])}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn('inline-flex items-center gap-1 text-xs font-medium', getTrendColor())}>
                <TrendIcon className="h-3 w-3" />
                <span>{trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%</span>
                {trend.label && (
                  <span className="text-muted-foreground">{trend.label}</span>
                )}
              </div>
            )}
          </div>
          <div className={cn('rounded-xl p-3', iconVariants[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
