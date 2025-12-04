import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShiftType, CustomShiftHours } from "@/types/user";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HourSelect } from "@/components/ui/hour-select";
import { cn } from "@/lib/utils";

interface ShiftCalendarProps {
  shifts: Record<string, ShiftType>;
  onChange: (shifts: Record<string, ShiftType>, customHours?: Record<string, CustomShiftHours>) => void;
  customShiftHours?: Record<string, CustomShiftHours>;
}

const SHIFT_INFO: Record<ShiftType, { label: string; hours: string; color: string; isCustom?: boolean }> = {
  'Z-1': { label: 'Z-1', hours: '6-14', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  'Z-2': { label: 'Z-2', hours: '10-18', color: 'bg-green-100 text-green-900 border-green-300' },
  'Z-3': { label: 'Z-3', hours: '15-23', color: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  'CUST': { label: 'CUST', hours: '', color: 'bg-purple-100 text-purple-900 border-purple-300', isCustom: true },
  'WOLNY': { label: 'Dzień wolny', hours: '', color: 'bg-red-50 text-red-600 border-red-200' },
};

const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

export const ShiftCalendar = ({ shifts, onChange, customShiftHours = {} }: ShiftCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [applyToAll, setApplyToAll] = useState(false);
  const [localCustomHours, setLocalCustomHours] = useState<Record<string, CustomShiftHours>>(customShiftHours);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  // Convert to Monday = 0
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
  
  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const handleShiftSelect = (date: string, shiftType: ShiftType, applyToAllDays: boolean = false, customHours?: CustomShiftHours) => {
    const newShifts = { ...shifts };
    const newCustomHours = { ...localCustomHours };
    
    if (applyToAllDays) {
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const checkDate = new Date(year, month, day);
        if (checkDate.getDay() === dayOfWeek) {
          const dateString = getDateString(day);
          newShifts[dateString] = shiftType;
          if (customHours && SHIFT_INFO[shiftType].isCustom) {
            newCustomHours[dateString] = customHours;
          }
        }
      }
    } else {
      newShifts[date] = shiftType;
      if (customHours && SHIFT_INFO[shiftType].isCustom) {
        newCustomHours[date] = customHours;
      }
    }
    
    setLocalCustomHours(newCustomHours);
    onChange(newShifts, newCustomHours);
    setApplyToAll(false);
  };
  
  const getDateString = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  const getDisplayHours = (dateString: string, shift: ShiftType) => {
    if (SHIFT_INFO[shift].isCustom && localCustomHours[dateString]) {
      return `${localCustomHours[dateString].start}-${localCustomHours[dateString].end}`;
    }
    return SHIFT_INFO[shift].hours;
  };
  
  const renderDay = (day: number) => {
    const dateString = getDateString(day);
    const shift = shifts[dateString];
    const date = new Date(year, month, day);
    const dayName = DAYS[date.getDay() === 0 ? 6 : date.getDay() - 1];
    const [open, setOpen] = useState(false);
    const [customStart, setCustomStart] = useState("08:00");
    const [customEnd, setCustomEnd] = useState("16:00");
    
    const handleShiftClick = (shiftType: ShiftType) => {
      if (SHIFT_INFO[shiftType].isCustom) {
        handleShiftSelect(dateString, shiftType, applyToAll, { start: customStart, end: customEnd });
      } else {
        handleShiftSelect(dateString, shiftType, applyToAll);
      }
      setOpen(false);
    };
    
    const displayHours = shift ? getDisplayHours(dateString, shift) : '';
    
    return (
      <Popover key={day} open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "h-16 border rounded-lg p-1 text-sm font-medium transition-all hover:shadow-md",
              shift ? SHIFT_INFO[shift].color : "bg-background hover:bg-muted"
            )}
          >
            <div className="text-xs font-semibold">{day}</div>
            {shift && (
              <div className="text-xs mt-1">
                <div className="font-bold">{SHIFT_INFO[shift].label}</div>
                {displayHours && (
                  <div className="text-[10px]">{displayHours}</div>
                )}
              </div>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="text-sm font-semibold mb-2">Wybierz zmianę</div>
            
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox 
                id={`apply-all-${day}`}
                checked={applyToAll}
                onCheckedChange={(checked) => setApplyToAll(checked as boolean)}
              />
              <Label 
                htmlFor={`apply-all-${day}`}
                className="text-xs cursor-pointer"
              >
                Zastosuj na wszystkie {dayName}
              </Label>
            </div>
            
            {/* Standard shifts */}
            {(['Z-1', 'Z-2', 'Z-3', 'WOLNY'] as ShiftType[]).map((shiftType) => (
              <Button
                key={shiftType}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => handleShiftClick(shiftType)}
              >
                <div className="flex justify-between w-full">
                  <span className="font-semibold">{SHIFT_INFO[shiftType].label}</span>
                  <span className="text-muted-foreground">{SHIFT_INFO[shiftType].hours}</span>
                </div>
              </Button>
            ))}
            
            {/* Custom shifts section */}
            <div className="pt-2 border-t">
              <div className="text-xs font-semibold mb-2">Własne godziny:</div>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <Label className="text-[10px]">Od</Label>
                  <HourSelect 
                    value={customStart} 
                    onChange={setCustomStart}
                    minHour={6}
                    maxHour={22}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-[10px]">Do</Label>
                  <HourSelect 
                    value={customEnd} 
                    onChange={setCustomEnd}
                    minHour={6}
                    maxHour={23}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => handleShiftClick('CUST')}
              >
                Zapisz jako CUST
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };
  
  const renderCalendar = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-16" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(renderDay(day));
    }
    
    return days;
  };
  
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={previousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-lg font-semibold">
            {MONTHS[month]} {year}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={nextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day) => (
            <div key={day} className="text-center text-sm font-semibold text-muted-foreground">
              {day}
            </div>
          ))}
          {renderCalendar()}
        </div>
        
        <div className="pt-4 border-t">
          <div className="text-sm font-semibold mb-2">Legenda:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {(['Z-1', 'Z-2', 'Z-3'] as ShiftType[]).map((shiftType) => (
              <div key={shiftType} className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded border", SHIFT_INFO[shiftType].color)} />
                <span>{SHIFT_INFO[shiftType].label} ({SHIFT_INFO[shiftType].hours})</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border", SHIFT_INFO['WOLNY'].color)} />
              <span>Dzień wolny</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border", SHIFT_INFO['CUST'].color)} />
              <span>CUST (własne)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
