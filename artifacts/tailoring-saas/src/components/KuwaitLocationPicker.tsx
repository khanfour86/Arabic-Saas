import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { KUWAIT_GOVERNORATES, getAreasByGovernorate } from '@/lib/kuwaitLocations';

interface KuwaitLocationPickerProps {
  governorate: string;
  area: string;
  onGovernorateChange: (governorate: string) => void;
  onAreaChange: (area: string) => void;
  dir?: 'rtl' | 'ltr';
  disabled?: boolean;
  className?: string;
}

export function KuwaitLocationPicker({
  governorate,
  area,
  onGovernorateChange,
  onAreaChange,
  dir = 'rtl',
  disabled = false,
  className,
}: KuwaitLocationPickerProps) {
  const [areaOpen, setAreaOpen] = useState(false);

  const areas = getAreasByGovernorate(governorate);

  const handleGovernorateChange = (value: string) => {
    onGovernorateChange(value);
    onAreaChange('');
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* Governorate Select */}
      <div className="space-y-2">
        <label className="text-sm font-bold">المحافظة <span className="text-destructive">*</span></label>
        <Select
          value={governorate}
          onValueChange={handleGovernorateChange}
          disabled={disabled}
          dir={dir}
        >
          <SelectTrigger className="bg-muted/50 rounded-xl h-11">
            <SelectValue placeholder="اختر المحافظة..." />
          </SelectTrigger>
          <SelectContent dir={dir}>
            {KUWAIT_GOVERNORATES.map(gov => (
              <SelectItem key={gov.value} value={gov.value}>
                {gov.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!governorate && (
          <p className="text-xs text-muted-foreground">يجب اختيار المحافظة أولاً</p>
        )}
      </div>

      {/* Area Combobox */}
      <div className="space-y-2">
        <label className="text-sm font-bold">المنطقة <span className="text-destructive">*</span></label>
        <Popover open={areaOpen} onOpenChange={setAreaOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={areaOpen}
              disabled={disabled || !governorate}
              className={cn(
                'w-full h-11 justify-between rounded-xl bg-muted/50 border-input font-normal',
                !area && 'text-muted-foreground'
              )}
              dir={dir}
            >
              <span className="truncate">
                {area || (governorate ? 'ابحث عن المنطقة...' : 'اختر المحافظة أولاً')}
              </span>
              <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 ms-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0 rounded-xl border border-white/10 bg-gray-900 text-gray-100 shadow-2xl"
            dir={dir}
          >
            <Command className="bg-transparent text-gray-100">
              <CommandInput
                placeholder="ابحث..."
                className="h-9 text-gray-100 placeholder:text-gray-400 border-b border-white/10"
                dir={dir}
              />
              <CommandList>
                <CommandEmpty className="py-3 text-center text-sm text-gray-400">لا توجد نتائج</CommandEmpty>
                <CommandGroup>
                  {areas.map(a => (
                    <CommandItem
                      key={a}
                      value={a}
                      className="text-gray-100 aria-selected:bg-white/10 hover:bg-white/10 cursor-pointer"
                      onSelect={(val) => {
                        onAreaChange(val === area ? '' : val);
                        setAreaOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'me-2 h-4 w-4 shrink-0',
                          area === a ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {a}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {governorate && !area && (
          <p className="text-xs text-muted-foreground">اختر المنطقة من القائمة</p>
        )}
      </div>
    </div>
  );
}
