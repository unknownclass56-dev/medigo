import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User, Phone, Shield, MoreHorizontal, Edit, Trash2, Eye, AlertTriangle, Check, Wallet, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const UserDetailsModal = ({ user, onClose }: { user: any; onClose: () => void }) => {
  const [stats, setStats] = useState<{today: number, week: number, month: number, total: number}>({today:0, week:0, month:0, total:0});
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        let ordersData: any[] | null = null;
        
        // If delivery partner
        if (user.user_roles?.some((r: any) => r.role === "delivery_partner")) {
          const { data: dp } = await supabase.from("delivery_partners").select("id").eq("user_id", user.user_id).maybeSingle();
          if (dp) {
            const { data } = await supabase.from("orders").select("id, delivery_charge, total, status, created_at").eq("delivery_partner_id", dp.id).eq("status", "delivered");
            ordersData = data?.map(o => ({...o, amount: Number(o.delivery_charge || 0)})) || [];
          }
        } 
        // If pharmacy owner
        else if (user.user_roles?.some((r: any) => r.role === "pharmacy_owner")) {
          const { data: p } = await supabase.from("pharmacies").select("id").eq("owner_id", user.user_id).maybeSingle();
          if (p) {
            const { data } = await supabase.from("orders").select("id, total, status, created_at").eq("pharmacy_id", p.id);
            ordersData = data?.map(o => ({...o, amount: Number(o.total || 0)})) || [];
          }
        }

        if (ordersData) {
          const todayStart = new Date(); todayStart.setHours(0,0,0,0);
          const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0,0,0,0);
          const monthStart = new Date(); monthStart.setDate(monthStart.getDate() - 30); monthStart.setHours(0,0,0,0);

          let t=0, w=0, m=0, l=0;
          ordersData.forEach(o => {
            const d = new Date(o.created_at);
            l += o.amount;
            if (d >= todayStart) t += o.amount;
            if (d >= weekStart) w += o.amount;
            if (d >= monthStart) m += o.amount;
          });
          setStats({today:t, week:w, month:m, total:l});
          setHistory(ordersData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            User Insights: {user?.full_name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><Skeleton className="h-[200px] w-full" /></div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-2">
                <Card className="bg-primary/5 border-primary/20 p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Today</div>
                  <div className="text-lg font-black text-primary">₹{stats.today.toFixed(0)}</div>
                </Card>
                <Card className="bg-muted/30 border-transparent p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">This Week</div>
                  <div className="text-lg font-bold">₹{stats.week.toFixed(0)}</div>
                </Card>
                <Card className="bg-muted/30 border-transparent p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">This Month</div>
                  <div className="text-lg font-bold">₹{stats.month.toFixed(0)}</div>
                </Card>
                <Card className="bg-muted/30 border-transparent p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">All Time</div>
                  <div className="text-lg font-bold">₹{stats.total.toFixed(0)}</div>
                </Card>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2"><Wallet className="w-4 h-4" /> Order History</h4>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No related orders found.</p>
                ) : (
                  history.slice(0, 50).map(o => (
                    <div key={o.id} className="flex justify-between items-center p-3 rounded-lg border text-sm">
                      <div>
                        <div className="font-semibold">#{o.id.slice(0,8)}</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">+ ₹{o.amount.toFixed(2)}</div>
                        <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [tab, setTab] = useState("all");

  const { data: users, isLoading, isError, error: queryError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: pError } = await supabase.from("profiles").select("*");
      if (pError) throw pError;
      const { data: roles, error: rError } = await supabase.from("user_roles").select("user_id, role");
      if (rError) throw rError;

      return profiles.map(profile => ({
        ...profile,
        user_roles: roles.filter(r => r.user_id === profile.user_id)
      }));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Check if the role already exists
      const { data: existing } = await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", role);
      
      // Insert the new role FIRST to avoid losing admin privileges if modifying oneself
      if (!existing || existing.length === 0) {
        const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role: role as any });
        if (insertError) throw insertError;
      }

      // Then remove any other roles the user might have
      const { error: deleteError } = await supabase.from("user_roles").delete().eq("user_id", userId).neq("role", role);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
      setEditingUser(null);
    },
    onError: (error: any) => toast.error("Error updating role: " + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Permanent delete from profiles and roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User permanently deleted!");
    },
    onError: (err: any) => toast.error("Failed to delete: " + err.message)
  });

  const displayUsers = users?.filter(u => {
    if (tab === "all") return true;
    if (tab === "delivery") return u.user_roles?.some((r: any) => r.role === "delivery_partner");
    if (tab === "pharmacy") return u.user_roles?.some((r: any) => r.role === "pharmacy_owner" || r.role === "pharmacy");
    return true;
  });

  return (
    <div className="container max-w-6xl space-y-6 py-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users and their platform roles.</p>
        </div>
      </div>

      {isError && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Users</AlertTitle>
          <AlertDescription>{(queryError as any)?.message}</AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-card bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="mb-2">
              <TabsTrigger value="all" className="flex items-center gap-2"><User className="w-4 h-4"/> Registered Users</TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">Delivery Users</TabsTrigger>
              <TabsTrigger value="pharmacy" className="flex items-center gap-2">Pharmacy Users</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-bold">User Details</TableHead>
                  <TableHead className="font-bold">Contact</TableHead>
                  <TableHead className="font-bold">System Roles</TableHead>
                  <TableHead className="font-bold">Joined On</TableHead>
                  <TableHead className="text-right font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers?.map((user) => (
                  <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                    <TableCell className="font-medium align-top py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{user.full_name || "Anonymous User"}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">{user.user_id.slice(0, 8)}...</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-secondary/30 w-fit px-2 py-1 rounded-md">
                        <Phone className="h-3.5 w-3.5" />{user.phone || "No phone"}
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {user.user_roles?.length > 0 ? (
                          user.user_roles.map((ur: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="capitalize text-[10px] font-bold px-2 py-0 border-primary/20 bg-primary/5 text-primary">
                              <Shield className="h-2.5 w-2.5 mr-1" />{ur.role.replace("_", " ")}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight opacity-50 text-destructive">Inactive / Deactivated</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground align-top py-4">
                      {new Date(user.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </TableCell>
                    <TableCell className="text-right align-top py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px] p-1 shadow-elegant animate-in fade-in-0 zoom-in-95">
                          <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">User Options</DropdownMenuLabel>
                          <DropdownMenuSeparator className="mx-1" />
                          <DropdownMenuItem className="gap-2.5 cursor-pointer text-sm font-medium focus:bg-primary/5 focus:text-primary rounded-md h-9 px-2" onClick={() => setViewingUser(user)}>
                            <Eye className="h-4 w-4 opacity-70" /> View Earnings & Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2.5 cursor-pointer text-sm font-medium focus:bg-primary/5 focus:text-primary rounded-md h-9 px-2"
                            onClick={() => { setEditingUser(user); setNewRole(user.user_roles?.[0]?.role || "customer"); }}
                          >
                            <Edit className="h-4 w-4 opacity-70" /> Manage Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="mx-1" />
                          <DropdownMenuItem 
                            className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer text-sm font-medium rounded-md h-9 px-2"
                            onClick={() => { if (window.confirm("CONFIRM DELETION: This will permanently delete the user profile and their access. Proceed?")) deleteMutation.mutate(user.user_id); }}
                          >
                            <Trash2 className="h-4 w-4 opacity-70" /> Delete Permanently
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {displayUsers?.length === 0 && !isLoading && !isError && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                      <p className="font-medium">No users found in this category.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Update User Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Platform Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="role" className="w-full"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="pharmacy_owner">Pharmacy Owner</SelectItem>
                  <SelectItem value="delivery_partner">Delivery Partner</SelectItem>
                  <SelectItem value="admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button onClick={() => updateRoleMutation.mutate({ userId: editingUser.user_id, role: newRole })} disabled={updateRoleMutation.isPending} className="gap-2">
              {updateRoleMutation.isPending ? "Updating..." : <><Check className="h-4 w-4" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserDetailsModal user={viewingUser} onClose={() => setViewingUser(null)} />
    </div>
  );
};

export default AdminUsers;


