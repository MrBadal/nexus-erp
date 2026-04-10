'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateSupplier } from '@/hooks/use-buying';

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  taxId: string;
  address: string;
  city: string;
  state: string;
  country: string;
  contactPerson: string;
  paymentTerms: string;
  website: string;
  panNumber: string;
  gstNumber: string;
  msmeRegistered: boolean;
  msmeCategory: 'micro' | 'small' | 'medium' | '';
  msmeNumber: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  bankName: string;
  bankBranch: string;
  tdsApplicable: boolean;
  defaultTdsSectionId: string;
}

export default function NewSupplierPage() {
  const router = useRouter();
  const createSupplier = useCreateSupplier();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      taxId: '',
      address: '',
      city: '',
      state: '',
      country: '',
      contactPerson: '',
      paymentTerms: 'Net 30',
      website: '',
      panNumber: '',
      gstNumber: '',
      msmeRegistered: false,
      msmeCategory: '',
      msmeNumber: '',
      bankAccountName: '',
      bankAccountNumber: '',
      bankIfscCode: '',
      bankName: '',
      bankBranch: '',
      tdsApplicable: true,
      defaultTdsSectionId: '',
    },
  });

  const watchMsmeRegistered = watch('msmeRegistered');
  const watchTdsApplicable = watch('tdsApplicable');

  const onSubmit = async (data: SupplierFormData) => {
    try {
      await createSupplier.mutateAsync({
        ...data,
        msmeCategory: data.msmeCategory || null,
        defaultTdsSectionId: data.defaultTdsSectionId || null,
      });
      toast.success('Supplier created successfully');
      router.push('/buying/suppliers');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create supplier';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/buying" className="hover:text-foreground">Buying</Link>
          <span>&rsaquo;</span>
          <Link href="/buying/suppliers" className="hover:text-foreground">Suppliers</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Supplier</h1>
            <p className="text-sm text-muted-foreground">Add a new supplier to your network</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Acme Corp"
                {...register('name', { required: 'Supplier name is required' })}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Legal company name"
                {...register('company')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="orders@supplier.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
                })}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1-555-0100"
                {...register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                placeholder="Primary contact name"
                {...register('contactPerson')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID</Label>
              <Input
                id="taxId"
                placeholder="Tax identification number"
                {...register('taxId')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Industrial Blvd"
                {...register('address')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="City"
                {...register('city')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input
                id="state"
                placeholder="State"
                {...register('state')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Country"
                {...register('country')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terms & Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select
                defaultValue="Net 30"
                onValueChange={(value) => setValue('paymentTerms', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Net 90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="https://www.supplier.com"
                {...register('website')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compliance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                maxLength={10}
                placeholder="ABCDE1234F"
                className="uppercase"
                {...register('panNumber')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                className="uppercase"
                {...register('gstNumber')}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="msmeRegistered"
                  checked={watchMsmeRegistered}
                  onCheckedChange={(checked) => setValue('msmeRegistered', !!checked)}
                />
                <Label htmlFor="msmeRegistered">MSME Registered</Label>
              </div>
            </div>

            {watchMsmeRegistered && (
              <>
                <div className="space-y-2">
                  <Label>MSME Category</Label>
                  <Select onValueChange={(value) => setValue('msmeCategory', value as 'micro' | 'small' | 'medium')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="micro">Micro</SelectItem>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msmeNumber">MSME Number</Label>
                  <Input
                    id="msmeNumber"
                    maxLength={30}
                    placeholder="MSME registration number"
                    {...register('msmeNumber')}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bankAccountName">Account Holder Name</Label>
              <Input
                id="bankAccountName"
                placeholder="Account holder name"
                {...register('bankAccountName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankAccountNumber">Account Number</Label>
              <Input
                id="bankAccountNumber"
                placeholder="Bank account number"
                {...register('bankAccountNumber')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankIfscCode">IFSC Code</Label>
              <Input
                id="bankIfscCode"
                maxLength={11}
                placeholder="SBIN0001234"
                className="uppercase"
                {...register('bankIfscCode')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Bank name"
                {...register('bankName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankBranch">Bank Branch</Label>
              <Input
                id="bankBranch"
                placeholder="Branch name"
                {...register('bankBranch')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">TDS Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tdsApplicable"
                  checked={watchTdsApplicable}
                  onCheckedChange={(checked) => setValue('tdsApplicable', !!checked)}
                />
                <Label htmlFor="tdsApplicable">TDS Applicable</Label>
              </div>
            </div>

            {watchTdsApplicable && (
              <div className="space-y-2">
                <Label htmlFor="defaultTdsSectionId">Default TDS Section</Label>
                <Input
                  id="defaultTdsSectionId"
                  placeholder="e.g. 194C, 194J"
                  {...register('defaultTdsSectionId')}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || createSupplier.isPending}>
            {(isSubmitting || createSupplier.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Supplier
          </Button>
        </div>
      </form>
    </div>
  );
}
