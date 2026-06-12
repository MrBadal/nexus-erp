'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, endpoints } from '@/lib/api';

export interface NumberSeries {
  id: string;
  tenantId: string;
  documentType: string;
  prefix: string;
  suffix: string | null;
  currentNumber: number;
  padLength: number;
  fiscalYear: string;
  resetAnnually: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useNumberSeriesList() {
  return useQuery({
    queryKey: ['numberSeries'],
    queryFn: () => get<NumberSeries[]>(endpoints.numberSeries.list),
  });
}

export function useUpdateNumberSeries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; prefix?: string; suffix?: string; padLength?: number; resetAnnually?: boolean }) =>
      put<NumberSeries>(endpoints.numberSeries.update(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numberSeries'] });
    },
  });
}
