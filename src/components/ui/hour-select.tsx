import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface HourSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHour?: number;
  maxHour?: number;
}

export const HourSelect = ({
  value,
  onChange,
  placeholder = "Wybierz godzinę",
  className,
  minHour = 0,
  maxHour = 23,
}: HourSelectProps) => {
  const hours = Array.from(
    { length: maxHour - minHour + 1 },
    (_, i) => minHour + i
  );

  // Convert "HH:MM" format to "HH:00" or just use the value
  const normalizedValue = value ? value.slice(0, 2) + ":00" : "";

  return (
    <Select value={normalizedValue} onValueChange={onChange}>
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {hours.map((hour) => {
          const hourStr = String(hour).padStart(2, "0") + ":00";
          return (
            <SelectItem key={hour} value={hourStr}>
              {hourStr}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
