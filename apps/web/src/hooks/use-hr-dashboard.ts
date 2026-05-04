'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';

export interface HrUpcomingBirthday {
  id: string;
  name: string;
  dateOfBirth: string | null;
  department: string | null;
  daysUntil: number;
}

export interface HrUpcomingAnniversary {
  id: string;
  name: string;
  dateOfJoining: string;
  department: string | null;
  yearsCompleted: number;
  daysUntil: number;
}

export interface HrOpenJobOpening {
  id: string;
  title: string;
  department: string | null;
  positions: number;
  filledPositions: number;
  applicantCount: number;
}

export interface HrDepartmentDistribution {
  departmentId: string | null;
  name: string;
  count: number;
}

export interface HrGenderRatio {
  male: number;
  female: number;
  other: number;
  unspecified: number;
}

export interface HrDashboardData {
  totalActiveEmployees: number;
  onLeaveToday: number;
  attendancePctCurrentMonth: number;
  pendingLeaveApprovals: number;
  pendingExpenseApprovals: number;
  pendingRegularizationRequests: number;
  upcomingBirthdays: HrUpcomingBirthday[];
  upcomingWorkAnniversaries: HrUpcomingAnniversary[];
  openJobOpenings: HrOpenJobOpening[];
  newHiresLast30Days: number;
  exitsLast30Days: number;
  genderRatio: HrGenderRatio;
  departmentDistribution: HrDepartmentDistribution[];
}

const hrDashboardKeys = {
  all: ['hr-dashboard'] as const,
};

export function useHrDashboard() {
  return useQuery({
    queryKey: hrDashboardKeys.all,
    queryFn: () => get<HrDashboardData>('/hr/dashboard'),
    staleTime: 60_000,
  });
}
