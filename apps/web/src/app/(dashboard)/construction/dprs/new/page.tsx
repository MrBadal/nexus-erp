'use client';

import { apiErrorMessage } from '@/lib/api';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDpr, useContracts } from '@/hooks/use-construction';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];

export default function NewDprPage() {
  const router = useRouter();
  const createDpr = useCreateDpr();
  const { data: contracts } = useContracts();

  const [contractId, setContractId] = useState('');
  const [reportDate, setReportDate] = useState(today);
  const [weather, setWeather] = useState('');
  const [temperature, setTemperature] = useState('');
  const [skilledLabour, setSkilledLabour] = useState(0);
  const [unskilledLabour, setUnskilledLabour] = useState(0);
  const [supervisors, setSupervisors] = useState(0);
  const [engineers, setEngineers] = useState(0);
  const [workDoneToday, setWorkDoneToday] = useState('');
  const [issuesObserved, setIssuesObserved] = useState('');
  const [nextDayPlan, setNextDayPlan] = useState('');
  const [visitorsOnSite, setVisitorsOnSite] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contractId) {
      toast.error('Please select a contract.');
      return;
    }

    const payload = {
      contractId,
      reportDate,
      weather: weather.trim() || undefined,
      temperature: temperature.trim() || undefined,
      skilledLabour,
      unskilledLabour,
      supervisors,
      engineers,
      workDoneToday: workDoneToday.trim() || undefined,
      issuesObserved: issuesObserved.trim() || undefined,
      nextDayPlan: nextDayPlan.trim() || undefined,
      visitorsOnSite: visitorsOnSite.trim() || undefined,
    };

    createDpr.mutate(payload, {
      onSuccess: () => {
        toast.success('DPR created successfully.');
        router.push('/construction/dprs');
      },
      onError: (err) => {
        toast.error(apiErrorMessage(err, 'Failed to create DPR. Please try again.'));
      },
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/construction" className="hover:text-foreground">Construction</Link>
          <span>&rsaquo;</span>
          <Link href="/construction/dprs" className="hover:text-foreground">DPRs</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <h1 className="text-2xl font-bold">New Daily Progress Report</h1>
        <p className="text-sm text-muted-foreground">Record site activity for the day</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="contractId">
                Contract <span className="text-destructive">*</span>
              </Label>
              <Select value={contractId} onValueChange={setContractId} required>
                <SelectTrigger id="contractId">
                  <SelectValue placeholder="Select a contract" />
                </SelectTrigger>
                <SelectContent>
                  {(contracts || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractNumber} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reportDate">
                Report Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reportDate"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="weather">Weather</Label>
              <Input
                id="weather"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="e.g. Sunny, Cloudy, Rainy"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g. 32°C"
              />
            </div>
          </CardContent>
        </Card>

        {/* Labour Strength */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Labour Strength</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="skilledLabour">Skilled Labour</Label>
              <Input
                id="skilledLabour"
                type="number"
                min="0"
                value={skilledLabour}
                onChange={(e) => setSkilledLabour(parseInt(e.target.value || '0', 10))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unskilledLabour">Unskilled Labour</Label>
              <Input
                id="unskilledLabour"
                type="number"
                min="0"
                value={unskilledLabour}
                onChange={(e) => setUnskilledLabour(parseInt(e.target.value || '0', 10))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supervisors">Supervisors</Label>
              <Input
                id="supervisors"
                type="number"
                min="0"
                value={supervisors}
                onChange={(e) => setSupervisors(parseInt(e.target.value || '0', 10))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="engineers">Engineers</Label>
              <Input
                id="engineers"
                type="number"
                min="0"
                value={engineers}
                onChange={(e) => setEngineers(parseInt(e.target.value || '0', 10))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Progress Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="workDoneToday">Work Done Today</Label>
              <Textarea
                id="workDoneToday"
                value={workDoneToday}
                onChange={(e) => setWorkDoneToday(e.target.value)}
                placeholder="Describe the work completed today..."
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="issuesObserved">Issues Observed</Label>
              <Textarea
                id="issuesObserved"
                value={issuesObserved}
                onChange={(e) => setIssuesObserved(e.target.value)}
                placeholder="Any problems, delays or safety concerns..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nextDayPlan">Next Day Plan</Label>
              <Textarea
                id="nextDayPlan"
                value={nextDayPlan}
                onChange={(e) => setNextDayPlan(e.target.value)}
                placeholder="Planned activities for tomorrow..."
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="visitorsOnSite">Visitors on Site</Label>
              <Input
                id="visitorsOnSite"
                value={visitorsOnSite}
                onChange={(e) => setVisitorsOnSite(e.target.value)}
                placeholder="e.g. Client representative, Safety officer"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link href="/construction/dprs">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createDpr.isPending}>
            {createDpr.isPending ? 'Saving...' : 'Create DPR'}
          </Button>
        </div>
      </form>
    </div>
  );
}
