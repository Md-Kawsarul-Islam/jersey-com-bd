/**
 * A4 PDF receipt generator (jsPDF).
 * Produces a clean, printable, black-on-white invoice with the store logo,
 * order details, itemised table, totals and payment info.
 * Downloaded as Receipt-<OrderID>.pdf
 */
import logoUrl from '../assets/logo-receipt.png';

const RED = '#ed1b34';
const INK = '#111111';
const GREY = '#666666';
const LIGHT_LINE = '#e4e4e4';
const ZEBRA = '#fafafa';
const TINT = '#fff5f5'; // light red tint for the amount-in-words box

const money = (n) => `Tk ${Number(n || 0).toLocaleString('en-IN')}`;

/* ---------- number to words (Indian numbering: lakh / crore) ---------- */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigit(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}
function chunk(n) {
  // 0..999
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = '';
  if (h) out += `${ONES[h]} Hundred`;
  if (rest) out += (out ? ' ' : '') + twoDigit(rest);
  return out;
}
export function numberToWords(num) {
  num = Math.floor(Math.abs(Number(num) || 0));
  if (num === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  if (crore) parts.push(`${chunk(crore)} Crore`);
  if (lakh) parts.push(`${chunk(lakh)} Lakh`);
  if (thousand) parts.push(`${chunk(thousand)} Thousand`);
  if (rest) parts.push(chunk(rest));
  return parts.join(' ');
}

const asyncUrlToDataUrl = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const paymentLabel = (p) => ({
  cod: 'Cash on Delivery',
  bkash: 'bKash (Manual)',
  nagad: 'Nagad (Manual)',
}[String(p || '').toLowerCase()] || String(p || '').toUpperCase());

const paymentStatusLabel = (p) => ({
  cod: 'Pending — due on delivery',
  bkash: 'Transaction ID received — awaiting verification',
  nagad: 'Transaction ID received — awaiting verification',
}[String(p || '').toLowerCase()] || 'Unknown');

/**
 * @param {object} order   order object stored in the DB (id, items, customer, totals, …)
 * @param {object} opts    { catalogBySlug?: Mapslug → product (fallback originalPrice) }
 */
export async function generateReceiptPdf(order, opts = {}) {
  const catalogLookup = (slug) => {
    if (opts.catalogBySlug) {
      const hit = opts.catalogBySlug[slug];
      if (hit && hit.originalPrice) return hit.originalPrice;
    }
    return null;
  };

  // ---- compute discount from items (works for legacy orders too) ----
  let discount = 0;
  let originalTotal = 0;
  for (const item of order.items) {
    const orig = (item.originalPrice ?? catalogLookup(item.slug)) || item.price;
    originalTotal += orig * item.qty;
    if (orig > item.price) discount += (orig - item.price) * item.qty;
  }
  const totalQty = order.items.reduce((n, i) => n + i.qty, 0);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });

  const PW = doc.internal.pageSize.getWidth();   // 595.28
  const PH = doc.internal.pageSize.getHeight();  // 841.89
  const M = 42;
  const CW = PW - M * 2;

  const logoDataUrl = await asyncUrlToDataUrl(logoUrl);

  let y = 0;

  const line = (x1, y1, x2, y2, color = LIGHT_LINE, width = 0.75) => {
    doc.setDrawColor(color);
    doc.setLineWidth(width);
    doc.line(x1, y1, x2, y2);
  };
  const text = (t, x, yy, size, style = 'normal', color = INK, align = 'left') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.text(String(t), x, yy, { align });
  };
  const roundRect = (x, yy, w, h, r, fill) => {
    if (fill) { doc.setFillColor(fill); doc.roundedRect(x, yy, w, h, r, r, 'F'); }
    else { doc.setDrawColor(LIGHT_LINE); doc.roundedRect(x, yy, w, h, r, r, 'S'); }
  };

  const ensureSpace = (needed) => {
    if (y + needed > PH - 70) {
      drawPageFooter();
      doc.addPage();
      y = 56;
    }
  };

  const drawPageFooter = () => {
    // thin divider
    line(M, PH - 42, PW - M, PH - 42, LIGHT_LINE, 0.75);
    text('Thank you for shopping with Jersey.com.bd!', PW / 2, PH - 30, 9, 'bold', INK, 'center');
    text('Chashara, Narayanganj Sadar-1400 · Bangladesh · +880 1989 454 658 · www.jersey.com.bd', PW / 2, PH - 17, 6.8, 'normal', GREY, 'center');
    text(`Order ${order.id}`, M, PH - 17, 6.5, 'normal', GREY, 'left');
    text(`Generated ${new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}`, PW - M, PH - 17, 6.5, 'normal', GREY, 'right');
  };

  /* ============ HEADER ============ */
  // logo (keep aspect 609x110)
  const logoW = 150;
  const logoH = (logoW * 110) / 609;
  doc.addImage(logoDataUrl, 'PNG', M, 36, logoW, logoH);

  // right block — store identity
  const rx = PW - M;
  text('Jersey.com.bd', rx, 44, 15, 'bold', RED, 'right');
  text("Bangladesh's #1 Online Store for", rx, 58, 8, 'normal', GREY, 'right');
  text('Authentic Football & Cricket Jerseys', rx, 69, 8, 'normal', GREY, 'right');
  text('Chashara, Narayanganj Sadar-1400,', rx, 84, 7.5, 'normal', GREY, 'right');
  text('Narayanganj, Bangladesh', rx, 94, 7.5, 'normal', GREY, 'right');
  text('+880 1949 454 658  ·  support@jersey.com.bd', rx, 104, 7.5, 'normal', GREY, 'right');

  // brand divider: thick red + thin black
  line(M, 122, PW - M, 122, RED, 2.5);
  line(M, 125.5, PW - M, 125.5, INK, 0.75);

  /* ============ TITLE ROW ============ */
  y = 148;
  text('ORDER RECEIPT', M, y, 21, 'bold', INK);
  const status = String(order.status || 'pending').toUpperCase();
  // status pill (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const pillTextWidth = doc.getTextWidth(status) + 22;
  const pillTone = {
    PENDING: '#fff4e0|#b45309',
    CONFIRMED: '#eff6ff|#1d4ed8',
    PROCESSING: '#fff7ed|#c2410c',
    SHIPPED: '#f5f3ff|#6d28d9',
    DISPATCHED: '#f5f3ff|#6d28d9',
    DELIVERED: '#e8fbef|#15803d',
    CANCELLED: '#fdecec|#b91c1c',
    REFUNDED: '#f1f5f9|#475569',
  }[status] || '#f0f0f0|#333333';
  const [pillBg, pillFg] = pillTone.split('|');
  roundRect(PW - M - pillTextWidth, y - 12, pillTextWidth, 18, 9, pillBg);
  text(status, PW - M - pillTextWidth / 2, y + 0.5, 8, 'bold', pillFg, 'center');

  y = 168;
  text(`Order ID:  ${order.id}`, M, y, 9.5, 'bold', INK);
  text(`Placed:  ${new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`, M, y + 13, 9, 'normal', GREY);

  /* ============ INFO BOXES ============ */
  y = 196;
  const boxH = 92;
  const boxW = (CW - 14) / 2;

  // left box — order details
  roundRect(M, y, boxW, boxH, 6, '#fafafa');
  text('ORDER DETAILS', M + 12, y + 17, 7.5, 'bold', GREY);
  const leftRows = [
    ['Payment', paymentLabel(order.payment)],
    ['Pay status', paymentStatusLabel(order.payment)],
    ['Zone', order.zone === 'inside' ? 'Inside Dhaka' : 'Outside Dhaka'],
    ['Items', `${totalQty} item(s)`],
  ];
  leftRows.forEach(([k, v], i) => {
    text(k, M + 12, y + 33 + i * 15, 7.2, 'bold', GREY);
    text(v, M + 78, y + 33 + i * 15, 7.2, 'normal', INK);
  });

  // right box — bill to
  roundRect(M + boxW + 14, y, boxW, boxH, 6, '#fafafa');
  text('BILL TO / DELIVER TO', M + boxW + 26, y + 17, 7.5, 'bold', GREY);
  const bx = M + boxW + 26;
  text(order.customer?.name || '—', bx, y + 34, 10, 'bold', INK);
  text(`Phone:  ${order.customer?.phone || '—'}`, bx, y + 49, 8, 'normal', INK);
  const addr = doc.splitTextToSize(order.customer?.address || '—', boxW - 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(INK);
  doc.text(addr, bx, y + 63);

  y += boxH + 18;

  /* ============ ITEMS TABLE ============ */
  const cols = [
    { key: 'no', label: '#', w: 26, align: 'center' },
    { key: 'name', label: 'ITEM', w: 236, align: 'left' },
    { key: 'qty', label: 'QTY', w: 40, align: 'center' },
    { key: 'price', label: 'UNIT PRICE', w: 100, align: 'right' },
    { key: 'total', label: 'AMOUNT', w: CW - 26 - 236 - 40 - 100, align: 'right' },
  ];
  const xFor = (i) => M + cols.slice(0, i).reduce((s, c) => s + c.w, 0);

  const drawTableHeader = () => {
    doc.setFillColor(INK);
    doc.rect(M, y, CW, 22, 'F');
    cols.forEach((c, i) => {
      const x = c.align === 'left' ? xFor(i) + 8 : c.align === 'right' ? xFor(i) + c.w - 8 : xFor(i) + c.w / 2;
      text(c.label, x, y + 14.5, 7.5, 'bold', '#ffffff', c.align);
    });
    y += 22;
  };

  drawTableHeader();

  order.items.forEach((item, i) => {
    const nameLines = doc.splitTextToSize(item.name + (item.size ? `  (Size: ${item.size})` : ''), cols[1].w - 16);
    const rowH = Math.max(24, nameLines.length * 11 + 10);
    ensureSpace(rowH + 4);

    // zebra
    if (i % 2 === 0) {
      doc.setFillColor(ZEBRA);
      doc.rect(M, y, CW, rowH, 'F');
    }
    // row separators
    line(M, y + rowH, M + CW, y + rowH, LIGHT_LINE, 0.5);

    text(i + 1, xFor(0) + cols[0].w / 2, y + rowH / 2 + 3, 8, 'normal', GREY, 'center');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(INK);
    doc.text(nameLines, xFor(1) + 8, y + rowH / 2 - ((nameLines.length - 1) * 11) / 2 + 3);
    text(item.qty, xFor(2) + cols[2].w / 2, y + rowH / 2 + 3, 8.5, 'bold', INK, 'center');
    text(money(item.price), xFor(3) + cols[3].w - 8, y + rowH / 2 + 3, 8, 'normal', GREY, 'right');
    text(money(item.price * item.qty), xFor(4) + cols[4].w - 8, y + rowH / 2 + 3, 8.5, 'bold', INK, 'right');

    y += rowH;
  });

  y += 10;

  /* ============ BOTTOM: WORDS (left) + TOTALS (right) ============ */
  const totalsW = 218;
  const totalsX = PW - M - totalsW;
  const wordsW = CW - totalsW - 16;

  // amount in words box
  const wordsText = `${numberToWords(order.total)} Taka Only`;
  const wordsLines = doc.splitTextToSize(wordsText, wordsW - 28);
  const wordsH = Math.max(46, wordsLines.length * 12 + 26);
  const wordsBoxY = y;
  doc.setFillColor(TINT);
  doc.roundedRect(M, wordsBoxY, wordsW, wordsH, 6, 6, 'F');
  doc.setFillColor(RED);
  doc.rect(M, wordsBoxY + 8, 3, wordsH - 16, 'F'); // red accent bar
  text('AMOUNT IN WORDS', M + 12, wordsBoxY + 14, 6.5, 'bold', RED);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9);
  doc.setTextColor(INK);
  doc.text(wordsLines, M + 12, wordsBoxY + 27);

  // totals rows
  const row = (label, value, { bold = false, color = INK, size = 9.5 } = {}) => {
    text(label, totalsX, y + 10, size, bold ? 'bold' : 'normal', GREY);
    text(value, PW - M, y + 10, size, bold ? 'bold' : 'normal', color, 'right');
    line(totalsX, y + 15, PW - M, y + 15, LIGHT_LINE, 0.5);
    y += 20;
  };
  row('Subtotal', money(order.subtotal));
  if (discount > 0) row('Discount', `- ${money(discount)}`, { color: '#15803d' });
  row('Delivery charge', Number(order.delivery) === 0 ? 'FREE' : money(order.delivery), { color: Number(order.delivery) === 0 ? '#15803d' : INK });
  if (discount > 0) {
    row('You saved', money(discount), { color: '#15803d', size: 8 });
  }

  // grand total band
  const grandH = 30;
  roundRect(totalsX, y, totalsW, grandH, 6, INK);
  text('TOTAL', totalsX + 12, y + grandH / 2 + 4, 10, 'bold', '#ffffff');
  text(money(order.total), PW - M - 12, y + grandH / 2 + 4, 13, 'bold', '#ffffff', 'right');
  y += grandH + 8;

  y += Math.max(0, wordsBoxY + wordsH - y) + 6;

  /* ============ PAYMENT + FOOTER ============ */
  ensureSpace(60);
  const payY = y + 6;
  line(M, payY, PW - M, payY, LIGHT_LINE, 0.75);
  text('PAYMENT', M, payY + 16, 7, 'bold', GREY);
  text(`${paymentLabel(order.payment)}  ·  ${paymentStatusLabel(order.payment)}`, M, payY + 30, 9, 'bold', INK);
  if (order.payment !== 'cod' && order.note) {
    const noteLines = doc.splitTextToSize(`Note: ${order.note}`, CW);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(GREY);
    doc.text(noteLines, M, payY + 44);
  }

  // cancelled watermark
  if (String(order.status) === 'cancelled') {
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.16 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(88);
    doc.setTextColor('#b91c1c');
    doc.text('CANCELLED', PW / 2, PH / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  }

  /* ============ PAGE FOOTER ============ */
  drawPageFooter();

  /* ============ SAVE ============ */
  const filename = `Receipt-${order.id}.pdf`;
  doc.save(filename);
  return filename;
}
