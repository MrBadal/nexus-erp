'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateWarehouse } from '@/hooks/use-inventory';

interface NewWarehouseFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
}

function generateCode(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  const prefix = words
    .map((w) => w.substring(0, 4).toUpperCase())
    .slice(0, 2)
    .join('-');
  return `WH-${prefix}`;
}

export default function NewWarehousePage() {
  const router = useRouter();
  const createWarehouse = useCreateWarehouse();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewWarehouseFormData>({
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      country: '',
      isDefault: false,
    },
  });

  const nameValue = watch('name');
  const isDefaultValue = watch('isDefault');

  const onSubmit = async (data: NewWarehouseFormData) => {
    try {
      await createWarehouse.mutateAsync({
        name: data.name,
        code: data.code,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        isDefault: data.isDefault,
      });
      toast.success('Warehouse created successfully');
      router.push('/inventory/warehouses');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create warehouse';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-4">
        <Link href="/inventory/warehouses">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <Link href="/inventory" className="hover:text-foreground">Inventory</Link>
            <span>›</span>
            <Link href="/inventory/warehouses" className="hover:text-foreground">Warehouses</Link>
            <span>›</span>
            <span>New</span>
          </div>
          <h1 className="text-2xl font-bold">New Warehouse</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Warehouse Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Warehouse Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Main Warehouse"
                {...register('name', { required: 'Warehouse name is required' })}
                onBlur={(e) => {
                  if (e.target.value && !watch('code')) {
                    setValue('code', generateCode(e.target.value));
                  }
                }}
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Warehouse Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  placeholder="e.g. WH-MAIN"
                  className="font-mono"
                  {...register('code', { required: 'Warehouse code is required' })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('code', generateCode(nameValue))}
                >
                  Auto
                </Button>
              </div>
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
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

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Checkbox
                id="isDefault"
                checked={isDefaultValue}
                onCheckedChange={(checked) => setValue('isDefault', checked === true)}
              />
              <div>
                <Label htmlFor="isDefault" className="cursor-pointer">Default Warehouse</Label>
                <p className="text-xs text-muted-foreground">
                  Set as the default warehouse for new stock receipts and transfers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/inventory/warehouses">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createWarehouse.isPending}>
            {createWarehouse.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Warehouse
          </Button>
        </div>
      </form>
    </div>
  );
}
