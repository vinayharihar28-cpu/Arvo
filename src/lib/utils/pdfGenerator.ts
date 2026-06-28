import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InvoiceItem {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  gst_amount: number;
  total: number;
  hsn_sac?: string;
}

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  customers: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    gst_number?: string;
  };
  organizations: {
    name: string;
    logo_url?: string;
    gst_number?: string;
    address?: string;
    phone?: string;
    tagline?: string;
    qr_code_url?: string;
    pan_number?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    branch_name?: string;
    upi_id?: string;
    email?: string;
  };
  items: InvoiceItem[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Convert numbers to Indian Rupees words format
function numberToWords(num: number): string {
  const a = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
  ];
  const b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function g(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? "-" + a[digit] : "");
  }

  function h(n: number): string {
    if (n < 100) return g(n);
    return a[Math.floor(n / 100)] + " hundred" + (n % 100 ? " and " + g(n % 100) : "");
  }

  if (num === 0) return "Zero Rupees Only";

  const main = Math.floor(num);
  const fraction = Math.round((num - main) * 100);

  let str = "";
  let n = main;

  if (n >= 10000000) {
    str += h(Math.floor(n / 10000000)) + " crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    str += h(Math.floor(n / 100000)) + " lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    str += h(Math.floor(n / 1000)) + " thousand ";
    n %= 1000;
  }
  if (n > 0) {
    str += h(n);
  }

  str = str.trim() + " rupees";

  if (fraction > 0) {
    str += " and " + g(fraction) + " paise";
  }

  return str.charAt(0).toUpperCase() + str.slice(1) + " only";
}

// Fetch image helper
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result as string), false);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image for PDF:", error);
    return null;
  }
}

export async function generateInvoicePDF(invoice: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // 1. Fetch QR codes once before page drawing loop (network task)
  let qrBase64: string | null = null;
  const upiId = invoice.organizations.upi_id;
  const grandTotal = Math.round(invoice.total_amount);
  if (upiId) {
    const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(invoice.organizations.name)}&am=${grandTotal}&tn=${invoice.invoice_number}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;
    qrBase64 = await getBase64ImageFromUrl(qrUrl);
  } else if (invoice.organizations.qr_code_url) {
    qrBase64 = await getBase64ImageFromUrl(invoice.organizations.qr_code_url);
  }

  // 1b. Fetch org logo once
  let logoBase64: string | null = null;
  if (invoice.organizations.logo_url) {
    logoBase64 = await getBase64ImageFromUrl(invoice.organizations.logo_url);
  }

  const copies = [
    { label: "(ORIGINAL FOR CUSTOMER)" },
    { label: "(DUPLICATE FOR ORGANIZATION)" }
  ];

  for (let cIdx = 0; cIdx < copies.length; cIdx++) {
    if (cIdx > 0) {
      doc.addPage();
    }
    const currentCopy = copies[cIdx];

    // 2. Draw Page Outer Border (Black box)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, 200, 287);

    // 3. Header Centered Texts
    doc.setFont("Helvetica", "italic");
    doc.setFontSize(8);
    doc.text("|| Om Shree Ganeshaya Namha ||", 105, 9, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.text(currentCopy.label, 200, 9, { align: "right" });

    doc.setFontSize(13);
    doc.text("TAX INVOICE", 105, 14, { align: "center" });

    // 4. Grid Boxes (Row 1: Company details & Invoice metadata)
    // Left Box: Company Info (width 105mm: x=5 to x=110)
    doc.rect(5, 17, 105, 33);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);

    // Logo on the RIGHT side of the left company box
    const logoW = 28;
    const logoH = 28;
    const logoX = 110 - logoW - 2; // right-aligned inside left box with 2mm padding
    const logoY = 18.5;
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", logoX, logoY, logoW, logoH);
    }

    // Company text is constrained to the left portion so it doesn't overlap the logo
    const textMaxWidth = logoBase64 ? logoX - 7 : 101;
    doc.text(invoice.organizations.name.toUpperCase(), 7, 21.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    const splitAddress = doc.splitTextToSize(invoice.organizations.address || "No Address Provided", textMaxWidth);
    doc.text(splitAddress, 7, 25.5);

    let companyY = 25.5 + (splitAddress.length * 3.5);
    if (invoice.organizations.phone) {
      doc.text(`Tel.: ${invoice.organizations.phone}`, 7, companyY);
      companyY += 3.5;
    }
    if (invoice.organizations.email) {
      doc.text(`Email: ${invoice.organizations.email}`, 7, companyY);
      companyY += 3.5;
    }

    doc.setFont("Helvetica", "bold");
    doc.text(`GSTIN: ${invoice.organizations.gst_number || "N/A"}`, 7, companyY);

    // Right Box: Invoice Metadata
    doc.rect(110, 17, 95, 33);
    // Grid divisions inside Right Box
    doc.line(110, 22.5, 205, 22.5); // Row 1 line
    doc.line(110, 28, 205, 28);     // Row 2 line
    doc.line(110, 33.5, 205, 33.5); // Row 3 line
    doc.line(110, 39, 205, 39);     // Row 4 line
    doc.line(110, 44.5, 205, 44.5); // Row 5 line
    doc.line(155, 17, 155, 28);     // Column split line for Row 1 & 2

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 112, 21);
    doc.text(`Invoice date: ${invoice.issue_date}`, 157, 21);

    doc.text("P.O #:", 112, 26.5);
    doc.text(`P.O date: ${invoice.due_date || ""}`, 157, 26.5);

    doc.text("Reference:", 112, 32);
    doc.text("E-Way bill:", 112, 37.5);
    doc.text("Transport:", 112, 43);
    doc.text("Notes/Terms:", 112, 48.5);

    // 5. Grid Box Row 2: Customer Details (Bill To)
    doc.rect(5, 50, 200, 24);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`Bill To: ${invoice.customers.name.toUpperCase()}`, 7, 54);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    const splitCustAddress = doc.splitTextToSize(invoice.customers.address || "No Address Provided", 195);
    doc.text(splitCustAddress, 7, 58);

    const placeOfSupply = invoice.customers.gst_number
      ? `${invoice.customers.gst_number.substring(0, 2)}-State`
      : "Local";

    doc.text(`Contact Name: ${invoice.customers.name}  PH: ${invoice.customers.phone || "N/A"}`, 7, 66);
    doc.text(`State code/Place of supply: ${placeOfSupply}`, 7, 69.5);
    doc.setFont("Helvetica", "bold");
    doc.text(`GSTIN: ${invoice.customers.gst_number || "N/A"}`, 7, 73);

    // 6. Items Grid Table — compact headers, no horizontal lines on empty rows
    const tableHeaders = [[
      { content: "#", styles: { halign: "center" as const } },
      { content: "Item Description" },
      { content: "HSN/SAC", styles: { halign: "center" as const } },
      { content: "GST%", styles: { halign: "center" as const } },
      { content: "Qty", styles: { halign: "center" as const } },
      { content: "Rate", styles: { halign: "right" as const } },
      { content: "Per", styles: { halign: "center" as const } },
      { content: "Amount", styles: { halign: "right" as const } },
    ]];
    const tableRows: any[] = [];

    let totalQty = 0;
    invoice.items.forEach((item, idx) => {
      totalQty += item.quantity;
      tableRows.push([
        { content: (idx + 1).toString(), styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: `${item.name}${item.description ? "\n" + item.description : ""}`, styles: { fontStyle: "bold" as const } },
        { content: item.hsn_sac || "9988", styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: `${item.gst_rate}%`, styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: item.quantity.toString(), styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: formatCurrency(item.unit_price), styles: { halign: "right" as const, fontStyle: "bold" as const } },
        { content: "NOS", styles: { halign: "center" as const, fontStyle: "bold" as const } },
        { content: formatCurrency(item.total), styles: { halign: "right" as const, fontStyle: "bold" as const } },
      ]);
    });

    // Pad to at least 5 rows — empty rows show ONLY vertical lines (no horizontal lines)
    const minRows = 5;
    const emptyRowStyle = {
      lineWidth: { top: 0, right: 0.3, bottom: 0, left: 0.3 },
      minCellHeight: 7,
      cellPadding: 1
    } as any;
    for (let i = tableRows.length; i < minRows; i++) {
      tableRows.push([
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
        { content: "", styles: emptyRowStyle },
      ]);
    }

    // Footer total row
    tableRows.push([
      { content: "" },
      { content: "Total:", styles: { fontStyle: "bold" as const } },
      { content: "" }, { content: "" },
      { content: totalQty.toString(), styles: { halign: "center" as const, fontStyle: "bold" as const } },
      { content: "" }, { content: "" }, { content: "" },
    ]);

    let tableEndY = 74;

    autoTable(doc, {
      startY: tableEndY,
      head: tableHeaders,
      body: tableRows,
      theme: "grid",
      margin: { left: 5, right: 5 },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 7.5,
        fontStyle: "bold",
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      },
      bodyStyles: {
        fontSize: 7.5,
        fontStyle: "bold",
        textColor: [0, 0, 0],
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
        minCellHeight: 8,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 76 },
        2: { cellWidth: 18 },
        3: { cellWidth: 13 },
        4: { cellWidth: 12 },
        5: { cellWidth: 28 },
        6: { cellWidth: 13 },
        7: { cellWidth: 32 },
      },
      styles: { valign: "middle", overflow: "linebreak" },
      didDrawPage: (data) => { tableEndY = data.cursor?.y || tableEndY; }
    });

    // 7. GST Calculation Splits (CGST, SGST, IGST)
    const isIntraState = !invoice.customers.gst_number || !invoice.organizations.gst_number ||
      invoice.customers.gst_number.substring(0, 2) === invoice.organizations.gst_number.substring(0, 2);

    const taxGroup: Record<number, { taxable: number; gstAmt: number }> = {};
    invoice.items.forEach((item) => {
      if (!taxGroup[item.gst_rate]) taxGroup[item.gst_rate] = { taxable: 0, gstAmt: 0 };
      taxGroup[item.gst_rate].taxable += item.quantity * item.unit_price;
      taxGroup[item.gst_rate].gstAmt += item.gst_amount;
    });

    const firstGstRate = parseFloat(Object.keys(taxGroup)[0]) || 18;
    const targetGroup = taxGroup[firstGstRate] || { taxable: 0, gstAmt: 0 };
    const cgstRate = isIntraState ? firstGstRate / 2 : 0;
    const cgstAmt = isIntraState ? targetGroup.gstAmt / 2 : 0;
    const sgstRate = isIntraState ? firstGstRate / 2 : 0;
    const sgstAmt = isIntraState ? targetGroup.gstAmt / 2 : 0;
    const igstRate = isIntraState ? 0 : firstGstRate;
    const igstAmt = isIntraState ? 0 : targetGroup.gstAmt;
    const roundOff = Math.round(invoice.total_amount) - invoice.total_amount;

    // ── GST Split Box — 5 cols in 130mm, height 24mm ──────────────────
    const gstBoxH = 24;
    doc.setLineWidth(0.6); // Bold borders for the main section
    doc.rect(5, tableEndY, 130, gstBoxH);
    doc.line(5, tableEndY + 7, 135, tableEndY + 7);

    // Columns: Rate(20) | Taxable(35) | SGST(25) | CGST(25) | IGST(25)
    const gDivX = [25, 60, 85, 110];
    gDivX.forEach((cx) => doc.line(cx, tableEndY, cx, tableEndY + gstBoxH));

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.text("GST Rate", 7, tableEndY + 5);
    doc.text("Taxable", 27, tableEndY + 5);
    doc.text("SGST", 62, tableEndY + 5);
    doc.text("CGST", 87, tableEndY + 5);
    doc.text("IGST", 112, tableEndY + 5);

    // Row 1 — rate %
    doc.setFontSize(7.5);
    doc.text(`${firstGstRate}%`, 7, tableEndY + 13);
    doc.text(`Rs. ${formatCurrency(targetGroup.taxable)}`, 27, tableEndY + 13, { align: "left" });
    doc.text(`${sgstRate}%`, 62, tableEndY + 13);
    doc.text(`${cgstRate}%`, 87, tableEndY + 13);
    doc.text(`${igstRate}%`, 112, tableEndY + 13);

    // Row 2 — amounts
    doc.setFontSize(7);
    doc.text(`Rs. ${formatCurrency(sgstAmt)}`, 62, tableEndY + 21);
    doc.text(`Rs. ${formatCurrency(cgstAmt)}`, 87, tableEndY + 21);
    doc.text(`Rs. ${formatCurrency(igstAmt)}`, 112, tableEndY + 21);

    // ── Right Totals Box: label(28mm) + value(42mm) = 70mm ───────────────────
    const rowH = gstBoxH / 5;
    doc.rect(135, tableEndY, 70, gstBoxH);
    [1, 2, 3, 4].forEach((i) => doc.line(135, tableEndY + rowH * i, 205, tableEndY + rowH * i));
    doc.line(163, tableEndY, 163, tableEndY + gstBoxH);

    // Reset line width for everything else below
    doc.setLineWidth(0.3);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    const lX = 137; // label x
    const vX = 203; // value right-align x

    doc.text("Total Taxable Val:", lX, tableEndY + rowH * 0.72);
    doc.text(`Rs. ${formatCurrency(invoice.subtotal)}`, vX, tableEndY + rowH * 0.72, { align: "right" });
    doc.text(`GST @ ${firstGstRate}%:`, lX, tableEndY + rowH * 1.72);
    doc.text(`Rs. ${formatCurrency(invoice.gst_amount)}`, vX, tableEndY + rowH * 1.72, { align: "right" });
    doc.text("TOTAL GST:", lX, tableEndY + rowH * 2.72);
    doc.text(`Rs. ${formatCurrency(invoice.gst_amount)}`, vX, tableEndY + rowH * 2.72, { align: "right" });
    doc.text("Round off:", lX, tableEndY + rowH * 3.72);
    doc.text(`Rs. ${formatCurrency(roundOff)}`, vX, tableEndY + rowH * 3.72, { align: "right" });
    doc.setFontSize(7);
    doc.text("GRAND TOTAL", lX, tableEndY + rowH * 4.72);
    doc.text(`Rs. ${formatCurrency(grandTotal)}`, vX, tableEndY + rowH * 4.72, { align: "right" });

    // 8. Amount in Words Box
    tableEndY += gstBoxH;
    doc.rect(5, tableEndY, 200, 10);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Amount chargeable (in words):", 7, tableEndY + 4);
    doc.text(numberToWords(grandTotal), 7, tableEndY + 8.5);
    doc.setFontSize(7);
    doc.text("E. & O.E", 203, tableEndY + 4, { align: "right" });

    // 9. HSN/SAC Summary table
    tableEndY += 10;
    const hsnHeaders = [["HSN/SAC", "Taxable Value", "CGST Rate", "CGST Tax", "SGST Rate", "SGST Tax", "IGST Rate", "IGST Tax", "Total Tax"]];
    const hsnRows: any[] = [];

    invoice.items.forEach((item) => {
      const splitCgstRate = isIntraState ? item.gst_rate / 2 : 0;
      const splitCgstTax = isIntraState ? item.gst_amount / 2 : 0;
      const splitSgstRate = isIntraState ? item.gst_rate / 2 : 0;
      const splitSgstTax = isIntraState ? item.gst_amount / 2 : 0;
      const splitIgstRate = isIntraState ? 0 : item.gst_rate;
      const splitIgstTax = isIntraState ? 0 : item.gst_amount;
      hsnRows.push([
        item.hsn_sac || "9988",
        (item.quantity * item.unit_price).toFixed(2),
        `${splitCgstRate}%`, splitCgstTax.toFixed(2),
        `${splitSgstRate}%`, splitSgstTax.toFixed(2),
        `${splitIgstRate}%`, splitIgstTax.toFixed(2),
        item.gst_amount.toFixed(2)
      ]);
    });

    hsnRows.push([
      "TOTAL", invoice.subtotal.toFixed(2), "",
      (isIntraState ? invoice.gst_amount / 2 : 0).toFixed(2), "",
      (isIntraState ? invoice.gst_amount / 2 : 0).toFixed(2), "",
      (isIntraState ? 0 : invoice.gst_amount).toFixed(2),
      invoice.gst_amount.toFixed(2)
    ]);

    autoTable(doc, {
      startY: tableEndY,
      head: hsnHeaders,
      body: hsnRows,
      theme: "grid",
      margin: { left: 5, right: 5 },
      headStyles: {
        fillColor: [255, 255, 255], textColor: [0, 0, 0],
        fontSize: 7, fontStyle: "bold",
        lineWidth: 0.3, lineColor: [0, 0, 0],
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
      },
      bodyStyles: {
        fontSize: 7, fontStyle: "bold", textColor: [0, 0, 0],
        lineWidth: 0.3, lineColor: [0, 0, 0],
        cellPadding: { top: 2.5, right: 2, bottom: 2.5, left: 2 },
      },
      styles: { valign: "middle", halign: "center" },
      didDrawPage: (data) => { tableEndY = data.cursor?.y || tableEndY; }
    });

    // 10. Bank / Terms / QR Section
    const detailBoxH = 46;
    doc.rect(5, tableEndY, 125, detailBoxH); // Terms left
    doc.rect(130, tableEndY, 75, detailBoxH); // Bank + QR right

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Terms & Conditions:", 7, tableEndY + 6);
    doc.setFontSize(7);

    // Use the tagline field from database for dynamic terms (defaults to empty string if undefined)
    const termsText = invoice.organizations.tagline?.trim() ||
      "1. Our responsibility ceases as soon as goods leave our premises.\n2. Goods once sold cannot be taken back or exchanged.\n3. Interest @24% p.a. charged if not paid as per bill terms.\n4. All disputes subject to Bangalore Jurisdiction.";

    const splitTerms = doc.splitTextToSize(termsText, 120);
    // Draw each line of terms
    let termY = tableEndY + 12;
    splitTerms.forEach((line: string) => {
      doc.text(line, 7, termY);
      termY += 4;
    });

    doc.setFontSize(7);
    doc.text(`Company PAN: ${invoice.organizations.pan_number || "N/A"}`, 132, tableEndY + 6);
    doc.text(`A/c Name:    ${invoice.organizations.name}`, 132, tableEndY + 12);
    doc.text(`Bank Name:   ${invoice.organizations.bank_name || "N/A"}`, 132, tableEndY + 18);
    doc.text(`A/c No.:     ${invoice.organizations.account_number || "N/A"}`, 132, tableEndY + 24);
    doc.text(`Branch:      ${invoice.organizations.branch_name || "N/A"}`, 132, tableEndY + 30);
    doc.text(`IFSC:        ${invoice.organizations.ifsc_code || "N/A"}`, 132, tableEndY + 36);

    if (qrBase64) {
      try {
        doc.addImage(qrBase64, "PNG", 177, tableEndY + 3, 25, 25);
        doc.setFontSize(5.5);
        doc.text(upiId ? "SCAN TO PAY (UPI)" : "PAYMENT QR", 189.5, tableEndY + 30, { align: "center" });
      } catch (e) { console.error("Error drawing QR:", e); }
    }

    // 11. Signature row — always at the bottom of the page
    const signatureH = 24;
    const signatureY = Math.max(tableEndY + detailBoxH + 2, pageHeight - 5 - signatureH - 2);

    doc.rect(5, signatureY, 95, signatureH); // customer
    doc.rect(100, signatureY, 105, signatureH); // authorized

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Customer's Seal & Signature:", 7, signatureY + 6);
    doc.text(`For ${invoice.organizations.name.toUpperCase()}`, 102, signatureY + 6);
    doc.text("Authorized Signatory", 152, signatureY + signatureH - 5, { align: "center" });
  }

  doc.save(`Invoice_${invoice.invoice_number}.pdf`);
}


