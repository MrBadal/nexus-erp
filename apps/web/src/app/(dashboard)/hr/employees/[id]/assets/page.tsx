'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, RotateCcw, Package, History } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssets } from '@/hooks/use-assets';
import {
  useEmployeeAssetAssignments,
  useAssignAsset,
  useReturnAsset,
  type AssetAssignment,
} from '@/hooks/use-asset-assignment';
import { formatDate } from '@/lib/utils';

interface AssetRecord {
  id: string;
  name?: string;
  assetNumber?: string;
  status?: string;
}

// ─── Assign dialog ──────────────────────────────────────────────────────────

function AssignAssetDialog({
  employeeId,
  open,
  onClose,
  assignedAssetIds,
}: {
  employeeId: string;
  open: boolean;
  onClose: () => void;
  assignedAssetIds: Set<string>;
}) {
  const { data: assetsData } = useAssets();
  const assets = (assetsData ?? []) as AssetRecord[];
  const assignAsset = useAssignAsset();

  const [assetId, setAssetId] = useState<string>('');
  const [conditionAtAssign, setConditionAtAssign] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Filter to assignable assets — not already actively assigned, not disposed/scrapped
  const assignableAssets = useMemo(
    () =>
      assets.filter(
        (a) =>
          !assignedAssetIds.has(a.id) &&
          a.status !== 'disposed' &&
          a.status !== 'scrapped',
      ),
    [assets, assignedAssetIds],
  );

  const handleSubmit = () => {
    if (!assetId) {
      toast.error('Please select an asset');
      return;
    }
    assignAsset.mutate(
      {
        assetId,
        employeeId,
        conditionAtAssign: conditionAtAssign || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Asset assigned');
          setAssetId('');
          setConditionAtAssign('');
          setNotes('');
          onClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Failed to assign asset';
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Asset</DialogTitle>
          <DialogDescription>
            Pick an available asset and record its condition at handover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="asset">Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger id="asset">
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assignableAssets.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No assignable assets available
                  </div>
                ) : (
                  assignableAssets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.assetNumber ? `${a.assetNumber} — ` : ''}
                      {a.name ?? a.id}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="condition">Condition at handover</Label>
            <Input
              id="condition"
              placeholder="e.g., new, good, fair"
              value={conditionAtAssign}
              onChange={(e) => setConditionAtAssign(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignAsset.isPending || !assetId}
          >
            {assignAsset.isPending ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Return dialog ──────────────────────────────────────────────────────────

function ReturnAssetDialog({
  assignment,
  open,
  onClose,
}: {
  assignment: AssetAssignment | null;
  open: boolean;
  onClose: () => void;
}) {
  const returnAsset = useReturnAsset();
  const [conditionAtReturn, setConditionAtReturn] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = () => {
    if (!assignment) return;
    returnAsset.mutate(
      {
        id: assignment.id,
        conditionAtReturn: conditionAtReturn || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Asset returned');
          setConditionAtReturn('');
          setNotes('');
          onClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Failed to return asset';
          toast.error(msg);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>
            Record the asset's condition on return.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="return-condition">Condition at return</Label>
            <Input
              id="return-condition"
              placeholder="e.g., good, damaged"
              value={conditionAtReturn}
              onChange={(e) => setConditionAtReturn(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="return-notes">Return notes</Label>
            <Textarea
              id="return-notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={returnAsset.isPending}>
            {returnAsset.isPending ? 'Returning…' : 'Confirm Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EmployeeAssetsPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = (params?.id as string) || '';

  const { data: assignmentsData, isLoading } =
    useEmployeeAssetAssignments(employeeId);
  const { data: assetsData } = useAssets();

  const assignments = (assignmentsData ?? []) as AssetAssignment[];
  const assets = (assetsData ?? []) as AssetRecord[];

  const assetMap = useMemo(() => {
    const m = new Map<string, AssetRecord>();
    for (const a of assets) m.set(a.id, a);
    return m;
  }, [assets]);

  const active = assignments.filter((a) => !a.returnedAt);
  const history = assignments.filter((a) => a.returnedAt);
  const activeAssetIds = new Set(active.map((a) => a.assetId));

  const [assignOpen, setAssignOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<AssetAssignment | null>(
    null,
  );

  const renderAssetLabel = (assetId: string) => {
    const asset = assetMap.get(assetId);
    if (!asset) return assetId;
    return `${asset.assetNumber ? asset.assetNumber + ' — ' : ''}${asset.name ?? ''}`;
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Assigned Assets"
        subtitle="Currently held + return history"
        breadcrumbs={[
          { label: 'HR', href: '/hr' },
          { label: 'Employees', href: '/hr/employees' },
          { label: 'Assets' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/hr/employees/${employeeId}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to employee
            </Button>
            <Button size="sm" onClick={() => setAssignOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Asset
            </Button>
          </div>
        }
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {/* Active assignments */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Currently Assigned
            </h2>
            <Badge variant="secondary">{active.length}</Badge>
          </div>

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : active.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No assets are currently assigned to this employee.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Asset
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Assigned
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Condition
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Notes
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">
                        {renderAssetLabel(row.assetId)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(row.assignedAt)}
                      </td>
                      <td className="px-4 py-2">
                        {row.conditionAtAssign ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {row.notes ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReturnTarget(row)}
                        >
                          <RotateCcw className="mr-2 h-3.5 w-3.5" />
                          Return
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* History */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Return History
            </h2>
            <Badge variant="secondary">{history.length}</Badge>
          </div>

          {history.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No prior returns recorded.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Asset
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Assigned
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Returned
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Condition (out / in)
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="px-4 py-2">
                        {renderAssetLabel(row.assetId)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {formatDate(row.assignedAt)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {row.returnedAt ? formatDate(row.returnedAt) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        {(row.conditionAtAssign ?? '—') +
                          ' / ' +
                          (row.conditionAtReturn ?? '—')}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {row.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AssignAssetDialog
        employeeId={employeeId}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        assignedAssetIds={activeAssetIds}
      />

      <ReturnAssetDialog
        assignment={returnTarget}
        open={returnTarget !== null}
        onClose={() => setReturnTarget(null)}
      />
    </div>
  );
}
