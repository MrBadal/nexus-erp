'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { endpoints } from '@/lib/api';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
}

export interface ExchangeRate {
  id: string;
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  effectiveDate: string;
  source: string;
}

export const currencyKeys = {
  all: ['currencies'] as const,
  list: () => [...currencyKeys.all, 'list'] as const,
  exchangeRates: () => [...currencyKeys.all, 'exchangeRates'] as const,
};

export function useCurrencies() {
  return useQuery({
    queryKey: currencyKeys.list(),
    queryFn: () => get<Currency[]>(endpoints.currencies.list),
    staleTime: 60_000,
  });
}

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Currency>) =>
      post<Currency>(endpoints.currencies.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
    },
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, ...data }: { code: string } & Partial<Currency>) =>
      put<Currency>(endpoints.currencies.update(code), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.all });
    },
  });
}

export function useExchangeRates() {
  return useQuery({
    queryKey: currencyKeys.exchangeRates(),
    queryFn: () => get<ExchangeRate[]>(endpoints.currencies.exchangeRates),
    staleTime: 60_000,
  });
}

export function useSetExchangeRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { fromCurrency: string; toCurrency: string; rate: string; effectiveDate: string; source?: string }) =>
      post<ExchangeRate>(endpoints.currencies.setExchangeRate, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: currencyKeys.exchangeRates() });
    },
  });
}
