import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  placeholder = "Selecione o período",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pendingRange, setPendingRange] = React.useState<DateRange | undefined>(dateRange);

  // Sync pending range when popover opens
  React.useEffect(() => {
    if (open) setPendingRange(dateRange);
  }, [open]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal min-h-[44px] sm:w-[280px]",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={pendingRange?.from || dateRange?.from}
            selected={pendingRange}
            onSelect={setPendingRange}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto"
          />
          <div className="flex gap-2 p-3 pt-0 border-t mt-1 pt-3">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                onDateRangeChange(pendingRange);
                setOpen(false);
              }}
            >
              <Check className="h-3 w-3 mr-1" /> OK
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setPendingRange(undefined);
                onDateRangeChange(undefined);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3 mr-1" /> Resetar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
