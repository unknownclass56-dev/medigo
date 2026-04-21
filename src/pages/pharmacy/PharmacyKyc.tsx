import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Upload, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

const PharmacyKyc = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [form, setForm] = useState({ license_no: "", gst_no: "", owner_aadhaar: "" });
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("pharmacies").select("*").eq("owner_id", user.id).maybeSingle();
      if (data) {
        setPharmacy(data);
        setForm({
          license_no: data.license_no ?? "",
          gst_no: data.gst_no ?? "",
          owner_aadhaar: data.owner_aadhaar ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const submit = async () => {
    if (!user || !pharmacy) return toast({ title: "Register your pharmacy first", variant: "destructive" });
    if (!form.license_no || !form.owner_aadhaar) return toast({ title: "License No. and Aadhaar are required", variant: "destructive" });
    setSaving(true);

    let shop_photo_path = pharmacy.shop_photo_path;
    if (shopPhoto) {
      const path = `${user.id}/pharmacy/shop-${Date.now()}-${shopPhoto.name}`;
      const { error: ue } = await supabase.storage.from("kyc-docs").upload(path, shopPhoto, { upsert: true });
      if (ue) { setSaving(false); return toast({ title: "Upload failed", description: ue.message, variant: "destructive" }); }
      shop_photo_path = path;
    }

    const { error } = await supabase.from("pharmacies").update({
      license_no: form.license_no,
      gst_no: form.gst_no || null,
      owner_aadhaar: form.owner_aadhaar,
      shop_photo_path,
      kyc_status: "pending",
      kyc_submitted_at: new Date().toISOString(),
    }).eq("id", pharmacy.id);

    setSaving(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "KYC submitted", description: "Admin will review your documents shortly." });
    setPharmacy({ ...pharmacy, ...form, shop_photo_path, kyc_status: "pending" });
  };

  const isPending = pharmacy?.kyc_status === "pending";
  const isApproved = pharmacy?.kyc_status === "approved";
  const isReadOnly = isPending || isApproved;

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KYC verification</h1>
        {pharmacy && <Badge variant={isApproved ? "default" : isPending ? "secondary" : "outline"}>{pharmacy.kyc_status || 'NOT SUBMITTED'}</Badge>}
      </div>

      {!pharmacy && (
        <Card><CardContent className="p-5 text-sm text-muted-foreground">Register your pharmacy first from the Home tab.</CardContent></Card>
      )}

      {pharmacy && (
        <>
          {isPending && (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
                <div className="text-orange-800 text-sm font-medium">
                  Your KYC documents have been submitted successfully. Please wait 24-48 hours for our admin team to verify them.
                </div>
              </CardContent>
            </Card>
          )}

          {isApproved && (
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <div className="text-emerald-800 text-sm font-medium">
                  Your KYC has been approved! Your pharmacy is fully verified.
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Business documents</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2"><Label>Drug license number *</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} placeholder="e.g. KA-12345" disabled={isReadOnly} /></div>
              <div className="grid gap-2"><Label>GST number</Label><Input value={form.gst_no} onChange={(e) => setForm({ ...form, gst_no: e.target.value })} placeholder="22AAAAA0000A1Z5" disabled={isReadOnly} /></div>
              <div className="grid gap-2"><Label>Owner Aadhaar number *</Label><Input value={form.owner_aadhaar} onChange={(e) => setForm({ ...form, owner_aadhaar: e.target.value })} placeholder="12-digit Aadhaar" maxLength={12} disabled={isReadOnly} /></div>
              <div className="grid gap-2">
                <Label>Shop photo {pharmacy.shop_photo_path && <span className="text-xs text-muted-foreground">(uploaded)</span>}</Label>
                <Input type="file" accept="image/*" onChange={(e) => setShopPhoto(e.target.files?.[0] ?? null)} disabled={isReadOnly} />
              </div>
            </CardContent>
          </Card>

          <Button onClick={submit} disabled={saving || isReadOnly} size="lg" className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isPending ? "Verification in Progress" : isApproved ? "KYC Approved" : "Submit for verification"}
          </Button>
        </>
      )}
    </div>
  );
};

export default PharmacyKyc;
