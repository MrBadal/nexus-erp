'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Star } from 'lucide-react';
import {
  useCandidate,
  useUpdateCandidate,
  useDeleteCandidate,
  useScheduleInterview,
  useCandidateInterviews,
  useCompleteInterview,
  useHireCandidate,
  type Candidate,
  type Interview,
} from '@/hooks/use-recruitment';
import { formatDate } from '@/lib/utils';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  screening: 'bg-yellow-100 text-yellow-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  interview: 'bg-purple-100 text-purple-800',
  offered: 'bg-orange-100 text-orange-800',
  hired: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useCandidate(id);
  const candidate = data as Candidate | undefined;
  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const { data: interviewsData } = useCandidateInterviews(id);
  const interviewsList = (interviewsData as Interview[] | undefined) ?? [];
  const scheduleInterview = useScheduleInterview();
  const completeInterview = useCompleteInterview();
  const hire = useHireCandidate();

  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledAt: '',
    duration: 60,
    location: '',
    meetingLink: '',
  });

  const [showHire, setShowHire] = useState(false);
  const [joiningDate, setJoiningDate] = useState('');

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

  if (!candidate) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Candidate not found.</p>
        <Link href="/hr/recruitment/candidates"><Button variant="outline" className="mt-4">Back</Button></Link>
      </div>
    );
  }

  const handleStatusChange = async (status: string) => {
    await updateCandidate.mutateAsync({ id, data: { status } });
  };

  const handleScheduleInterview = async () => {
    const nextRound = interviewsList.length + 1;
    await scheduleInterview.mutateAsync({
      candidateId: id,
      round: nextRound,
      ...scheduleForm,
    });
    setShowSchedule(false);
    setScheduleForm({ scheduledAt: '', duration: 60, location: '', meetingLink: '' });
  };

  const handleHire = async () => {
    await hire.mutateAsync({ id, joiningDate });
    router.push('/hr/recruitment/candidates');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this candidate?')) {
      await deleteCandidate.mutateAsync(id);
      router.push('/hr/recruitment/candidates');
    }
  };

  const activeStatuses = ['new', 'screening', 'shortlisted', 'interview'];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hr/recruitment/candidates">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{candidate.firstName} {candidate.lastName}</h1>
            <p className="text-sm text-muted-foreground">
              {candidate.currentDesignation && `${candidate.currentDesignation} · `}
              {candidate.currentCompany || 'Candidate'}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[candidate.status] || 'bg-gray-100'}`}>
          {candidate.status}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {candidate.status === 'new' && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('screening')}>
            Start Screening
          </Button>
        )}
        {candidate.status === 'screening' && (
          <Button size="sm" variant="outline" onClick={() => handleStatusChange('shortlisted')}>
            Shortlist
          </Button>
        )}
        {activeStatuses.includes(candidate.status) && (
          <Button size="sm" onClick={() => setShowSchedule(true)}>
            Schedule Interview
          </Button>
        )}
        {activeStatuses.includes(candidate.status) && (
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleStatusChange('rejected')}>
            Reject
          </Button>
        )}
        {candidate.status === 'hired' && !candidate.hiredEmployeeId && (
          <Button size="sm" onClick={() => setShowHire(true)}>
            Create Employee Record
          </Button>
        )}
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      </div>

      {/* Schedule Interview Form */}
      {showSchedule && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Schedule Interview (Round {interviewsList.length + 1})</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Date & Time *</label>
              <input
                type="datetime-local"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={scheduleForm.scheduledAt}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Duration (min)</label>
              <input
                type="number"
                min="15"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={scheduleForm.duration}
                onChange={(e) => setScheduleForm({ ...scheduleForm, duration: parseInt(e.target.value) || 60 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={scheduleForm.location}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Meeting Link</label>
              <input
                type="url"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={scheduleForm.meetingLink}
                onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleScheduleInterview} disabled={scheduleInterview.isPending || !scheduleForm.scheduledAt}>
              {scheduleInterview.isPending ? 'Scheduling...' : 'Schedule'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowSchedule(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Hire form */}
      {showHire && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create Employee Record</h2>
          <div>
            <label className="text-sm font-medium">Joining Date *</label>
            <input
              type="date"
              required
              className="mt-1 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleHire} disabled={hire.isPending || !joiningDate}>
              {hire.isPending ? 'Creating...' : 'Create Employee'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowHire(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Contact</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${candidate.email}`} className="text-primary hover:underline">{candidate.email}</a>
            </div>
            {candidate.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{candidate.phone}</span>
              </div>
            )}
            {candidate.currentCompany && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{candidate.currentCompany}</span>
              </div>
            )}
            {candidate.currentDesignation && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{candidate.currentDesignation}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">Professional</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Experience</dt>
              <dd>{candidate.experienceYears ? `${candidate.experienceYears} years` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current CTC</dt>
              <dd>{candidate.currentSalary ? `₹${parseFloat(candidate.currentSalary).toLocaleString('en-IN')}` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Expected CTC</dt>
              <dd>{candidate.expectedSalary ? `₹${parseFloat(candidate.expectedSalary).toLocaleString('en-IN')}` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Source</dt>
              <dd className="capitalize">{candidate.source || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Applied</dt>
              <dd>{formatDate(candidate.appliedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Interview History */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Interview History</h2>
        {interviewsList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {interviewsList.map((interview) => (
              <div key={interview.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Round {interview.round}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                    interview.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {interview.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(interview.scheduledAt)}
                  {interview.location && ` · ${interview.location}`}
                  {interview.duration && ` · ${interview.duration} min`}
                </p>
                {interview.feedback && (
                  <p className="text-sm mt-2">{interview.feedback}</p>
                )}
                {interview.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm">{interview.rating}/5</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      {candidate.notes && (
        <div className="rounded-lg border bg-card p-6 space-y-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.notes}</p>
        </div>
      )}
    </div>
  );
}
