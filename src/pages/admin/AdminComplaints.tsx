import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, MessageSquare, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const AdminComplaints = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] as any[] };
      return (data ?? []).map((c) => ({
        ...c,
        profiles: profs?.find((p) => p.user_id === c.user_id) ?? null,
      }));
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("complaints")
        .update({ status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
      toast({ title: "Complaint Resolved" });
    },
  });

  return (
    <div className="container max-w-6xl space-y-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Complaints & Support</h1>
        <p className="text-muted-foreground">Manage user reports and platform issues.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Active Complaints
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
                  <TableHead>User</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints?.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">{complaint.profiles?.full_name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{complaint.subject}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">{complaint.message}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={complaint.status === "open" ? "destructive" : "default"}>
                        {complaint.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {complaint.status === "open" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1.5"
                          onClick={() => resolveMutation.mutate(complaint.id)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {complaints?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No complaints found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminComplaints;
