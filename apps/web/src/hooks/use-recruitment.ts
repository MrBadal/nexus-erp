'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { get, post, endpoints } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobOpening {
  id: string;
  tenantId: string;
  title: string;
  departmentId: string;
  designationId: string;
  status: 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled';
  positions: number;
  filledPositions: number;
  description: string;
  requirements: string;
  location: string;
  employmentType: string;
  minSalary: string;
  maxSalary: string;
  publishDate: string;
  closingDate: string;
  hiringManager: string;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  tenantId: string;
  jobOpeningId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  currentCompany: string;
  currentDesignation: string;
  experienceYears: number;
  currentSalary: string;
  expectedSalary: string;
  source: string;
  status: 'new' | 'screening' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected' | 'withdrawn';
  rating: number;
  notes: string;
  appliedAt: string;
  hiredEmployeeId: string;
  jobTitle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  tenantId: string;
  candidateId: string;
  round: number;
  scheduledAt: string;
  duration: number;
  location: string;
  meetingLink: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback: string;
  rating: number;
  completedAt: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Job Openings – full CRUD
// ---------------------------------------------------------------------------

const jobCrud = createCrudHooks<JobOpening>('jobOpenings', {
  list: endpoints.jobOpenings.list,
  get: endpoints.jobOpenings.get,
  create: endpoints.jobOpenings.create,
  update: endpoints.jobOpenings.update,
  delete: endpoints.jobOpenings.delete,
});

export const useJobOpenings = jobCrud.useList;
export const useJobOpening = jobCrud.useById;
export const useCreateJobOpening = jobCrud.useCreate;
export const useUpdateJobOpening = jobCrud.useUpdate;
export const useDeleteJobOpening = jobCrud.useDelete;
export const jobOpeningKeys = jobCrud.queryKeys;

export const usePublishJobOpening = createStatusActionHook<JobOpening>(
  'jobOpenings',
  'publish',
  endpoints.jobOpenings.publish,
);

export const useCloseJobOpening = createStatusActionHook<JobOpening>(
  'jobOpenings',
  'close',
  endpoints.jobOpenings.close,
);

// ---------------------------------------------------------------------------
// Candidates – full CRUD
// ---------------------------------------------------------------------------

const candidateCrud = createCrudHooks<Candidate>('candidates', {
  list: endpoints.candidates.list,
  get: endpoints.candidates.get,
  create: endpoints.candidates.create,
  update: endpoints.candidates.update,
  delete: endpoints.candidates.delete,
});

export const useCandidates = candidateCrud.useList;
export const useCandidate = candidateCrud.useById;
export const useCreateCandidate = candidateCrud.useCreate;
export const useUpdateCandidate = candidateCrud.useUpdate;
export const useDeleteCandidate = candidateCrud.useDelete;
export const candidateKeys = candidateCrud.queryKeys;

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------

export function useCandidateInterviews(candidateId: string) {
  return useQuery({
    queryKey: ['interviews', candidateId],
    queryFn: () => get<Interview[]>(endpoints.candidates.interviews(candidateId)),
    enabled: !!candidateId,
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post<Interview>(endpoints.recruitmentInterviews.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useCompleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; feedback: string; rating: number }) =>
      post(endpoints.recruitmentInterviews.complete(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export function useCreateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      post(endpoints.recruitmentOffers.create, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useAcceptOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post(endpoints.recruitmentOffers.accept(id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['jobOpenings'] });
    },
  });
}

export function useRejectOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post(endpoints.recruitmentOffers.reject(id), {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Hire
// ---------------------------------------------------------------------------

export function useHireCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, joiningDate }: { id: string; joiningDate: string }) =>
      post(endpoints.candidates.hire(id), { joiningDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
