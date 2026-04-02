import React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

      {/* Area Select */}
      <div className="space-y-2">
        <label className="text-sm font-bold">المنطقة <span className="text-destructive">*</span></label>
        <Select
          value={area}
          onValueChange={onAreaChange}
          disabled={disabled || !governorate}
          dir={dir}
        >
          <SelectTrigger className="bg-muted/50 rounded-xl h-11">
            <SelectValue placeholder={governorate ? 'اختر المنطقة...' : 'اختر المحافظة أولاً'} />
          </SelectTrigger>
          <SelectContent dir={dir}>
            {areas.map(a => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {governorate && !area && (
          <p className="text-xs text-muted-foreground">اختر المنطقة من القائمة</p>
        )}
      </div>
    </div>
  );
}
