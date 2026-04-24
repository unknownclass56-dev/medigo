import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Upload, ShieldCheck, XCircle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { generateAgreementPDF, AgreementData } from "@/utils/pdfGenerator";

const PharmacyKyc = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopPhotoUrl, setShopPhotoUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [pharmacy, setPharmacy] = useState<any>(null);
  const [form, setForm] = useState({ 
    license_no: "", gst_no: "", owner_aadhaar: "",
    address: "", city: "", pincode: "", lat: 0, lng: 0
  });
  const [shopPhoto, setShopPhoto] = useState<File | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

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
          address: data.address ?? "",
          city: data.city ?? "",
          pincode: data.pincode ?? "",
          lat: data.lat ?? 0,
          lng: data.lng ?? 0,
        });
        if (data.shop_photo_path) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from("kyc-docs")
            .createSignedUrl(data.shop_photo_path, 3600);
          if (!signedError && signedData?.signedUrl) {
            setShopPhotoUrl(signedData.signedUrl);
          } else {
            // fallback to public URL
            setShopPhotoUrl(supabase.storage.from("kyc-docs").getPublicUrl(data.shop_photo_path).data.publicUrl);
          }
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const detect = () => {
    if (!navigator.geolocation) return toast({ title: "Geolocation unsupported", variant: "destructive" });
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        let addressStr = "";
        let cityStr = "";
        let pinStr = "";
        
        try {
          const { data, error } = await supabase.functions.invoke("reverse-geocode", { body: { lat, lng } });
          if (error) throw error;
          if (data) {
            addressStr = data.display_name || data.line1;
            cityStr = data.city;
            pinStr = data.pincode;
          }
        } catch (edgeErr) {
          console.warn("Edge function failed, falling back to direct API", edgeErr);
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`);
          if (!res.ok) throw new Error("Geocoding API failed");
          const data = await res.json();
          addressStr = data.display_name;
          cityStr = data.address?.city || data.address?.town || data.address?.village || "";
          pinStr = data.address?.postcode || "";
        }

        if (!addressStr) throw new Error("No location data found");

        setForm((f) => ({
          ...f, lat, lng,
          address: addressStr,
          city: cityStr || f.city,
          pincode: pinStr || f.pincode
        }));
        toast({ title: "Location detected successfully!" });
      } catch (err: any) {
        toast({ title: "Detection failed", description: err.message, variant: "destructive" });
        setForm((f) => ({ ...f, lat, lng, address: `Lat: ${lat}, Lng: ${lng}` }));
      } finally {
        setDetecting(false);
      }
    }, (err) => {
      setDetecting(false);
      toast({ title: "Detection failed", description: err.message, variant: "destructive" });
    }, { enableHighAccuracy: true });
  };

  const submit = async () => {
    if (!user || !pharmacy) return toast({ title: "Register your pharmacy first", variant: "destructive" });
    if (!form.license_no || !form.owner_aadhaar || !form.address) return toast({ title: "License No, Aadhaar, and Address are required", variant: "destructive" });
    if (!agreementAccepted && !pharmacy.agreement_signed) return toast({ title: "Please accept the partnership agreement", variant: "destructive" });
    setSaving(true);

    let shop_photo_path = pharmacy.shop_photo_path;
    if (shopPhoto) {
      const path = `${user.id}/pharmacy/shop-${Date.now()}-${shopPhoto.name}`;
      const { error: ue } = await supabase.storage.from("kyc-docs").upload(path, shopPhoto, { upsert: true });
      if (ue) { setSaving(false); return toast({ title: "Upload failed", description: ue.message, variant: "destructive" }); }
      shop_photo_path = path;
    }

    let agreement_pdf_path = pharmacy.agreement_pdf_path;
    let agreement_signed = pharmacy.agreement_signed;
    let agreement_signed_at = pharmacy.agreement_signed_at;

    if (agreementAccepted && !pharmacy.agreement_signed) {
      try {
        const pdfBlob = generateAgreementPDF({
          pharmacyName: pharmacy.name,
          ownerName: user?.user_metadata?.full_name || "Owner",
          licenseNo: form.license_no,
          address: form.address,
          date: new Date().toLocaleDateString()
        });
        const pdfFile = new File([pdfBlob], `agreement-${Date.now()}.pdf`, { type: "application/pdf" });
        const path = `${user.id}/pharmacy/agreement-${Date.now()}.pdf`;
        const { error: pe } = await supabase.storage.from("kyc-docs").upload(path, pdfFile);
        if (pe) throw pe;
        agreement_pdf_path = path;
        agreement_signed = true;
        agreement_signed_at = new Date().toISOString();
      } catch (err: any) {
        setSaving(false);
        return toast({ title: "Agreement generation failed", description: err.message, variant: "destructive" });
      }
    }

    const { error } = await supabase.from("pharmacies").update({
      license_no: form.license_no,
      gst_no: form.gst_no || null,
      owner_aadhaar: form.owner_aadhaar,
      address: form.address,
      city: form.city,
      pincode: form.pincode,
      lat: form.lat,
      lng: form.lng,
      shop_photo_path,
      kyc_status: "pending",
      status: "pending",
      kyc_submitted_at: new Date().toISOString(),
      agreement_signed,
      agreement_signed_at,
      agreement_pdf_path
    }).eq("id", pharmacy.id);

    setSaving(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "KYC submitted", description: "Admin will review your documents shortly." });
    setPharmacy({ ...pharmacy, ...form, shop_photo_path, kyc_status: "pending", status: "pending" });
  };

  const isPending = pharmacy?.kyc_status === "pending";
  const isApproved = pharmacy?.kyc_status === "approved";
  const isRejected = pharmacy?.kyc_status === "rejected";
  const isReadOnly = isPending || isApproved;

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KYC verification</h1>
        {pharmacy && <Badge variant={isApproved ? "default" : isRejected ? "destructive" : isPending ? "secondary" : "outline"}>{pharmacy.kyc_status || 'NOT SUBMITTED'}</Badge>}
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

          {isRejected && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <div className="text-red-800 text-sm font-medium">
                  Your KYC application was rejected. Please review your documents and submit again.
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Location details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button type="button" variant="secondary" onClick={detect} disabled={detecting || isReadOnly} className="w-full">
                {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                Detect store location
              </Button>
              <div className="grid gap-2">
                <Label>Exact Full Location *</Label>
                <Textarea 
                  value={form.address} 
                  onChange={(e) => setForm({ ...form, address: e.target.value })} 
                  placeholder="e.g. 123 Main St, Near Park, Mumbai, 400001" 
                  disabled={isReadOnly} 
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Business documents</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2"><Label>Drug license number *</Label><Input value={form.license_no} onChange={(e) => setForm({ ...form, license_no: e.target.value })} placeholder="e.g. KA-12345" disabled={isReadOnly} /></div>
              <div className="grid gap-2"><Label>GST number</Label><Input value={form.gst_no} onChange={(e) => setForm({ ...form, gst_no: e.target.value })} placeholder="22AAAAA0000A1Z5" disabled={isReadOnly} /></div>
              <div className="grid gap-2"><Label>Owner Aadhaar number *</Label><Input value={form.owner_aadhaar} onChange={(e) => setForm({ ...form, owner_aadhaar: e.target.value })} placeholder="12-digit Aadhaar" maxLength={12} disabled={isReadOnly} /></div>
              <div className="grid gap-2">
                <Label>Shop photo {pharmacy.shop_photo_path && <span className="text-xs text-muted-foreground">(uploaded)</span>}</Label>
                {shopPhotoUrl && (
                  <div className="h-32 w-48 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative mb-2">
                    <img 
                      src={shopPhotoUrl} 
                      alt="Shop" 
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
                <Input type="file" accept="image/*" onChange={(e) => setShopPhoto(e.target.files?.[0] ?? null)} disabled={isReadOnly} />
              </div>
            </CardContent>
          </Card>

          <Card className={isReadOnly && !pharmacy.agreement_signed ? "opacity-70" : ""}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Partnership Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] font-medium leading-relaxed text-slate-600 space-y-4">
                <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">1. DATA PRIVACY & SECURITY</p>
                <p>The Partner (Pharmacy) agrees that all customer data accessed via the MediHealth Platform is strictly confidential. The Partner shall NOT share, sell, or distribute customer names, phone numbers, addresses, or medical records to any third party.</p>
                <p className="bg-red-50 text-red-700 p-2 rounded-lg border border-red-100 font-bold">
                  ANY BREACH OF DATA PRIVACY WILL RESULT IN A MANDATORY FINE OF INR 10,000 AND IMMEDIATE ACCOUNT TERMINATION.
                </p>
                <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">2. SERVICE LEVELS</p>
                <p>The Partner agrees to maintain high standards of medicine authenticity and ensures that all items are well within their expiry dates.</p>
                <p className="font-black text-slate-900 uppercase tracking-widest text-[10px]">3. ELECTRONIC SIGNATURE</p>
                <p>By checking the box below and submitting this KYC, the Partner provides their electronic signature and agrees to all terms and conditions of the MediHealth Partnership.</p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="agreement" 
                  checked={agreementAccepted || pharmacy.agreement_signed} 
                  onCheckedChange={(checked) => setAgreementAccepted(checked as boolean)}
                  disabled={isReadOnly || pharmacy.agreement_signed}
                />
                <label 
                  htmlFor="agreement"
                  className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the MediHealth Partnership Terms & Privacy Policy
                </label>
              </div>
              {pharmacy.agreement_signed && (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100">
                  Agreement Signed on {new Date(pharmacy.agreement_signed_at).toLocaleDateString()}
                </Badge>
              )}
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
