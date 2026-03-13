'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  currency?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({
  value, onChange, currency = 'USD', disabled, placeholder = '0.00', className,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;

  const formatted = !isFocused
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numValue)
    : numValue === 0 ? '' : String(numValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(raw);
    onChange(isNaN(parsed) ? 0 : parsed);
  }, [onChange]);

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : currency === 'INR' ? '\u20B9' : currency;

  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {currencySymbol}
      </span>
      <Input
        type={isFocused ? 'number' : 'text'}
        value={formatted}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn('pl-7 text-right font-mono text-sm h-8', className)}
        step="0.01"
      />
    </div>
  );
}
