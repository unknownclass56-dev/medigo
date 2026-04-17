import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PolicyLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-50 py-12 px-4">
    <Card className="max-w-4xl mx-auto shadow-elegant">
      <CardHeader className="bg-[#10847E] text-white rounded-t-xl py-8">
        <CardTitle className="text-3xl font-black text-center">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-8 prose prose-slate max-w-none">
        {children}
      </CardContent>
    </Card>
  </div>
);

export const TermsOfService = () => (
  <PolicyLayout title="Terms of Service">
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing MediGo, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
    <h2>2. Services Provided</h2>
    <p>MediGo provides a platform connecting customers with pharmacies and delivery partners. We do not manufacture medicines.</p>
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
