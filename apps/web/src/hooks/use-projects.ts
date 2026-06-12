'use client';

import { createCrudHooks, createStatusActionHook } from './create-crud-hooks';
import { endpoints } from '@/lib/api';

// ─── Projects ───────────────────────────────────────────────────────────────

const projectHooks = createCrudHooks('projects', {
  list: endpoints.projects.list,
  get: (id: string) => endpoints.projects.get(id),
  create: endpoints.projects.create,
  update: (id: string) => endpoints.projects.update(id),
  delete: (id: string) => endpoints.projects.delete(id),
});

export const useProjects = projectHooks.useList;
export const useProject = projectHooks.useById;
export const useCreateProject = projectHooks.useCreate;
export const useUpdateProject = projectHooks.useUpdate;
export const useDeleteProject = projectHooks.useDelete;

export const useActivateProject = createStatusActionHook('projects', 'activate', (id) => endpoints.projects.activate(id));
export const useHoldProject = createStatusActionHook('projects', 'hold', (id) => endpoints.projects.hold(id));
export const useCompleteProject = createStatusActionHook('projects', 'complete', (id) => endpoints.projects.complete(id));
export const useCancelProject = createStatusActionHook('projects', 'cancel', (id) => endpoints.projects.cancel(id));

// ─── Project Tasks ──────────────────────────────────────────────────────────

const taskHooks = createCrudHooks('projectTasks', {
  list: endpoints.projectTasks.list,
  get: (id: string) => endpoints.projectTasks.get(id),
  create: endpoints.projectTasks.create,
  update: (id: string) => endpoints.projectTasks.update(id),
  delete: (id: string) => endpoints.projectTasks.delete(id),
});

export const useProjectTasks = taskHooks.useList;
export const useProjectTask = taskHooks.useById;
export const useCreateProjectTask = taskHooks.useCreate;
export const useUpdateProjectTask = taskHooks.useUpdate;
export const useDeleteProjectTask = taskHooks.useDelete;

export const useCompleteTask = createStatusActionHook('projectTasks', 'complete', (id) => endpoints.projectTasks.complete(id));

// ─── Timesheets ─────────────────────────────────────────────────────────────

const timesheetHooks = createCrudHooks('timesheets', {
  list: endpoints.timesheets.list,
  get: (id: string) => endpoints.timesheets.get(id),
  create: endpoints.timesheets.create,
  update: (id: string) => endpoints.timesheets.update(id),
  delete: (id: string) => endpoints.timesheets.delete(id),
});

export const useTimesheets = timesheetHooks.useList;
export const useTimesheet = timesheetHooks.useById;
export const useCreateTimesheet = timesheetHooks.useCreate;
export const useUpdateTimesheet = timesheetHooks.useUpdate;
export const useDeleteTimesheet = timesheetHooks.useDelete;

export const useSubmitTimesheet = createStatusActionHook('timesheets', 'submit', (id) => endpoints.timesheets.submit(id));
export const useApproveTimesheet = createStatusActionHook('timesheets', 'approve', (id) => endpoints.timesheets.approve(id));
export const useRejectTimesheet = createStatusActionHook('timesheets', 'reject', (id) => endpoints.timesheets.reject(id));
