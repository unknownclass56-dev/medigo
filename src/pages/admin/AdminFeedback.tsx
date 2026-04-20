import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, User, Clock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminFeedback = () => {
  const { data: feedbacks, isLoading, refetch } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete feedback");
    } else {
      toast.success("Feedback deleted");
      refetch();
    }
  };

  if (isLoading) return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black tracking-tighter italic">User Feedback</h1>
        <p className="text-muted-foreground font-medium">Hear what your customers are saying about MediHelth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {feedbacks?.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[32px] border-4 border-dashed border-slate-200">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No feedback received yet</p>
          </div>
        ) : (
          feedbacks?.map((fb) => (
            <Card key={fb.id} className="group border-none shadow-soft hover:shadow-elegant transition-all duration-300 rounded-[32px] overflow-hidden">
              <CardHeader className="bg-slate-50/50 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{fb.full_name || "Anonymous"}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{fb.email || "No Email"}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteFeedback(fb.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${fb.rating >= s ? "text-yellow-400 fill-current" : "text-slate-200"}`} />
                  ))}
                </div>
                <p className="text-slate-600 font-medium text-sm leading-relaxed italic">"{fb.message}"</p>
                <div className="pt-2 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <Clock className="h-3 w-3" />
                  {new Date(fb.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminFeedback;
