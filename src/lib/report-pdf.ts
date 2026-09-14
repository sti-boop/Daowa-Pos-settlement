/**
 * Text-based PDF export for accounting reports using jsPDF.
 * Produces crisp vector text and small file sizes (~10-50KB vs 5.8MB rasterized).
 */

interface PdfColumn {
  header: string;
  width: number; // relative weight for column width distribution
  align?: 'left' | 'right';
}

interface PdfTableData {
  columns: PdfColumn[];
  rows: string[][];
  /** Optional summary rows rendered bold at the end */
  totalRows?: string[][];
}

interface ReportPdfOptions {
  title: string;
  company?: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logo?: string | null;
  } | null;
  periodLabel?: string;
  tables: PdfTableData[];
  /** Optional free-text summary blocks rendered after tables (label, value) pairs */
  summaryBlocks?: { label: string; value: string }[];
  /** Optional footer note */
  note?: string;
}

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Load an image URL and convert to data URL for jsPDF embedding; downscaled to max 256px to keep PDFs small. Returns null on failure. */
async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
    if (!loaded) return null;
    // Downscale to max 256px on the longest edge — plenty for a header logo
    const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
  } catch {
    return null;
  }
}

export async function exportReportPdf(
  options: ReportPdfOptions,
  filename: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 16) {
        pdf.addPage();
        y = margin;
      }
    };

    // ===== Header =====
    // Company logo top-left (when available and loadable)
    if (options.company?.logo) {
      const logo = await loadImageAsDataUrl(options.company.logo);
      if (logo) {
        const logoH = 16;
        const logoW = Math.min((logo.width / logo.height) * logoH, 40);
        try {
          pdf.addImage(logo.dataUrl, 'PNG', margin, y - 2, logoW, logoH);
        } catch {
          // Unsupported image format — skip logo silently
        }
      }
    }
    if (options.company?.name) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(options.company.name, pageWidth / 2, y, { align: 'center' });
      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(90);
      if (options.company.address) {
        pdf.text(options.company.address, pageWidth / 2, y, { align: 'center', maxWidth: contentWidth });
        y += 4;
      }
      if (options.company.phone) {
        pdf.text(options.company.phone, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      y += 2;
      pdf.setTextColor(0);
    }

    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(options.title, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Period
    if (options.periodLabel) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80);
      pdf.text(options.periodLabel, pageWidth / 2, y, { align: 'center' });
      y += 4;
      pdf.setTextColor(0);
    }
    y += 2;

    // ===== Tables =====
    for (const table of options.tables) {
      ensureSpace(12);

      const totalWeight = table.columns.reduce((s, c) => s + c.width, 0);
      const colWidths = table.columns.map(c => (c.width / totalWeight) * contentWidth);
      const colX = (col: number) => {
        let x = margin;
        for (let i = 0; i < col; i++) x += colWidths[i];
        return x;
      };

      // Header row
      pdf.setFillColor(243, 244, 246);
      pdf.rect(margin, y - 3.5, contentWidth, 6, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      table.columns.forEach((c, i) => {
        const x = c.align === 'right' ? colX(i) + colWidths[i] - 1.5 : colX(i) + 1.5;
        pdf.text(c.header, x, y, { align: c.align === 'right' ? 'right' : 'left' });
      });
      y += 6;
      pdf.setFont('helvetica', 'normal');

      const drawRow = (row: string[], bold = false, shade = false) => {
        const lineCount = Math.max(...row.map((cell, i) =>
          pdf.splitTextToSize(cell || '', colWidths[i] - 3).length
        ), 1);
        const rowHeight = 4.4 * lineCount + 1.6;

        ensureSpace(rowHeight + 2);
        if (shade) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, y - 3.2, contentWidth, rowHeight, 'F');
        }
        if (bold) pdf.setFont('helvetica', 'bold');

        row.forEach((cell, i) => {
          const col = table.columns[i];
          const lines = pdf.splitTextToSize(cell || '', colWidths[i] - 3);
          const x = col.align === 'right' ? colX(i) + colWidths[i] - 1.5 : colX(i) + 1.5;
          pdf.text(lines, x, y, { align: col.align === 'right' ? 'right' : 'left' });
        });
        y += rowHeight;
        pdf.setFont('helvetica', 'normal');

        // Row separator line
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.1);
        pdf.line(margin, y - 2.6, margin + contentWidth, y - 2.6);
      };

      const allRows = [...table.rows, ...(table.totalRows ?? [])];
      const totalRowCount = table.rows.length;
      allRows.forEach((row, idx) => {
        const isTotal = idx >= totalRowCount;
        drawRow(row, isTotal, !isTotal && idx % 2 === 1);
      });

      y += 4;
    }

    // ===== Summary blocks =====
    if (options.summaryBlocks?.length) {
      ensureSpace(options.summaryBlocks.length * 6 + 4);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      for (const item of options.summaryBlocks) {
        ensureSpace(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text(item.label, margin, y);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.value, pageWidth - margin, y, { align: 'right' });
        y += 5.5;
        pdf.setFont('helvetica', 'normal');
      }
      y += 3;
    }

    // ===== Note =====
    if (options.note) {
      ensureSpace(10);
      pdf.setFontSize(7.5);
      pdf.setTextColor(110);
      const lines = pdf.splitTextToSize(options.note, contentWidth);
      pdf.text(lines, margin, y);
      pdf.setTextColor(0);
    }

    // ===== Page numbers =====
    const pageCount = pdf.getNumberOfPages();
    pdf.setFontSize(7.5);
    pdf.setTextColor(130);
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      pdf.text(
        `Generated ${new Date().toLocaleString('en-GB')} · Daowa Healthcare Accounting`,
        margin,
        pageHeight - 8,
      );
    }
    pdf.setTextColor(0);

    pdf.save(filename);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'PDF export failed' };
  }
}

/** Build PdfTableData from the raw report JSON per report type */
export function buildTablesForReport(report: string, data: Record<string, unknown>): { tables: PdfTableData[]; summaryBlocks?: { label: string; value: string }[]; periodLabel?: string; note?: string } {
  switch (report) {
    case 'trial-balance': {
      const rows = (data.rows as { ledgerName: string; groupName: string; nature: string; debit: number; credit: number }[]) ?? [];
      return {
        tables: [{
          columns: [
            { header: 'Ledger', width: 3 },
            { header: 'Group', width: 2.5 },
            { header: 'Nature', width: 1.2 },
            { header: 'Debit (BDT)', width: 1.5, align: 'right' },
            { header: 'Credit (BDT)', width: 1.5, align: 'right' },
          ],
          rows: rows.map(r => [r.ledgerName, r.groupName, r.nature, r.debit ? fmt(r.debit) : '-', r.credit ? fmt(r.credit) : '-']),
          totalRows: [[
            'Total', '', '',
            fmt((data.totalDebit as number) ?? 0),
            fmt((data.totalCredit as number) ?? 0),
          ]],
        }],
      };
    }
    case 'pnl': {
      const income = (data.income as { group: string; amount: number }[]) ?? [];
      const expense = (data.expense as { group: string; amount: number }[]) ?? [];
      return {
        tables: [
          {
            columns: [{ header: 'Income Account', width: 4 }, { header: 'Amount (BDT)', width: 1.6, align: 'right' }],
            rows: income.map(r => [r.group, fmt(r.amount)]),
            totalRows: [['Total Income', fmt((data.totalIncome as number) ?? 0)]],
          },
          {
            columns: [{ header: 'Expense Account', width: 4 }, { header: 'Amount (BDT)', width: 1.6, align: 'right' }],
            rows: expense.map(r => [r.group, fmt(r.amount)]),
            totalRows: [['Total Expense', fmt((data.totalExpense as number) ?? 0)]],
          },
        ],
        summaryBlocks: [
          { label: 'Net Profit / (Loss)', value: fmt((data.netProfit as number) ?? 0) },
        ],
      };
    }
    case 'balance-sheet': {
      const assets = (data.assets as { group: string; amount: number; subRows?: { group: string; amount: number }[] }[]) ?? [];
      const liabilities = (data.liabilities as { group: string; amount: number; subRows?: { group: string; amount: number }[] }[]) ?? [];
      const flatten = (list: typeof assets) => list.flatMap(r => [
        [r.group, fmt(r.amount)],
        ...(r.subRows ?? []).map(s => [`   ${s.group}`, fmt(s.amount)]),
      ]);
      const diff = (data.difference as number) ?? 0;
      return {
        tables: [
          {
            columns: [{ header: 'Assets', width: 4 }, { header: 'Amount (BDT)', width: 1.6, align: 'right' }],
            rows: flatten(assets),
            totalRows: [['Total Assets', fmt((data.totalAssets as number) ?? 0)]],
          },
          {
            columns: [{ header: 'Liabilities & Equity', width: 4 }, { header: 'Amount (BDT)', width: 1.6, align: 'right' }],
            rows: flatten(liabilities),
            totalRows: [['Total Liabilities & Equity', fmt((data.totalLiabilities as number) ?? 0)]],
          },
        ],
        summaryBlocks: [
          { label: 'Difference (Assets − Liabilities)', value: fmt(diff) },
        ],
        note: diff > 0 ? 'Note: Assets exceed Liabilities & Equity. This is expected when ledger opening balances are only partially entered — complete opening entries on both sides to balance the sheet.' : undefined,
      };
    }
    case 'day-book': {
      const rows = (data.rows as { date: string; voucherType: string; voucherNumber: string; narration: string | null; debitTotal: number; creditTotal: number; entries: { ledgerName: string; debit: number; credit: number }[] }[]) ?? [];
      return {
        tables: [{
          columns: [
            { header: 'Date', width: 1.1 },
            { header: 'Type', width: 1 },
            { header: 'Voucher No', width: 1.3 },
            { header: 'Particulars', width: 3.2 },
            { header: 'Debit (BDT)', width: 1.3, align: 'right' },
            { header: 'Credit (BDT)', width: 1.3, align: 'right' },
          ],
          rows: rows.map(r => [
            r.date,
            r.voucherType,
            r.voucherNumber,
            r.entries.map(e => `${e.ledgerName}${e.debit > 0 ? ' (Dr)' : ' (Cr)'}`).join(', '),
            fmt(r.debitTotal),
            fmt(r.creditTotal),
          ]),
          totalRows: [['', '', '', 'Total', fmt((data.totalDebit as number) ?? 0), fmt((data.totalCredit as number) ?? 0)]],
        }],
      };
    }
    case 'ledger-report': {
      const ledger = data.ledger as { name: string; group: string } | undefined;
      const entries = (data.entries as { date: string; voucherType?: string; narration?: string | null; voucherNumber?: string; debit: number; credit: number; balance?: number; balanceType?: string }[]) ?? [];
      return {
        tables: [{
          columns: [
            { header: 'Date', width: 1.1 },
            { header: 'Particulars', width: 2.6 },
            { header: 'Voucher', width: 1.2 },
            { header: 'Debit (BDT)', width: 1.2, align: 'right' },
            { header: 'Credit (BDT)', width: 1.2, align: 'right' },
            { header: 'Balance', width: 1.4, align: 'right' },
          ],
          rows: entries.map(e => [
            e.date ?? '',
            [e.voucherType, e.narration].filter(Boolean).join(' — ') || '-',
            e.voucherNumber ?? '',
            e.debit ? fmt(e.debit) : '-',
            e.credit ? fmt(e.credit) : '-',
            e.balance !== undefined && e.balance !== null ? `${fmt(e.balance)} ${e.balanceType ?? ''}`.trim() : '-',
          ]),
          totalRows: [['', 'Total', '', fmt((data.totalDebit as number) ?? 0), fmt((data.totalCredit as number) ?? 0), '']],
        }],
        summaryBlocks: [
          { label: `Opening Balance (${data.openingType ?? 'Dr'})`, value: fmt((data.openingBalance as number) ?? 0) },
          { label: `Closing Balance (${data.closingType ?? 'Dr'})`, value: fmt((data.closingBalance as number) ?? 0) },
        ],
        periodLabel: ledger ? `${ledger.name} — ${ledger.group}` : undefined,
      };
    }
    case 'sales-register':
    case 'purchase-register': {
      const rows = (data.rows as { date: string; voucherNumber: string; party: string; amount: number; tax: number; items: { name: string }[] }[]) ?? [];
      const isSales = report === 'sales-register';
      return {
        tables: [{
          columns: [
            { header: 'Date', width: 1.1 },
            { header: 'Voucher No', width: 1.3 },
            { header: isSales ? 'Customer' : 'Supplier', width: 2.6 },
            { header: 'Items', width: 2.2 },
            { header: 'Amount (BDT)', width: 1.4, align: 'right' },
            { header: 'VAT (BDT)', width: 1.2, align: 'right' },
          ],
          rows: rows.map(r => [
            r.date,
            r.voucherNumber,
            r.party || '-',
            r.items.map(i => i.name).join(', ') || '-',
            fmt(r.amount),
            r.tax ? fmt(r.tax) : '-',
          ]),
          totalRows: [['', '', '', 'Total', fmt((data.total as number) ?? 0), fmt((data.totalTax as number) ?? 0)]],
        }],
      };
    }
    case 'stock-summary': {
      const rows = (data.rows as { name: string; group: string; unit: string; openingQty: number; inwardQty: number; outwardQty: number; closingQty: number; closingValue: number; isLow: boolean }[]) ?? [];
      return {
        tables: [{
          columns: [
            { header: 'Item', width: 3 },
            { header: 'Group', width: 1.8 },
            { header: 'Unit', width: 0.8 },
            { header: 'In', width: 0.8, align: 'right' },
            { header: 'Out', width: 0.8, align: 'right' },
            { header: 'Closing', width: 0.9, align: 'right' },
            { header: 'Value (BDT)', width: 1.3, align: 'right' },
          ],
          rows: rows.map(r => [
            r.isLow ? `${r.name} [LOW]` : r.name,
            r.group,
            r.unit,
            r.inwardQty ? String(r.inwardQty) : '-',
            r.outwardQty ? String(r.outwardQty) : '-',
            String(r.closingQty),
            fmt(r.closingValue),
          ]),
          totalRows: [['Total Stock Value', '', '', '', '', '', fmt((data.totalValue as number) ?? 0)]],
        }],
        summaryBlocks: [
          { label: 'Total Items', value: String((data.totalItems as number) ?? 0) },
          { label: 'Low Stock Items', value: String((data.lowStockCount as number) ?? 0) },
        ],
      };
    }
    case 'vat-report': {
      return {
        tables: [],
        summaryBlocks: [
          { label: 'Output VAT (sales)', value: fmt((data.outputVAT as number) ?? 0) },
          { label: 'Input VAT (purchases)', value: fmt((data.inputVAT as number) ?? 0) },
          { label: 'Net VAT Payable', value: fmt((data.netPayable as number) ?? 0) },
          { label: 'Net VAT Refund', value: fmt((data.netRefund as number) ?? 0) },
        ],
      };
    }
    default:
      return { tables: [] };
  }
}

export { fmt as pdfFormatNumber };
