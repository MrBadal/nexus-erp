'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCurrencies,
  useCreateCurrency,
  useExchangeRates,
  useSetExchangeRate,
  type Currency,
  type ExchangeRate,
} from '@/hooks/use-currencies';
import { formatDate } from '@/lib/utils';

interface AddCurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AddCurrencyDialog({ open, onOpenChange }: AddCurrencyDialogProps) {
  const createCurrency = useCreateCurrency();
  const [form, setForm] = useState({
    code: '',
    name: '',
    symbol: '',
    decimalPlaces: '2',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.symbol) {
      toast.error('Code, name, and symbol are required');
      return;
    }
    try {
      await createCurrency.mutateAsync({
        code: form.code,
        name: form.name,
        symbol: form.symbol,
        decimalPlaces: parseInt(form.decimalPlaces, 10),
      });
      toast.success('Currency created successfully');
      onOpenChange(false);
      setForm({ code: '', name: '', symbol: '', decimalPlaces: '2' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create currency';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add Currency</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" placeholder="e.g. USD" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="e.g. US Dollar" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input id="symbol" placeholder="e.g. $" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimalPlaces">Decimal Places</Label>
              <Input id="decimalPlaces" type="number" min="0" max="4" value={form.decimalPlaces} onChange={(e) => setForm({ ...form, decimalPlaces: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createCurrency.isPending}>
              {createCurrency.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Currency
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SetExchangeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencies: Currency[];
}

function SetExchangeRateDialog({ open, onOpenChange, currencies }: SetExchangeRateDialogProps) {
  const setRate = useSetExchangeRate();
  const [form, setForm] = useState({
    fromCurrency: '',
    toCurrency: '',
    rate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    source: 'manual',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromCurrency || !form.toCurrency || !form.rate) {
      toast.error('From, to, and rate are required');
      return;
    }
    try {
      await setRate.mutateAsync(form);
      toast.success('Exchange rate set successfully');
      onOpenChange(false);
      setForm({ fromCurrency: '', toCurrency: '', rate: '', effectiveDate: new Date().toISOString().split('T')[0], source: 'manual' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set exchange rate';
      toast.error(message);
    }
  };

  const activeCurrencies = currencies.filter((c) => c.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Set Exchange Rate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>From Currency *</Label>
              <Select value={form.fromCurrency} onValueChange={(v) => setForm({ ...form, fromCurrency: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {activeCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Currency *</Label>
              <Select value={form.toCurrency} onValueChange={(v) => setForm({ ...form, toCurrency: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {activeCurrencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate *</Label>
              <Input id="rate" placeholder="e.g. 83.50" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Effective Date</Label>
              <Input id="effectiveDate" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={setRate.isPending}>
              {setRate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Rate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CurrenciesPage() {
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies();
  const { data: exchangeRates, isLoading: loadingRates } = useExchangeRates();
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);

  const currencyList = Array.isArray(currencies) ? currencies : [];
  const rateList = Array.isArray(exchangeRates) ? exchangeRates : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/settings" className="hover:text-foreground">Settings</Link>
          <span>&rsaquo;</span>
          <span>Currencies</span>
        </div>
        <h1 className="text-2xl font-bold">Currencies &amp; Exchange Rates</h1>
        <p className="text-sm text-muted-foreground">Manage currency master and exchange rates</p>
      </div>

      {/* Currencies Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Currencies</CardTitle>
          <Button size="sm" onClick={() => setCurrencyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Currency
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingCurrencies ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : currencyList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No currencies configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Decimal Places</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencyList.map((c: Currency) => (
                  <TableRow key={c.code}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.symbol}</TableCell>
                    <TableCell className="text-right">{c.decimalPlaces}</TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? 'success' : 'secondary'}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Exchange Rates Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Exchange Rates</CardTitle>
          <Button size="sm" onClick={() => setRateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Set Rate
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingRates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rateList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No exchange rates configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateList.map((r: ExchangeRate) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fromCurrency}</TableCell>
                    <TableCell>{r.toCurrency}</TableCell>
                    <TableCell className="text-right">{r.rate}</TableCell>
                    <TableCell>{formatDate(r.effectiveDate)}</TableCell>
                    <TableCell className="capitalize">{r.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddCurrencyDialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen} />
      <SetExchangeRateDialog open={rateDialogOpen} onOpenChange={setRateDialogOpen} currencies={currencyList} />
    </div>
  );
}
