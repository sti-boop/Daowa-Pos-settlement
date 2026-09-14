'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building2, Save, Upload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CompanySetup() {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', bin: '', tin: '',
    fYearStart: '2025-07-01', fYearEnd: '2026-06-30', currency: 'BDT', logo: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/company').then(r => r.json()).then(d => {
      if (d.id) setForm(f => ({ ...f, ...d }));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('Company details saved');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum 2MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/company/logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setForm(f => ({ ...f, logo: data.url }));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => {
    setForm(f => ({ ...f, logo: '' }));
  };

  if (loading) return <div className="animate-pulse space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Company Information
          </CardTitle>
          <CardDescription>Basic details about daowa.net healthcare business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="grid gap-2">
            <Label>Company Logo</Label>
            <div className="flex items-start gap-4">
              <div
                className={`relative w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors cursor-pointer group ${
                  form.logo ? 'border-transparent bg-muted/30' : 'border-muted-foreground/25 hover:border-[#4A90E2]/50 hover:bg-muted/30'
                }`}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                {form.logo ? (
                  <>
                    <img src={form.logo} alt="Company Logo" className="w-full h-full object-contain p-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    {uploading ? (
                      <div className="animate-spin h-6 w-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full" />
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mx-auto text-muted-foreground/50" />
                        <p className="text-[10px] text-muted-foreground/50 mt-1">Upload</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm text-muted-foreground">
                  {form.logo ? 'Logo uploaded. Click to replace.' : 'Click to upload your company logo.'}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  PNG, JPG, GIF, WebP or SVG. Max 2MB.
                </p>
                {form.logo && (
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-xs gap-1" onClick={removeLogo}>
                    <X className="h-3 w-3" /> Remove Logo
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Company Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Daowa Healthcare" />
          </div>
          <div className="grid gap-2">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>BIN (Business ID)</Label>
              <Input value={form.bin} onChange={e => setForm(f => ({ ...f, bin: e.target.value }))} placeholder="Business Identification Number" />
            </div>
            <div className="grid gap-2">
              <Label>TIN (Tax ID)</Label>
              <Input value={form.tin} onChange={e => setForm(f => ({ ...f, tin: e.target.value }))} placeholder="Tax Identification Number" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Financial Year</CardTitle>
          <CardDescription>Configure your accounting period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>FY Start Date</Label>
              <Input type="date" value={form.fYearStart} onChange={e => setForm(f => ({ ...f, fYearStart: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>FY End Date</Label>
              <Input type="date" value={form.fYearEnd} onChange={e => setForm(f => ({ ...f, fYearEnd: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Company Details'}
      </Button>
    </div>
  );
}