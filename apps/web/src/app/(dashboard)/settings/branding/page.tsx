"use client";

import * as React from "react";
import { Loader2, Upload, Copy, Check, Palette } from "lucide-react";
import { toast } from "sonner";
import api, { put, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { useAuthStore } from "@/stores/auth.store";
import { useBranding, useInvalidateBranding, type TenantBranding } from "@/hooks/use-branding";

const DEFAULT_COLOR = "#1B4F72";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface BrandingForm {
  appName: string;
  logoUrl: string;
  brandColor: string;
  loginWelcomeText: string;
  loginBgUrl: string;
}

function toForm(b: TenantBranding | null | undefined): BrandingForm {
  return {
    appName: b?.appName ?? "",
    logoUrl: b?.logoUrl ?? "",
    brandColor: b?.brandColor ?? DEFAULT_COLOR,
    loginWelcomeText: b?.loginWelcomeText ?? "",
    loginBgUrl: b?.loginBgUrl ?? "",
  };
}

export default function BrandingSettingsPage() {
  const { data: branding, isLoading } = useBranding();
  const invalidateBranding = useInvalidateBranding();
  const tenant = useAuthStore((s) => s.tenant);

  const [form, setForm] = React.useState<BrandingForm>(toForm(null));
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Hydrate the form once branding loads.
  React.useEffect(() => {
    if (branding) setForm(toForm(branding));
  }, [branding]);

  const set = (key: keyof BrandingForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const colorValid = HEX_RE.test(form.brandColor);
  const previewColor = colorValid ? form.brandColor : DEFAULT_COLOR;
  const previewName = form.appName.trim() || branding?.companyName || "NexusERP";

  const brandedLink =
    typeof window !== "undefined" && tenant?.slug
      ? `${window.location.origin}/login/${tenant.slug}`
      : null;

  const handleLogoFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/files/upload/branding", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const body = res.data as { url?: string; data?: { url?: string } };
      const url = body?.url ?? body?.data?.url;
      if (!url) throw new Error("Upload succeeded but no URL was returned");
      set("logoUrl")(url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Logo upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (form.brandColor && !colorValid) {
      toast.error("Brand color must be a 6-digit hex value like #2563eb");
      return;
    }
    setSaving(true);
    try {
      await put("/settings/branding", {
        appName: form.appName.trim(),
        logoUrl: form.logoUrl.trim(),
        brandColor: form.brandColor.trim() || DEFAULT_COLOR,
        loginWelcomeText: form.loginWelcomeText.trim(),
        loginBgUrl: form.loginBgUrl.trim(),
      });
      invalidateBranding();
      toast.success("Branding saved");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Failed to save branding"));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!brandedLink) return;
    try {
      await navigator.clipboard.writeText(brandedLink);
      setCopied(true);
      toast.success("Branded login link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Branding</h1>
        <p className="text-sm text-muted-foreground">
          White-label NexusERP with your organization&apos;s name, logo, and colors
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ─── Form ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand settings</CardTitle>
            <CardDescription>
              Shown in the app sidebar and on your branded login page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="App / display name">
              <Input
                placeholder="e.g. Acme Operations"
                maxLength={100}
                value={form.appName}
                onChange={(e) => set("appName")(e.target.value)}
              />
            </FormField>

            <FormField label="Logo">
              <div className="flex items-center gap-3">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="h-10 w-10 rounded-lg border object-contain"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold"
                    style={{ backgroundColor: previewColor }}
                  >
                    {previewName.charAt(0).toUpperCase()}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleLogoFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload logo
                </Button>
                {form.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => set("logoUrl")("")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </FormField>

            <FormField
              label="Brand color"
              error={form.brandColor && !colorValid ? "Use a 6-digit hex like #2563eb" : undefined}
            >
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick brand color"
                  className="h-9 w-12 cursor-pointer rounded-md border p-1"
                  value={previewColor}
                  onChange={(e) => set("brandColor")(e.target.value)}
                />
                <Input
                  placeholder={DEFAULT_COLOR}
                  className="w-32 font-mono"
                  maxLength={7}
                  value={form.brandColor}
                  onChange={(e) => set("brandColor")(e.target.value)}
                />
              </div>
            </FormField>

            <FormField label="Login welcome text">
              <Textarea
                placeholder="Welcome back! Sign in to your workspace."
                maxLength={255}
                rows={2}
                value={form.loginWelcomeText}
                onChange={(e) => set("loginWelcomeText")(e.target.value)}
              />
            </FormField>

            <FormField label="Login background image URL">
              <Input
                placeholder="https://…/background.jpg"
                value={form.loginBgUrl}
                onChange={(e) => set("loginBgUrl")(e.target.value)}
              />
            </FormField>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save branding
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Live preview ─── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live preview</CardTitle>
              <CardDescription>How your branding looks in the app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sidebar header mock */}
              <div
                className="flex h-12 items-center gap-2 rounded-md px-4"
                style={{ backgroundColor: previewColor }}
              >
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="h-7 w-7 rounded-lg bg-white/90 object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
                    {previewName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-base font-bold text-white">{previewName}</span>
              </div>

              {/* Color swatch on a sample button */}
              <div className="flex items-center gap-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="rounded border px-2 py-1 font-mono text-xs">{previewColor}</span>
                <Button size="sm" style={{ backgroundColor: previewColor }}>
                  Sample button
                </Button>
              </div>

              {/* Login card mock */}
              <div
                className="rounded-lg border p-4"
                style={
                  form.loginBgUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${form.loginBgUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : { backgroundColor: previewColor }
                }
              >
                <div className="mx-auto max-w-[220px] space-y-2 rounded-md bg-white p-4 shadow dark:bg-slate-950">
                  <div className="text-center text-sm font-semibold">{previewName}</div>
                  <p className="line-clamp-2 text-center text-[10px] text-muted-foreground">
                    {form.loginWelcomeText || "Enter your credentials to access your account"}
                  </p>
                  <div className="h-6 rounded border bg-muted/40" />
                  <div className="h-6 rounded border bg-muted/40" />
                  <div
                    className="flex h-6 items-center justify-center rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: previewColor }}
                  >
                    Sign in
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branded login link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branded login link</CardTitle>
              <CardDescription>
                Share this link with your team — it shows your branding before sign-in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandedLink ? (
                <div className="flex items-center gap-2">
                  <Input readOnly value={brandedLink} className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Organization slug unavailable — sign in again to refresh tenant info.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
