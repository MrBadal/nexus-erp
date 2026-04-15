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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCustomer } from '@/hooks/use-selling';

interface NewCustomerForm {
  name: string;
  customerType: 'individual' | 'company';
  email: string;
  phone: string;
  company: string;
  taxId: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingCountry: string;
  billingPostalCode: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingPostalCode: string;
  creditLimit: string;
  currency: string;
  paymentTerms: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomer = useCreateCustomer();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewCustomerForm>({
    defaultValues: {
      customerType: 'company',
      currency: 'INR',
      paymentTerms: 'net_30',
      creditLimit: '0',
    },
  });

  const customerType = watch('customerType');

  const onSubmit = async (formData: NewCustomerForm) => {
    try {
      await createCustomer.mutateAsync({
        name: formData.name,
        customerType: formData.customerType,
        email: formData.email,
        phone: formData.phone,
        company: formData.company || undefined,
        taxId: formData.taxId || undefined,
        billingAddress: formData.billingAddress || undefined,
        billingCity: formData.billingCity || undefined,
        billingState: formData.billingState || undefined,
        billingCountry: formData.billingCountry || undefined,
        billingPostalCode: formData.billingPostalCode || undefined,
        shippingAddress: formData.shippingAddress || undefined,
        shippingCity: formData.shippingCity || undefined,
        shippingState: formData.shippingState || undefined,
        shippingCountry: formData.shippingCountry || undefined,
        shippingPostalCode: formData.shippingPostalCode || undefined,
        creditLimit: formData.creditLimit ? Number(formData.creditLimit) : 0,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
      });
      toast.success('Customer created successfully');
      router.push('/selling/customers');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create customer';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Link href="/selling" className="hover:text-foreground">Selling</Link>
          <span>&rsaquo;</span>
          <Link href="/selling/customers" className="hover:text-foreground">Customers</Link>
          <span>&rsaquo;</span>
          <span>New</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Customer</h1>
            <p className="text-sm text-muted-foreground">Add a new customer account</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="Enter customer name"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Customer Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={customerType}
                  onValueChange={(val) => setValue('customerType', val as 'individual' | 'company')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                  })}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                <Input placeholder="+1-555-0000" {...register('phone')} />
              </div>

              {customerType === 'company' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Company</Label>
                  <Input placeholder="Company name" {...register('company')} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Tax ID</Label>
                <Input placeholder="Tax identification number" {...register('taxId')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Street Address</Label>
              <Input placeholder="123 Main St" {...register('billingAddress')} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">City</Label>
                <Input placeholder="City" {...register('billingCity')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">State / Province</Label>
                <Input placeholder="State" {...register('billingState')} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Country</Label>
                <Input placeholder="Country" {...register('billingCountry')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Postal Code</Label>
                <Input placeholder="Postal code" {...register('billingPostalCode')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Street Address</Label>
              <Input placeholder="123 Main St" {...register('shippingAddress')} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">City</Label>
                <Input placeholder="City" {...register('shippingCity')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">State / Province</Label>
                <Input placeholder="State" {...register('shippingState')} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Country</Label>
                <Input placeholder="Country" {...register('shippingCountry')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Postal Code</Label>
                <Input placeholder="Postal code" {...register('shippingPostalCode')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Financial Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Credit Limit</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  {...register('creditLimit')}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Currency</Label>
                <Select
                  value={watch('currency')}
                  onValueChange={(val) => setValue('currency', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Payment Terms</Label>
                <Select
                  value={watch('paymentTerms')}
                  onValueChange={(val) => setValue('paymentTerms', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="net_90">Net 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/selling/customers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCustomer.isPending}>
            {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Customer
          </Button>
        </div>
      </form>
    </div>
  );
}
