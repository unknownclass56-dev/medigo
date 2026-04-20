import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, AlertCircle } from "lucide-react";
import KycReviewModal from "@/components/admin/KycReviewModal";

const AdminDelivery = () => {
  const [filter, setFilter] = useState("all");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);

  const { data: partners, isLoading, refetch } = useQuery({
    queryKey: ["admin-delivery-partners", filter],
    queryFn: async () => {
      // Step 1: Fetch Delivery Partners
      let partnerQuery = supabase.from("delivery_partners").select("*");
      if (filter !== "all") {
        partnerQuery = partnerQuery.eq("kyc_status", filter);
      }
      
      // Filter out incomplete profiles
      partnerQuery = partnerQuery.neq("kyc_status", "incomplete");
      
      const { data: partnerData, error: partnerError } = await partnerQuery.order("created_at", { ascending: false });
      if (partnerError) throw partnerError;

      // Step 2: Fetch Profiles for partners
      const partnerUserIds = partnerData?.map(p => p.user_id).filter(Boolean) || [];
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, user_id")
        .in("user_id", partnerUserIds);
      
      if (profileError) throw profileError;

      // Step 3: Merge
      const combined = partnerData?.map(partnerSelection => {
        const partnerProfile = profileData?.find(p => p.user_id === partnerSelection.user_id);
        return {
          ...partnerSelection,
          profiles: partnerProfile
        };
      });

      return combined;
    },
  });

  const getKycDocuments = (partner: any) => [
    { label: "Aadhaar Card", value: partner.aadhaar_no, path: partner.aadhaar_path },
    { label: "PAN Card", value: partner.pan_no, path: partner.pan_path },
    { label: "Driving License", value: partner.driving_license_no, path: partner.dl_path },
    { label: "Vehicle RC", value: partner.vehicle_rc_no, path: partner.rc_path },
    { label: "Selfie", path: partner.selfie_path },
  ];

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Delivery Partners</h1>
          <p className="text-muted-foreground">Manage delivery fleet onboarding and KYC verification.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Partners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners?.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.profiles?.full_name || "N/A"}</TableCell>
                    <TableCell>{partner.profiles?.phone || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm capitalize">{partner.vehicle_type || "N/A"}</span>
                        <span className="text-xs text-muted-foreground uppercase">{partner.vehicle_no || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {partner.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.approved ? "default" : "secondary"}>
                        {partner.approved ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPartner(partner)}>
                        Review KYC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {partners?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No delivery partners found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedPartner && (
        <KycReviewModal
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          title={`Review KYC: ${selectedPartner.profiles?.full_name}`}
          data={selectedPartner}
          documents={getKycDocuments(selectedPartner)}
          onUpdate={refetch}
          type="delivery"
        />
      )}
    </div>
  );
};

export default AdminDelivery;
