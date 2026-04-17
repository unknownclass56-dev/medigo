import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/card"; // Wait, Dialog is usually in dialog.tsx
// Let me check the correct Dialog imports from src/components/ui/dialog.tsx
import { Dialog as RadixDialog, DialogContent as RadixDialogContent, DialogHeader as RadixDialogHeader, DialogTitle as RadixDialogTitle, DialogFooter as RadixDialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, FileText, Eye, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface KycDocument {
  label: string;
  path: string | null;
  value?: string | null;
}

interface KycReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
  documents: KycDocument[];
  onUpdate: () => void;
  type: "pharmacy" | "delivery";
}

const KycReviewModal = ({ isOpen, onClose, title, data, documents, onUpdate, type }: KycReviewModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    setIsUpdating(true);
    try {
      const table = type === "pharmacy" ? "pharmacies" : "delivery_partners";
      const payload: any = {
        kyc_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (type === "pharmacy") {
        payload.status = newStatus === "approved" ? "approved" : "rejected";
      } else {
        payload.approved = newStatus === "approved";
      }

      const { error } = await supabase
        .from(table)
        .update(payload)
        .eq("id", data.id);

      if (error) throw error;

      toast({
        title: `KYC ${newStatus === "approved" ? "Approved" : "Rejected"}`,
        description: `Successfully updated ${type} status.`,
      });
      
      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getPublicUrl = (path: string) => {
    const { data: { publicUrl } } = supabase.storage.from("kyc-docs").getPublicUrl(path);
    return publicUrl;
  };

  return (
    <RadixDialog open={isOpen} onOpenChange={onClose}>
      <RadixDialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <RadixDialogHeader className="p-6 border-b">
          <RadixDialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <Badge variant={data.kyc_status === "approved" ? "default" : data.kyc_status === "rejected" ? "destructive" : "secondary"}>
              {data.kyc_status}
            </Badge>
          </RadixDialogTitle>
        </RadixDialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Entity Name</span>
                <p className="font-medium">{type === "pharmacy" ? data.name : data.profiles?.full_name}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">ID / Reference</span>
                <p className="font-mono text-xs">{data.id}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Documents & Info</h3>
              <div className="grid gap-3">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-background border">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{doc.label}</p>
                        {doc.value && <p className="text-xs text-muted-foreground">Value: {doc.value}</p>}
                      </div>
                    </div>
                    {doc.path ? (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={getPublicUrl(doc.path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                          <Eye className="h-4 w-4" /> View
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">
                        <AlertCircle className="h-3 w-3 mr-1" /> Missing
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <RadixDialogFooter className="p-6 border-t bg-muted/10 gap-2 sm:gap-0">
          <div className="w-full flex items-center justify-between gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                className="gap-2"
                onClick={() => handleStatusUpdate("rejected")}
                disabled={isUpdating}
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button 
                className="gap-2"
                onClick={() => handleStatusUpdate("approved")}
                disabled={isUpdating}
              >
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
            </div>
          </div>
        </RadixDialogFooter>
      </RadixDialogContent>
    </RadixDialog>
  );
};

export default KycReviewModal;
