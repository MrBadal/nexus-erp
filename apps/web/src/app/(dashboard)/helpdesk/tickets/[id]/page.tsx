'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FormPage } from '@/components/layout/form-page';
import { FormSection } from '@/components/ui/form-section';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, displayAssignee } from '@/lib/utils';
import {
  useTicket,
  useUpdateTicket,
  useDeleteTicket,
  useReplyTicket,
  useResolveTicket,
  useCloseTicket,
  useReopenTicket,
} from '@/hooks/use-helpdesk';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TicketStatus = 'open' | 'in_progress' | 'replied' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketType = 'bug' | 'feature_request' | 'question' | 'complaint';

interface Comment {
  id?: string;
  author?: string;
  content: string;
  createdAt?: string;
}

interface TicketData {
  id: string;
  ticketNumber?: string;
  subject?: string;
  customerId?: string;
  customerName?: string;
  contactName?: string;
  contactEmail?: string;
  assignedTo?: string;
  assignee?: string;
  priority?: TicketPriority;
  type?: TicketType;
  status: TicketStatus;
  description?: string;
  resolution?: string;
  comments?: Comment[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const typeOptions = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'question', label: 'Question' },
  { value: 'complaint', label: 'Complaint' },
];

const statusVariantMap: Record<TicketStatus, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'muted'> = {
  open: 'info',
  in_progress: 'warning',
  replied: 'warning',
  resolved: 'success',
  closed: 'muted',
};

const statusLabelMap: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  replied: 'Replied',
  resolved: 'Resolved',
  closed: 'Closed',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = params.id;

  const { data: ticket, isLoading, error } = useTicket(ticketId);
  const updateMutation = useUpdateTicket();
  const deleteMutation = useDeleteTicket();
  const replyMutation = useReplyTicket();
  const resolveMutation = useResolveTicket();
  const closeMutation = useCloseTicket();
  const reopenMutation = useReopenTicket();

  const ticketData = ticket as TicketData | undefined;

  // Local editable state
  const [localSubject, setLocalSubject] = useState<string | null>(null);
  const [localAssignedTo, setLocalAssignedTo] = useState<string | null>(null);
  const [localPriority, setLocalPriority] = useState<string | null>(null);
  const [localType, setLocalType] = useState<string | null>(null);
  const [localDescription, setLocalDescription] = useState<string | null>(null);
  const [localResolution, setLocalResolution] = useState<string | null>(null);

  // Comment state
  const [newComment, setNewComment] = useState('');

  const status: TicketStatus = (ticketData?.status ?? 'open') as TicketStatus;
  const isReadOnly = status === 'closed';

  const currentSubject = localSubject ?? ticketData?.subject ?? '';
  const currentAssignedTo = localAssignedTo ?? (displayAssignee(ticketData?.assignedTo, '') || displayAssignee(ticketData?.assignee, '') || '');
  const currentPriority = localPriority ?? ticketData?.priority ?? 'medium';
  const currentType = localType ?? ticketData?.type ?? 'question';
  const currentDescription = localDescription ?? ticketData?.description ?? '';
  const currentResolution = localResolution ?? ticketData?.resolution ?? '';

  const comments: Comment[] = ticketData?.comments ?? [];

  function handleSave() {
    if (!ticketData) return;
    updateMutation.mutate(
      {
        id: ticketId,
        data: {
          subject: currentSubject,
          assignedTo: currentAssignedTo || undefined,
          priority: currentPriority,
          type: currentType,
          description: currentDescription || undefined,
          resolution: currentResolution || undefined,
        },
      },
      {
        onSuccess: () => toast.success('Ticket saved'),
        onError: (err) => toast.error(apiErrorMessage(err, 'Failed to save ticket')),
      },
    );
  }

  function handleReply() {
    if (!newComment.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }
    replyMutation.mutate(ticketId, {
      onSuccess: () => {
        toast.success('Reply sent');
        setNewComment('');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to send reply')),
    });
  }

  function handleResolve() {
    resolveMutation.mutate(ticketId, {
      onSuccess: () => toast.success('Ticket resolved'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to resolve ticket')),
    });
  }

  function handleClose() {
    closeMutation.mutate(ticketId, {
      onSuccess: () => toast.success('Ticket closed'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to close ticket')),
    });
  }

  function handleReopen() {
    reopenMutation.mutate(ticketId, {
      onSuccess: () => toast.success('Ticket reopened'),
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to reopen ticket')),
    });
  }

  function handleDelete() {
    deleteMutation.mutate(ticketId, {
      onSuccess: () => {
        toast.success('Ticket deleted');
        router.push('/helpdesk/tickets');
      },
      onError: (err) => toast.error(apiErrorMessage(err, 'Failed to delete ticket')),
    });
  }

  // ---------- Loading / Error states ----------

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            {error ? 'Error loading ticket' : 'Ticket not found'}
          </p>
          <button
            className="mt-2 text-sm text-primary underline"
            onClick={() => router.push('/helpdesk/tickets')}
          >
            Back to tickets
          </button>
        </div>
      </div>
    );
  }

  // ---------- Actions ----------

  function getActions() {
    switch (status) {
      case 'open':
      case 'in_progress':
        return {
          primaryAction: {
            label: 'Save',
            onClick: handleSave,
            loading: updateMutation.isPending,
          },
          secondaryActions: [
            { label: 'Resolve', onClick: handleResolve, variant: 'outline' as const },
          ],
        };
      case 'replied':
        return {
          primaryAction: {
            label: 'Resolve Ticket',
            onClick: handleResolve,
            loading: resolveMutation.isPending,
          },
          secondaryActions: [
            { label: 'Save', onClick: handleSave, variant: 'outline' as const },
          ],
        };
      case 'resolved':
        return {
          primaryAction: {
            label: 'Close Ticket',
            onClick: handleClose,
            loading: closeMutation.isPending,
          },
          secondaryActions: [
            { label: 'Reopen', onClick: handleReopen, variant: 'outline' as const },
          ],
        };
      case 'closed':
        return {
          primaryAction: {
            label: 'Reopen Ticket',
            onClick: handleReopen,
            loading: reopenMutation.isPending,
          },
        };
      default:
        return {};
    }
  }

  const actions = getActions();

  const meta = [
    {
      label: 'Ticket #',
      value: <span className="font-mono">{ticketData.ticketNumber ?? 'Loading...'}</span>,
    },
    { label: 'Status', value: statusLabelMap[status] },
    { label: 'Customer', value: ticketData.customerName ?? ticketData.contactName ?? '—' },
    { label: 'Priority', value: currentPriority },
    { label: 'Assigned To', value: displayAssignee(currentAssignedTo, '—') },
    { label: 'Created', value: formatDate(ticketData.createdAt ?? '') },
  ];

  return (
    <FormPage
      title={ticketData.ticketNumber ?? 'Ticket'}
      subtitle={currentSubject}
      breadcrumbs={[
        { label: 'Helpdesk', href: '/helpdesk' },
        { label: 'Tickets', href: '/helpdesk/tickets' },
        { label: ticketData.ticketNumber ?? 'Loading...' },
      ]}
      backHref="/helpdesk/tickets"
      status={{ label: statusLabelMap[status], variant: statusVariantMap[status] }}
      primaryAction={actions.primaryAction}
      secondaryActions={actions.secondaryActions}
      dangerAction={!isReadOnly ? { label: 'Delete', onClick: handleDelete } : undefined}
      meta={meta}
    >
      <div className="space-y-6">
        <FormSection title="Ticket Details" columns={2}>
          <FormField label="Ticket Number">
            <Input
              value={ticketData.ticketNumber ?? 'Loading...'}
              readOnly
              className="font-mono bg-muted"
            />
          </FormField>
          <FormField label="Subject">
            <Input
              value={currentSubject}
              onChange={(e) => setLocalSubject(e.target.value)}
              placeholder="Ticket subject"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Customer">
            <Input
              value={ticketData.customerName ?? ticketData.contactName ?? ''}
              readOnly
              className="bg-muted"
            />
          </FormField>
          <FormField label="Assigned To">
            <Input
              value={currentAssignedTo}
              onChange={(e) => setLocalAssignedTo(e.target.value)}
              placeholder="Assignee"
              disabled={isReadOnly}
            />
          </FormField>
          <FormField label="Priority">
            <Select
              value={currentPriority}
              onValueChange={(v) => setLocalPriority(v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Type">
            <Select
              value={currentType}
              onValueChange={(v) => setLocalType(v)}
              disabled={isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </FormSection>

        <FormSection title="Description" columns={1}>
          <FormField label="Description">
            <Textarea
              value={currentDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              placeholder="Ticket description"
              disabled={isReadOnly}
              rows={5}
            />
          </FormField>
        </FormSection>

        {(status === 'resolved' || status === 'closed' || localResolution) && (
          <FormSection title="Resolution" columns={1}>
            <FormField label="Resolution">
              <Textarea
                value={currentResolution}
                onChange={(e) => setLocalResolution(e.target.value)}
                placeholder="How was this ticket resolved?"
                disabled={isReadOnly}
                rows={4}
              />
            </FormField>
          </FormSection>
        )}

        {/* Comments */}
        <FormSection title="Comments" columns={1} collapsible={false}>
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment, i) => (
                <div key={comment.id ?? i} className="rounded-md border p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{comment.author ?? 'Support'}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt ?? '')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}

          {!isReadOnly && (
            <div className="mt-4 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleReply}
                disabled={replyMutation.isPending || !newComment.trim()}
              >
                Submit Reply
              </Button>
            </div>
          )}
        </FormSection>
      </div>
    </FormPage>
  );
}
