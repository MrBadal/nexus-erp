'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, MapPin, Briefcase, Calendar } from 'lucide-react';
import { useJobOpening, usePublishJobOpening, useCloseJobOpening, useDeleteJobOpening, type JobOpening } from '@/hooks/use-recruitment';
import { formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  open: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  closed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function JobOpeningDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useJobOpening(id);
  const job = data as JobOpening | undefined;
  const publish = usePublishJobOpening();
  const close = useCloseJobOpening();
  const del = useDeleteJobOpening();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Job opening not found.</p>
        <Link href="/hr/recruitment/job-openings"><Button variant="outline" className="mt-4">Back</Button></Link>
      </div>
    );
  }

  const handlePublish = async () => {
    await publish.mutateAsync(id);
  };

  const handleClose = async () => {
    await close.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this job opening?')) {
      await del.mutateAsync(id);
      router.push('/hr/recruitment/job-openings');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment/job-openings">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-sm text-muted-foreground">
              {job.filledPositions || 0} / {job.positions} positions filled
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[job.status] || 'bg-gray-100'}`}>
          {job.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(job.status === 'draft' || job.status === 'on_hold') && (
          <Button size="sm" onClick={handlePublish} disabled={publish.isPending}>
            {publish.isPending ? 'Publishing...' : 'Publish'}
          </Button>
        )}
        {job.status === 'open' && (
          <Button size="sm" variant="outline" onClick={handleClose} disabled={close.isPending}>
            Close Opening
          </Button>
        )}
        {job.status === 'open' && (
          <Link href={`/hr/recruitment/candidates/new?jobId=${job.id}`}>
            <Button size="sm" variant="outline">
              <Users className="mr-1 h-3.5 w-3.5" /> Add Candidate
            </Button>
          </Link>
        )}
        <Link href={`/hr/recruitment/candidates?jobOpeningId=${job.id}`}>
          <Button size="sm" variant="outline">View Candidates</Button>
        </Link>
        <Button size="sm" variant="destructive" onClick={handleDelete}>Delete</Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> Type</dt>
              <dd className="capitalize">{(job.employmentType || '').replace(/_/g, ' ')}</dd>
            </div>
            {job.location && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location</dt>
                <dd>{job.location}</dd>
              </div>
            )}
            {(job.minSalary || job.maxSalary) && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Salary Range</dt>
                <dd>
                  {job.minSalary ? `₹${parseFloat(job.minSalary).toLocaleString('en-IN')}` : ''}
                  {job.minSalary && job.maxSalary ? ' - ' : ''}
                  {job.maxSalary ? `₹${parseFloat(job.maxSalary).toLocaleString('en-IN')}` : ''}
                </dd>
              </div>
            )}
            {job.closingDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Closing</dt>
                <dd>{formatDate(job.closingDate)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDate(job.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Progress</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Positions</span>
              <span className="font-medium">{job.filledPositions || 0} / {job.positions}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, ((job.filledPositions || 0) / job.positions) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {job.description && (
        <div className="rounded-lg border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold">Description</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {job.requirements && (
        <div className="rounded-lg border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold">Requirements</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
        </div>
      )}
    </div>
  );
}
