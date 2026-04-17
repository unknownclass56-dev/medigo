import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Search, Filter } from "lucide-react";
import KycReviewModal from "@/components/admin/KycReviewModal";

const AdminPharmacies = () => {
  const [filter, setFilter] = useState("all");
  const [selectedPharmacy, setSelectedPharmacy] = useState<any>(null);

  const { data: pharmacies, isLoading, refetch } = useQuery({
    queryKey: ["admin-pharmacies", filter],
    queryFn: async () => {
      // Step 1: Fetch Pharmacies
      let pharmQuery = supabase.from("pharmacies").select("*");
      if (filter !== "all") {
        pharmQuery = pharmQuery.eq("kyc_status", filter);
      }
      const { data: pharmData, error: pharmError } = await pharmQuery.order("created_at", { ascending: false });
      if (pharmError) throw pharmError;

      // Step 2: Fetch Profiles for owners
      const ownerIds = pharmData?.map(p => p.owner_id).filter(Boolean) || [];
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, user_id")
        .in("user_id", ownerIds);
      
      if (profileError) throw profileError;

      // Step 3: Merge
      const combined = pharmData?.map(pharmSelection => {
        const ownerProfile = profileData?.find(p => p.user_id === pharmSelection.owner_id);
        return {
          ...pharmSelection,
          profiles: ownerProfile
        };
      });

      return combined;
    },
  });

  const getKycDocuments = (pharmacy: any) => [
    { label: "GST Number", value: pharmacy.gst_no, path: null },
    { label: "Drug License", value: pharmacy.license_no, path: null },
    { label: "Owner Aadhaar", value: pharmacy.owner_aadhaar, path: null },
    { label: "Shop Photo", path: pharmacy.shop_photo_path },
  ];

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pharmacy Approvals</h1>
          <p className="text-muted-foreground">Review and approve pharmacy onboarding and KYC.</p>
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
            <Building2 className="h-5 w-5 text-primary" />
            Pharmacies
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
                  <TableHead>Pharmacy Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>KYC Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pharmacies?.map((pharmacy) => (
                  <TableRow key={pharmacy.id}>
                    <TableCell className="font-medium">{pharmacy.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{pharmacy.profiles?.full_name}</span>
                        <span className="text-xs text-muted-foreground">{pharmacy.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={pharmacy.status === "approved" ? "default" : pharmacy.status === "pending" ? "secondary" : "destructive"} className="capitalize">
                        {pharmacy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {pharmacy.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPharmacy(pharmacy)}>
                        Review KYC
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pharmacies?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No pharmacies found matching the filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedPharmacy && (
        <KycReviewModal
          isOpen={!!selectedPharmacy}
          onClose={() => setSelectedPharmacy(null)}
          title={`Review: ${selectedPharmacy.name}`}
          data={selectedPharmacy}
          documents={getKycDocuments(selectedPharmacy)}
          onUpdate={refetch}
          type="pharmacy"
        />
      )}
    </div>
  );
};

export default AdminPharmacies;
