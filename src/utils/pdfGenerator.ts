import { jsPDF } from "jspdf";

export interface AgreementData {
  pharmacyName: string;
  ownerName: string;
  licenseNo: string;
  address: string;
  date: string;
}

export const generateAgreementPDF = (data: AgreementData): Blob => {
  const doc = new jsPDF();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(0, 128, 128); // Teal color
  doc.text("MediHealth Partnership Agreement", margin, y);
  y += 15;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Agreement Date: ${data.date}`, margin, y);
  y += 10;

  // Content
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("1. PARTIES", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const introText = `This Partnership Agreement is entered into between MediHealth Technologies (hereinafter "the Platform") and ${data.pharmacyName}, owned by ${data.ownerName}, located at ${data.address} (hereinafter "the Partner").`;
  const splitIntro = doc.splitTextToSize(introText, 170);
  doc.text(splitIntro, margin, y);
  y += splitIntro.length * 5 + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. DATA PRIVACY & CONFIDENTIALITY", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 0, 0); // Red for emphasis
  const privacyText = `The Partner strictly agrees NOT to share, leak, or sell any user/customer data (including names, phone numbers, addresses, or medical history) outside the MediHealth Platform. Any unauthorized data sharing or breach of confidentiality will result in a MANDATORY FINE OF INR 10,000 (Ten Thousand Rupees) per instance and immediate termination of partnership.`;
  const splitPrivacy = doc.splitTextToSize(privacyText, 170);
  doc.text(splitPrivacy, margin, y);
  y += splitPrivacy.length * 5 + 5;

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. SERVICE STANDARDS", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const serviceText = `The Partner agrees to provide authentic medicines and maintain accurate inventory levels. All orders must be processed within the stipulated time frames to ensure 30-minute delivery promise to the customers.`;
  const splitService = doc.splitTextToSize(serviceText, 170);
  doc.text(splitService, margin, y);
  y += splitService.length * 5 + 10;

  // Signature Section
  doc.setDrawColor(200);
  doc.line(margin, y, 190, y);
  y += 10;

  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(11);
  doc.text("ELECTRONICALLY SIGNED BY:", margin, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(data.ownerName.toUpperCase(), margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Authorized Signatory for ${data.pharmacyName}`, margin, y);
  y += 5;
  doc.text(`Timestamp: ${new Date().toISOString()}`, margin, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This is a digitally generated legal document. No physical signature required.", 105, 280, { align: "center" });

  return doc.output("blob");
};
