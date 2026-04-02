import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const areas = getAreasByGovernorate(governorate);
  const filtered = search.trim()
    ? areas.filter(a => a.includes(search.trim()))
    : areas;

  const handleGovernorateChange = (value: string) => {
    onGovernorateChange(value);
    onAreaChange('');
    setSearch('');
    setAreaOpen(false);
  };

  const handleSelect = (val: string) => {
    onAreaChange(val);
    setAreaOpen(false);
    setSearch('');
  };

  const handleOpen = () => {
    if (disabled || !governorate) return;
    setAreaOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Close on outside click
  useEffect(() => {
    if (!areaOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAreaOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [areaOpen]);

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {/* Governorate Select */}
      <div className="space-y-2">
        <label className="text-sm font-bold">
          المحافظة <span className="text-destructive">*</span>
        </label>
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

      {/* Area custom dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-bold">
          المنطقة <span className="text-destructive">*</span>
        </label>
        <div ref={containerRef} className="relative">
          {/* Trigger button */}
          <button
            type="button"
            onClick={handleOpen}
            disabled={disabled || !governorate}
            dir={dir}
            className={cn(
              'w-full h-11 px-3 flex items-center justify-between rounded-xl border border-input bg-muted/50 text-sm font-normal transition-colors',
              'hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !area && 'text-muted-foreground'
            )}
          >
            <span className="truncate">
              {area || (governorate ? 'اختر المنطقة...' : 'اختر المحافظة أولاً')}
            </span>
            <ChevronsUpDown className="w-4 h-4 opacity-50 shrink-0 ms-2" />
          </button>

          {/* Dropdown */}
          {areaOpen && (
            <div
              className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-xl border border-white/10 bg-gray-900 text-gray-100 shadow-2xl"
              dir={dir}
            >
              {/* Search */}
              <div className="p-2 border-b border-white/10">
                <Input
                  ref={inputRef}
                  placeholder="ابحث عن المنطقة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 bg-white/10 border-white/20 text-gray-100 placeholder:text-gray-400 rounded-lg focus-visible:ring-white/30"
                  dir={dir}
                />
              </div>

              {/* List */}
              <div
                style={{ maxHeight: '192px', overflowY: 'auto', overscrollBehavior: 'contain' }}
              >
                {filtered.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">لا توجد نتائج</p>
                ) : (
                  filtered.map(a => (
                    <button
                      key={a}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleSelect(a)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-100 hover:bg-white/10 transition-colors',
                        dir === 'rtl' ? 'text-right' : 'text-left',
                        area === a && 'bg-white/10'
                      )}
                    >
                      <Check className={cn('h-4 w-4 shrink-0', area === a ? 'opacity-100' : 'opacity-0')} />
                      {a}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {governorate && !area && (
          <p className="text-xs text-muted-foreground">اختر المنطقة من القائمة</p>
        )}
      </div>
    </div>
  );
}
