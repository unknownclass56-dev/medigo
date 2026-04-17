import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface ComplaintFormProps {
  orderId?: string;
  onSuccess?: () => void;
}

const ComplaintForm = ({ orderId, onSuccess }: ComplaintFormProps) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to submit a complaint");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("complaints")
        .insert({
          user_id: user.id,
          order_id: orderId || null,
          subject,
          message,
          status: "open"
        });

      if (error) throw error;

      toast.success("Complaint submitted successfully");
      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error("Failed to submit complaint: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Thank You!</h3>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            Your complaint has been received. Our support team will review it and get back to you soon.
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsSubmitted(false)}>Submit Another Issue</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-1">
      <div className="space-y-2 text-center mb-4">
        <div className="inline-flex items-center justify-center h-10 w-10 bg-primary/10 rounded-full text-primary mb-2">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Report an Issue</h2>
        <p className="text-sm text-muted-foreground italic">We value your feedback and will resolve your concern quickly.</p>
      </div>

      <div className="space-y-4 border rounded-xl p-4 bg-muted/20">
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider opacity-70">Subject</Label>
          <Input 
            id="subject" 
            placeholder="e.g., Delay in delivery, Incorrect medicine..." 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="bg-background border-muted-foreground/20 focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider opacity-70">Message</Label>
          <Textarea 
            id="message" 
            placeholder="Please describe the issue in detail..." 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="min-h-[120px] bg-background border-muted-foreground/20 focus-visible:ring-primary resize-none"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-11 gap-2 text-base font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" 
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          "Submitting..."
        ) : (
          <>
            <Send className="h-4 w-4" />
            Submit Complaint
          </>
        )}
      </Button>
    </form>
  );
};

export default ComplaintForm;
