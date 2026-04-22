import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type DocKey = "selfie" | "aadhaar" | "pan" | "dl" | "rc";
const docLabels: { key: DocKey; label: string; required: boolean }[] = [
  { key: "selfie", label: "Selfie photo *", required: true },
  { key: "aadhaar", label: "Aadhaar card *", required: true },
  { key: "pan", label: "PAN card", required: false },
  { key: "dl", label: "Driving license *", required: true },
  { key: "rc", label: "Vehicle RC *", required: true },
];

const DeliveryKyc = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partner, setPartner] = useState<any>(null);
  const [form, setForm] = useState({ aadhaar_no: "", pan_no: "", driving_license_no: "", vehicle_rc_no: "" });
  const [files, setFiles] = useState<Record<DocKey, File | null>>({ selfie: null, aadhaar: null, pan: null, dl: null, rc: null });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("delivery_partners").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setPartner(data);
        setForm({
          aadhaar_no: data.aadhaar_no ?? "",
          pan_no: data.pan_no ?? "",
          driving_license_no: data.driving_license_no ?? "",
          vehicle_rc_no: data.vehicle_rc_no ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!form.aadhaar_no || !form.driving_license_no || !form.vehicle_rc_no) {
      return toast({ title: "Aadhaar, DL and RC numbers are required", variant: "destructive" });
    }
    setSaving(true);
    const update: any = { ...form, kyc_status: "pending", kyc_submitted_at: new Date().toISOString() };

    for (const { key, required } of docLabels) {
      const f = files[key];
      if (!f) {
        if (required && !partner?.[`${key}_path`]) {
          setSaving(false);
          return toast({ title: `${key.toUpperCase()} document is required`, variant: "destructive" });
        }
        continue;
      }
      const path = `${user.id}/delivery/${key}-${Date.now()}-${f.name}`;
      const { error: ue } = await supabase.storage.from("kyc-docs").upload(path, f, { upsert: true });
      if (ue) { setSaving(false); return toast({ title: "Upload failed", description: ue.message, variant: "destructive" }); }
      update[`${key}_path`] = path;
    }

    let res;
    if (partner) res = await supabase.from("delivery_partners").update(update).eq("id", partner.id);
    else res = await supabase.from("delivery_partners").insert({ user_id: user.id, ...update });

    setSaving(false);
    if (res.error) return toast({ title: res.error.message, variant: "destructive" });
    toast({ title: "KYC submitted", description: "Admin will review your documents shortly." });
    setPartner({ ...(partner ?? { user_id: user.id }), ...update });
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const isSubmitted = partner?.kyc_status === "pending" || partner?.kyc_status === "approved";

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KYC verification</h1>
        {partner && <Badge variant={partner.kyc_status === "approved" ? "default" : "secondary"}>{partner.kyc_status ?? "not submitted"}</Badge>}
      </div>

      {partner?.kyc_status === "pending" && (
        <Alert className="border-2 border-yellow-500 bg-yellow-50/50 text-yellow-900 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="font-black uppercase tracking-widest text-[10px]">Verification in Progress</AlertTitle>
          <AlertDescription className="font-bold text-sm mt-1">
            You have successfully submitted your KYC details. Please wait for 12-24 hours for KYC verification.
          </AlertDescription>
        </Alert>
      )}

      <Card className={isSubmitted ? "opacity-70 pointer-events-none grayscale-[0.5]" : ""}>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Identity & vehicle documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Aadhaar number *</Label><Input value={form.aadhaar_no} onChange={(e) => setForm({ ...form, aadhaar_no: e.target.value })} maxLength={12} disabled={isSubmitted} /></div>
            <div className="grid gap-2"><Label>PAN number</Label><Input value={form.pan_no} onChange={(e) => setForm({ ...form, pan_no: e.target.value })} maxLength={10} disabled={isSubmitted} /></div>
            <div className="grid gap-2"><Label>Driving license no. *</Label><Input value={form.driving_license_no} onChange={(e) => setForm({ ...form, driving_license_no: e.target.value })} disabled={isSubmitted} /></div>
            <div className="grid gap-2"><Label>Vehicle RC no. *</Label><Input value={form.vehicle_rc_no} onChange={(e) => setForm({ ...form, vehicle_rc_no: e.target.value })} disabled={isSubmitted} /></div>
          </div>
          <div className="space-y-3 pt-2">
            {docLabels.map((d) => (
              <div key={d.key} className="grid gap-2">
                <Label>{d.label} {partner?.[`${d.key}_path`] && <span className="text-xs text-muted-foreground">(uploaded)</span>}</Label>
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFiles((f) => ({ ...f, [d.key]: e.target.files?.[0] ?? null }))} disabled={isSubmitted} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isSubmitted && (
        <Button onClick={submit} disabled={saving} size="lg" className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Submit for verification
        </Button>
      )}
    </div>
  );
};

export default DeliveryKyc;
