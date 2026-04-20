import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "lucide-react";
import { Link } from "react-router-dom";

const PolicyLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans">
    <div className="max-w-4xl mx-auto mb-8 flex justify-center">
      <Link to="/" className="flex items-center gap-3">
        <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white">
          <Pill className="h-6 w-6" />
        </div>
        <span className="text-2xl font-black tracking-tighter text-slate-900">MediHealth</span>
      </Link>
    </div>
    <Card className="max-w-4xl mx-auto shadow-elegant border-none rounded-[40px] overflow-hidden">
      <CardHeader className="bg-primary text-white py-12">
        <CardTitle className="text-4xl font-black text-center italic tracking-tighter">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-12 prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:italic">
        {children}
      </CardContent>
    </Card>
  </div>
);

export const TermsOfService = () => (
  <PolicyLayout title="Terms of Service">
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing MediHealth, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
    <h2>2. Services Provided</h2>
    <p>MediHealth provides a platform connecting customers with pharmacies and delivery partners. We do not manufacture medicines.</p>
    <h2>3. User Obligations</h2>
    <p>Users must provide accurate information and follow local laws regarding prescription medicines.</p>
  </PolicyLayout>
);

export const PrivacyPolicy = () => (
  <PolicyLayout title="Privacy Policy">
    <h2>1. Data Collection</h2>
    <p>We collect information you provide (name, address, health documents) to facilitate orders.</p>
    <h2>2. Data Usage</h2>
    <p>Your data is used to coordinate delivery and improve our services. We do not sell your personal data.</p>
    <h2>3. Cookies</h2>
    <p>We use cookies to maintain your session and cart state.</p>
  </PolicyLayout>
);

export const RefundPolicy = () => (
  <PolicyLayout title="Refund Policy">
    <h2>1. Eligibility for Refund</h2>
    <p>Refunds are applicable if the medicine is damaged, incorrect, or expired upon delivery.</p>
    <h2>2. Non-Refundable Items</h2>
    <p>Opened packages or items ordered with incorrect prescriptions are generally non-refundable.</p>
    <h2>3. Process</h2>
    <p>Contact support within 24 hours of delivery with photographic evidence.</p>
  </PolicyLayout>
);

export const AccessibilityPolicy = () => (
  <PolicyLayout title="Accessibility">
    <h2>1. Our Commitment</h2>
    <p>MediHealth is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone.</p>
    <h2>2. Standards</h2>
    <p>We aim to comply with Web Content Accessibility Guidelines (WCAG) 2.1 level AA standards across our platform.</p>
    <h2>3. Feedback</h2>
    <p>If you encounter any accessibility barriers, please reach out to us through our feedback form so we can assist you better.</p>
  </PolicyLayout>
);
