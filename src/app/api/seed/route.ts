import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Production safety: only allow seeding when explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
      return NextResponse.json(
        { error: 'Seeding is disabled in production. Set ALLOW_SEED=true to enable.' },
        { status: 403 }
      );
    }

    // Clear existing data in a transaction (order matters for FK constraints)
    await db.$transaction([
      db.splitPayment.deleteMany(),
      db.settlementItem.deleteMany(),
      db.return.deleteMany(),
      db.journalEntry.deleteMany(),
      db.saleItem.deleteMany(),
      db.sale.deleteMany(),
      db.holdOrder.deleteMany(),
      db.shift.deleteMany(),
      db.settlement.deleteMany(),
      db.clearingAccount.deleteMany(),
      db.paymentProviderConfig.deleteMany(),
      db.product.deleteMany(),
      db.customer.deleteMany(),
    ]);

    // ── Seed Customers ──
    const customers = await Promise.all(
      [
        { name: 'Rahim Uddin', phone: '01711223344', email: 'rahim@email.com', address: 'Dhanmondi 27, Dhaka' },
        { name: 'Fatema Begum', phone: '01822334455', email: 'fatema@email.com', address: 'Mirpur 10, Dhaka' },
        { name: 'Karim Hossain', phone: '01933445566', address: 'Uttara Sector 7, Dhaka' },
        { name: 'Ayesha Siddika', phone: '01644556677', email: 'ayesha@email.com', address: 'Banani DOHS, Dhaka' },
        { name: 'Jamal Ahmed', phone: '01555667788', address: 'Mohammadpur, Dhaka' },
        { name: 'Nasreen Akter', phone: '01866778899', email: 'nasreen@email.com', address: 'Gulshan 2, Dhaka' },
        { name: 'Dr. Hasan Ali', phone: '01777889900', address: 'Bashundhara R/A, Dhaka' },
        { name: 'Salma Khatun', phone: '01988990011', address: 'Rampura, Dhaka' },
        { name: 'Mizanur Rahman', phone: '01322334411', address: 'Badda, Dhaka' },
        { name: 'Reshma Begum', phone: '01444556622', email: 'reshma@email.com', address: 'Mohakhali, Dhaka' },
        { name: 'Abdul Kader', phone: '01677788833', address: 'Tejgaon, Dhaka' },
        { name: 'Nusrat Jahan', phone: '01588899944', email: 'nusrat@email.com', address: 'Cantonment, Dhaka' },
        { name: 'Shahidul Islam', phone: '01722334455', address: 'Bashabo, Dhaka' },
        { name: 'Momena Begum', phone: '01833445566', email: 'momena@email.com', address: 'Khilgaon, Dhaka' },
        { name: 'Dr. Rafiq Ahmed', phone: '01944556677', address: 'Banani, Dhaka' },
        { name: 'Taslima Akter', phone: '01655667788', email: 'taslima@email.com', address: 'Uttara Sector 3, Dhaka' },
        { name: 'Habibur Rahman', phone: '01366778899', address: 'Malibagh, Dhaka' },
        { name: 'Farida Yasmin', phone: '01477889900', email: 'farida@email.com', address: 'Mohammadpur, Dhaka' },
        { name: 'Kamal Hossain', phone: '01788990011', address: 'Wari, Dhaka' },
        { name: 'Nasima Begum', phone: '01899001122', email: 'nasima@email.com', address: 'Banasree, Dhaka' },
      ].map((c) =>
        db.customer.create({
          data: { ...c, loyaltyPoints: Math.floor(Math.random() * 80) + 10 },
        })
      )
    );

    // ── Seed Products ──
    // Multiple products share the same generic name (different brands/strengths/forms)
    const productData: Array<{
      name: string; barcode: string; category: string; generic: string | null;
      unitPrice: number; costPrice: number; stock: number; unit: string;
      batchNo: string; expiryDate: string;
    }> = [

      // ═══ PARACETAMOL (6 products, same generic) ═══
      { name: 'Napa Extra 500mg', barcode: '8901001001', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 2.0, costPrice: 1.2, stock: 500, unit: 'pcs', batchNo: 'NAP-24-01', expiryDate: '2027-06-30' },
      { name: 'Ace 500mg', barcode: '8901001002', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 1.5, costPrice: 0.8, stock: 600, unit: 'pcs', batchNo: 'ACE-24-01', expiryDate: '2027-05-15' },
      { name: 'Paracip 500mg', barcode: '8901001003', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 1.8, costPrice: 1.0, stock: 400, unit: 'pcs', batchNo: 'PAR-24-01', expiryDate: '2027-07-20' },
      { name: 'Xcel Paracetamol 500mg', barcode: '8901001004', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 2.5, costPrice: 1.5, stock: 350, unit: 'pcs', batchNo: 'XCL-24-01', expiryDate: '2027-04-10' },
      { name: 'Napa Syrup 120ml (Pediatric)', barcode: '8901001005', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 60.0, costPrice: 40.0, stock: 80, unit: 'bottles', batchNo: 'NAPS-24-01', expiryDate: '2027-03-15' },
      { name: 'Fast Syrup 60ml (Kids)', barcode: '8901001006', category: 'Analgesic', generic: 'Paracetamol', unitPrice: 45.0, costPrice: 28.0, stock: 100, unit: 'bottles', batchNo: 'FST-24-01', expiryDate: '2027-08-25' },

      // ═══ OMEPRAZOLE (5 products, same generic) ═══
      { name: 'Seclo 20mg', barcode: '8901001010', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 8.0, costPrice: 5.0, stock: 300, unit: 'pcs', batchNo: 'SEC-24-01', expiryDate: '2027-02-28' },
      { name: 'Maxpro 20mg', barcode: '8901001011', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 10.0, costPrice: 6.5, stock: 250, unit: 'pcs', batchNo: 'MXP-24-01', expiryDate: '2027-03-15' },
      { name: 'Losec 20mg', barcode: '8901001012', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 15.0, costPrice: 10.0, stock: 120, unit: 'pcs', batchNo: 'LOS-24-01', expiryDate: '2027-01-20' },
      { name: 'Omez 20mg', barcode: '8901001013', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 7.5, costPrice: 4.5, stock: 280, unit: 'pcs', batchNo: 'OMZ-24-01', expiryDate: '2027-04-30' },
      { name: 'Seclo 40mg', barcode: '8901001014', category: 'Gastrointestinal', generic: 'Omeprazole', unitPrice: 14.0, costPrice: 9.0, stock: 150, unit: 'pcs', batchNo: 'SEC4-24-01', expiryDate: '2027-05-10' },

      // ═══ CIPROFLOXACIN (4 products, same generic) ═══
      { name: 'Ciprofloxacin 500mg (Beximco)', barcode: '8901001020', category: 'Antibiotic', generic: 'Ciprofloxacin', unitPrice: 12.0, costPrice: 8.0, stock: 150, unit: 'pcs', batchNo: 'CIP-24-01', expiryDate: '2026-09-20' },
      { name: 'Ciproxin 500mg', barcode: '8901001021', category: 'Antibiotic', generic: 'Ciprofloxacin', unitPrice: 18.0, costPrice: 12.0, stock: 100, unit: 'pcs', batchNo: 'CPX-24-01', expiryDate: '2026-11-15' },
      { name: 'Ciprobay 500mg', barcode: '8901001022', category: 'Antibiotic', generic: 'Ciprofloxacin', unitPrice: 25.0, costPrice: 17.0, stock: 80, unit: 'pcs', batchNo: 'CPB-24-01', expiryDate: '2027-01-10' },
      { name: 'Ciprofloxacin Eye Drop 5ml', barcode: '8901001023', category: 'Eye & Ear', generic: 'Ciprofloxacin', unitPrice: 40.0, costPrice: 28.0, stock: 70, unit: 'bottles', batchNo: 'CIPE-24-01', expiryDate: '2026-10-05' },

      // ═══ AMOXICILLIN (4 products, same generic) ═══
      { name: 'Amoxicillin 500mg Cap', barcode: '8901001030', category: 'Antibiotic', generic: 'Amoxicillin', unitPrice: 8.5, costPrice: 6.0, stock: 200, unit: 'pcs', batchNo: 'AMX-24-01', expiryDate: '2026-06-30' },
      { name: 'Amoxil 500mg Cap', barcode: '8901001031', category: 'Antibiotic', generic: 'Amoxicillin', unitPrice: 12.0, costPrice: 8.0, stock: 150, unit: 'pcs', batchNo: 'AMXL-24-01', expiryDate: '2026-08-15' },
      { name: 'Moxacil 250mg', barcode: '8901001032', category: 'Antibiotic', generic: 'Amoxicillin', unitPrice: 6.0, costPrice: 3.5, stock: 250, unit: 'pcs', batchNo: 'MXC-24-01', expiryDate: '2026-12-01' },
      { name: 'Amoxicillin Syrup 125mg/5ml', barcode: '8901001033', category: 'Antibiotic', generic: 'Amoxicillin', unitPrice: 85.0, costPrice: 55.0, stock: 60, unit: 'bottles', batchNo: 'AMXS-24-01', expiryDate: '2026-07-20' },

      // ═══ AZITHROMYCIN (3 products, same generic) ═══
      { name: 'Azithromycin 500mg', barcode: '8901001040', category: 'Antibiotic', generic: 'Azithromycin', unitPrice: 35.0, costPrice: 25.0, stock: 100, unit: 'pcs', batchNo: 'AZI-24-01', expiryDate: '2026-03-15' },
      { name: 'Zithromax 500mg', barcode: '8901001041', category: 'Antibiotic', generic: 'Azithromycin', unitPrice: 55.0, costPrice: 40.0, stock: 60, unit: 'pcs', batchNo: 'ZTH-24-01', expiryDate: '2026-05-20' },
      { name: 'Azee 500mg', barcode: '8901001042', category: 'Antibiotic', generic: 'Azithromycin', unitPrice: 30.0, costPrice: 20.0, stock: 120, unit: 'pcs', batchNo: 'AZE-24-01', expiryDate: '2026-09-10' },

      // ═══ CETIRIZINE (3 products, same generic) ═══
      { name: 'Cetirizine 10mg', barcode: '8901001050', category: 'Antihistamine', generic: 'Cetirizine', unitPrice: 3.0, costPrice: 1.5, stock: 350, unit: 'pcs', batchNo: 'CET-24-01', expiryDate: '2027-05-25' },
      { name: 'Alerid 10mg', barcode: '8901001051', category: 'Antihistamine', generic: 'Cetirizine', unitPrice: 5.0, costPrice: 3.0, stock: 200, unit: 'pcs', batchNo: 'ALR-24-01', expiryDate: '2027-04-15' },
      { name: 'Cetzine 10mg', barcode: '8901001052', category: 'Antihistamine', generic: 'Cetirizine', unitPrice: 4.0, costPrice: 2.5, stock: 250, unit: 'pcs', batchNo: 'CTZ-24-01', expiryDate: '2027-06-30' },

      // ═══ CIPROFLOXACIN EAR (1 more, same generic as above) ═══
      { name: 'Ciprofloxacin Ear Drop 5ml', barcode: '8901001060', category: 'Eye & Ear', generic: 'Ciprofloxacin', unitPrice: 35.0, costPrice: 22.0, stock: 60, unit: 'bottles', batchNo: 'CPEA-24-01', expiryDate: '2026-12-25' },

      // ═══ METRONIDAZOLE (3 products, same generic) ═══
      { name: 'Metronidazole 400mg', barcode: '8901001070', category: 'Antibiotic', generic: 'Metronidazole', unitPrice: 5.0, costPrice: 3.0, stock: 300, unit: 'pcs', batchNo: 'MET-24-01', expiryDate: '2027-01-15' },
      { name: 'Flagyl 400mg', barcode: '8901001071', category: 'Antibiotic', generic: 'Metronidazole', unitPrice: 8.0, costPrice: 5.5, stock: 150, unit: 'pcs', batchNo: 'FLG-24-01', expiryDate: '2027-02-28' },
      { name: 'Metronidazole Gel 0.75% 30g', barcode: '8901001072', category: 'Topical', generic: 'Metronidazole', unitPrice: 65.0, costPrice: 42.0, stock: 50, unit: 'tubes', batchNo: 'METG-24-01', expiryDate: '2027-06-10' },

      // ═══ AMLODIPINE (3 products, same generic) ═══
      { name: 'Amlodipine 5mg', barcode: '8901001080', category: 'Cardiovascular', generic: 'Amlodipine', unitPrice: 10.0, costPrice: 6.0, stock: 200, unit: 'pcs', batchNo: 'AML-24-01', expiryDate: '2027-03-20' },
      { name: 'Amlong 5mg', barcode: '8901001081', category: 'Cardiovascular', generic: 'Amlodipine', unitPrice: 8.0, costPrice: 5.0, stock: 180, unit: 'pcs', batchNo: 'AMLG-24-01', expiryDate: '2027-05-15' },
      { name: 'Norvasc 5mg', barcode: '8901001082', category: 'Cardiovascular', generic: 'Amlodipine', unitPrice: 22.0, costPrice: 15.0, stock: 80, unit: 'pcs', batchNo: 'NVS-24-01', expiryDate: '2027-04-01' },

      // ═══ METFORMIN (3 products, same generic) ═══
      { name: 'Metformin 500mg', barcode: '8901001090', category: 'Antidiabetic', generic: 'Metformin', unitPrice: 5.0, costPrice: 3.0, stock: 400, unit: 'pcs', batchNo: 'MFT-24-01', expiryDate: '2027-04-20' },
      { name: 'Glycomet 500mg', barcode: '8901001091', category: 'Antidiabetic', generic: 'Metformin', unitPrice: 4.0, costPrice: 2.5, stock: 350, unit: 'pcs', batchNo: 'GLY-24-01', expiryDate: '2027-06-30' },
      { name: 'Diabex 500mg', barcode: '8901001092', category: 'Antidiabetic', generic: 'Metformin', unitPrice: 6.0, costPrice: 3.5, stock: 250, unit: 'pcs', batchNo: 'DIA-24-01', expiryDate: '2027-03-10' },

      // ═══ CLOTRIMAZOLE (3 products, same generic) ═══
      { name: 'Clotrimazole Cream 15g', barcode: '8901001100', category: 'Topical', generic: 'Clotrimazole', unitPrice: 35.0, costPrice: 22.0, stock: 120, unit: 'tubes', batchNo: 'CLO-24-01', expiryDate: '2027-01-25' },
      { name: 'Canesten Cream 20g', barcode: '8901001101', category: 'Topical', generic: 'Clotrimazole', unitPrice: 55.0, costPrice: 38.0, stock: 80, unit: 'tubes', batchNo: 'CAN-24-01', expiryDate: '2027-05-20' },
      { name: 'Clotrimazole Dusting Powder', barcode: '8901001102', category: 'Topical', generic: 'Clotrimazole', unitPrice: 45.0, costPrice: 30.0, stock: 60, unit: 'pcs', batchNo: 'CLD-24-01', expiryDate: '2027-08-15' },

      // ═══ Additional unique-generic medicines ═══
      { name: 'Nimesulide 100mg', barcode: '8901002001', category: 'Analgesic', generic: 'Nimesulide', unitPrice: 10.0, costPrice: 7.0, stock: 200, unit: 'pcs', batchNo: 'NIM-24-01', expiryDate: '2026-11-20' },
      { name: 'Ibuprofen 400mg', barcode: '8901002002', category: 'Analgesic', generic: 'Ibuprofen', unitPrice: 4.0, costPrice: 2.5, stock: 250, unit: 'pcs', batchNo: 'IBU-24-01', expiryDate: '2027-03-01' },
      { name: 'Diclofenac Sodium 50mg', barcode: '8901002003', category: 'Analgesic', generic: 'Diclofenac', unitPrice: 6.0, costPrice: 4.0, stock: 180, unit: 'pcs', batchNo: 'DIC-24-01', expiryDate: '2026-07-25' },
      { name: 'Etoricoxib 90mg', barcode: '8901002004', category: 'Analgesic', generic: 'Etoricoxib', unitPrice: 45.0, costPrice: 35.0, stock: 60, unit: 'pcs', batchNo: 'ETO-24-01', expiryDate: '2026-10-10' },
      { name: 'Naproxen 500mg', barcode: '8901002005', category: 'Analgesic', generic: 'Naproxen', unitPrice: 8.0, costPrice: 5.0, stock: 150, unit: 'pcs', batchNo: 'NAPX-24-01', expiryDate: '2027-02-15' },

      { name: 'Nexium 40mg', barcode: '8901002010', category: 'Gastrointestinal', generic: 'Esomeprazole', unitPrice: 25.0, costPrice: 18.0, stock: 100, unit: 'pcs', batchNo: 'NEX-24-01', expiryDate: '2026-12-15' },
      { name: 'Pantoprazole 40mg', barcode: '8901002011', category: 'Gastrointestinal', generic: 'Pantoprazole', unitPrice: 12.0, costPrice: 8.0, stock: 150, unit: 'pcs', batchNo: 'PAN-24-01', expiryDate: '2027-04-30' },
      { name: 'Ranitidine 150mg', barcode: '8901002012', category: 'Gastrointestinal', generic: 'Ranitidine', unitPrice: 5.0, costPrice: 3.0, stock: 200, unit: 'pcs', batchNo: 'RAN-24-01', expiryDate: '2026-09-15' },
      { name: 'Domperidone 10mg', barcode: '8901002013', category: 'Gastrointestinal', generic: 'Domperidone', unitPrice: 4.0, costPrice: 2.5, stock: 250, unit: 'pcs', batchNo: 'DOM-24-01', expiryDate: '2027-01-20' },
      { name: 'Ondansetron 4mg', barcode: '8901002014', category: 'Gastrointestinal', generic: 'Ondansetron', unitPrice: 15.0, costPrice: 10.0, stock: 100, unit: 'pcs', batchNo: 'OND-24-01', expiryDate: '2026-11-30' },
      { name: 'Loperamide 2mg', barcode: '8901002015', category: 'Gastrointestinal', generic: 'Loperamide', unitPrice: 3.0, costPrice: 1.5, stock: 300, unit: 'pcs', batchNo: 'LOP-24-01', expiryDate: '2027-05-10' },
      { name: 'Antacid Gel 170ml', barcode: '8901002016', category: 'Gastrointestinal', generic: 'Aluminium Hydroxide', unitPrice: 85.0, costPrice: 60.0, stock: 50, unit: 'bottles', batchNo: 'ANT-24-01', expiryDate: '2027-08-15' },

      { name: 'Losartan 50mg', barcode: '8901002020', category: 'Cardiovascular', generic: 'Losartan', unitPrice: 18.0, costPrice: 12.0, stock: 150, unit: 'pcs', batchNo: 'LOS-24-01', expiryDate: '2026-12-31' },
      { name: 'Atorvastatin 20mg', barcode: '8901002021', category: 'Cardiovascular', generic: 'Atorvastatin', unitPrice: 22.0, costPrice: 15.0, stock: 120, unit: 'pcs', batchNo: 'ATOR-24-01', expiryDate: '2027-02-15' },
      { name: 'Metoprolol 50mg', barcode: '8901002022', category: 'Cardiovascular', generic: 'Metoprolol', unitPrice: 15.0, costPrice: 10.0, stock: 100, unit: 'pcs', batchNo: 'METP-24-01', expiryDate: '2026-10-25' },
      { name: 'Aspirin 75mg', barcode: '8901002023', category: 'Cardiovascular', generic: 'Aspirin', unitPrice: 3.0, costPrice: 1.5, stock: 400, unit: 'pcs', batchNo: 'ASP-24-01', expiryDate: '2027-07-10' },
      { name: 'Clopidogrel 75mg', barcode: '8901002024', category: 'Cardiovascular', generic: 'Clopidogrel', unitPrice: 30.0, costPrice: 20.0, stock: 80, unit: 'pcs', batchNo: 'CLOP-24-01', expiryDate: '2026-11-05' },
      { name: 'Enalapril 5mg', barcode: '8901002025', category: 'Cardiovascular', generic: 'Enalapril', unitPrice: 8.0, costPrice: 5.0, stock: 160, unit: 'pcs', batchNo: 'ENL-24-01', expiryDate: '2027-01-30' },

      { name: 'Glimepiride 2mg', barcode: '8901002030', category: 'Antidiabetic', generic: 'Glimepiride', unitPrice: 18.0, costPrice: 12.0, stock: 150, unit: 'pcs', batchNo: 'GLM-24-01', expiryDate: '2026-09-30' },
      { name: 'Sitagliptin 100mg', barcode: '8901002031', category: 'Antidiabetic', generic: 'Sitagliptin', unitPrice: 85.0, costPrice: 65.0, stock: 50, unit: 'pcs', batchNo: 'SIT-24-01', expiryDate: '2027-01-05' },
      { name: 'Insulin Glargine Pen', barcode: '8901002032', category: 'Antidiabetic', generic: 'Insulin Glargine', unitPrice: 850.0, costPrice: 700.0, stock: 20, unit: 'pens', batchNo: 'INS-24-01', expiryDate: '2026-06-15' },

      { name: 'Loratadine 10mg', barcode: '8901002040', category: 'Antihistamine', generic: 'Loratadine', unitPrice: 5.0, costPrice: 3.0, stock: 250, unit: 'pcs', batchNo: 'LOR-24-01', expiryDate: '2027-03-10' },
      { name: 'Montelukast 10mg', barcode: '8901002041', category: 'Antihistamine', generic: 'Montelukast', unitPrice: 20.0, costPrice: 14.0, stock: 100, unit: 'pcs', batchNo: 'MON-24-01', expiryDate: '2026-12-20' },
      { name: 'Fexofenadine 120mg', barcode: '8901002042', category: 'Antihistamine', generic: 'Fexofenadine', unitPrice: 12.0, costPrice: 8.0, stock: 150, unit: 'pcs', batchNo: 'FEX-24-01', expiryDate: '2027-04-05' },
      { name: 'Desloratadine 5mg', barcode: '8901002043', category: 'Antihistamine', generic: 'Desloratadine', unitPrice: 15.0, costPrice: 10.0, stock: 100, unit: 'pcs', batchNo: 'DES-24-01', expiryDate: '2027-05-30' },

      { name: 'Doxycycline 100mg', barcode: '8901002050', category: 'Antibiotic', generic: 'Doxycycline', unitPrice: 15.0, costPrice: 10.0, stock: 120, unit: 'pcs', batchNo: 'DOX-24-01', expiryDate: '2026-08-10' },
      { name: 'Cefixime 400mg', barcode: '8901002051', category: 'Antibiotic', generic: 'Cefixime', unitPrice: 55.0, costPrice: 40.0, stock: 80, unit: 'pcs', batchNo: 'CFX-24-01', expiryDate: '2026-12-01' },
      { name: 'Ceftriaxone 1g Inj', barcode: '8901002052', category: 'Antibiotic', generic: 'Ceftriaxone', unitPrice: 120.0, costPrice: 85.0, stock: 40, unit: 'vials', batchNo: 'CFT-24-01', expiryDate: '2026-10-20' },

      // ═══ VITAMINS & SUPPLEMENTS ═══
      { name: 'Vitamin C 500mg', barcode: '8901003001', category: 'Vitamin', generic: 'Ascorbic Acid', unitPrice: 5.0, costPrice: 3.0, stock: 300, unit: 'pcs', batchNo: 'VTC-24-01', expiryDate: '2027-08-30' },
      { name: 'Limcee Vitamin C 500mg', barcode: '8901003002', category: 'Vitamin', generic: 'Ascorbic Acid', unitPrice: 6.5, costPrice: 4.0, stock: 250, unit: 'pcs', batchNo: 'LMC-24-01', expiryDate: '2027-07-15' },
      { name: 'Ceevit Vitamin C', barcode: '8901003003', category: 'Vitamin', generic: 'Ascorbic Acid', unitPrice: 4.0, costPrice: 2.5, stock: 200, unit: 'pcs', batchNo: 'CEV-24-01', expiryDate: '2027-09-20' },
      { name: 'Vitamin D3 1000IU', barcode: '8901003010', category: 'Vitamin', generic: 'Cholecalciferol', unitPrice: 15.0, costPrice: 10.0, stock: 200, unit: 'pcs', batchNo: 'VTD-24-01', expiryDate: '2027-06-15' },
      { name: 'D-Rise 60K IU', barcode: '8901003011', category: 'Vitamin', generic: 'Cholecalciferol', unitPrice: 30.0, costPrice: 20.0, stock: 100, unit: 'pcs', batchNo: 'DRS-24-01', expiryDate: '2027-08-10' },
      { name: 'Calcium + D3 Tab', barcode: '8901003020', category: 'Vitamin', generic: 'Calcium Carbonate', unitPrice: 12.0, costPrice: 8.0, stock: 180, unit: 'pcs', batchNo: 'CAL-24-01', expiryDate: '2027-04-05' },
      { name: 'Shelcal 500mg', barcode: '8901003021', category: 'Vitamin', generic: 'Calcium Carbonate', unitPrice: 18.0, costPrice: 12.0, stock: 120, unit: 'pcs', batchNo: 'SHL-24-01', expiryDate: '2027-05-25' },
      { name: 'Vitamin B-Complex', barcode: '8901003030', category: 'Vitamin', generic: 'Vitamin B Complex', unitPrice: 8.0, costPrice: 5.0, stock: 250, unit: 'pcs', batchNo: 'VTB-24-01', expiryDate: '2027-07-20' },
      { name: 'Neurobion Forte', barcode: '8901003031', category: 'Vitamin', generic: 'Vitamin B Complex', unitPrice: 12.0, costPrice: 8.0, stock: 200, unit: 'pcs', batchNo: 'NRB-24-01', expiryDate: '2027-06-01' },
      { name: 'Iron + Folic Acid', barcode: '8901003040', category: 'Vitamin', generic: 'Ferrous Fumarate', unitPrice: 10.0, costPrice: 6.0, stock: 200, unit: 'pcs', batchNo: 'IRN-24-01', expiryDate: '2027-02-10' },
      { name: 'Zinc 20mg', barcode: '8901003050', category: 'Vitamin', generic: 'Zinc Sulfate', unitPrice: 6.0, costPrice: 3.5, stock: 200, unit: 'pcs', batchNo: 'ZNC-24-01', expiryDate: '2027-09-15' },
      { name: 'Multivitamin Syrup 200ml', barcode: '8901003060', category: 'Vitamin', generic: 'Multivitamin', unitPrice: 120.0, costPrice: 80.0, stock: 50, unit: 'bottles', batchNo: 'MLT-24-01', expiryDate: '2027-03-30' },
      { name: 'Omega-3 Fish Oil Cap', barcode: '8901003061', category: 'Vitamin', generic: 'Omega-3 Fatty Acids', unitPrice: 25.0, costPrice: 16.0, stock: 100, unit: 'pcs', batchNo: 'OMG-24-01', expiryDate: '2027-08-05' },

      // ═══ COUGH & COLD ═══
      { name: 'Ambroxol Syrup 100ml', barcode: '8901004001', category: 'Cough & Cold', generic: 'Ambroxol', unitPrice: 65.0, costPrice: 45.0, stock: 80, unit: 'bottles', batchNo: 'AMB-24-01', expiryDate: '2026-11-15' },
      { name: 'Mucolite Syrup', barcode: '8901004002', category: 'Cough & Cold', generic: 'Ambroxol', unitPrice: 55.0, costPrice: 38.0, stock: 70, unit: 'bottles', batchNo: 'MCL-24-01', expiryDate: '2027-01-20' },
      { name: 'Cetirizine Syrup 60ml', barcode: '8901004003', category: 'Cough & Cold', generic: 'Cetirizine', unitPrice: 45.0, costPrice: 30.0, stock: 60, unit: 'bottles', batchNo: 'CETS-24-01', expiryDate: '2027-02-20' },
      { name: 'Saline Nasal Drop 15ml', barcode: '8901004004', category: 'Cough & Cold', generic: 'Sodium Chloride', unitPrice: 25.0, costPrice: 15.0, stock: 100, unit: 'bottles', batchNo: 'SAL-24-01', expiryDate: '2028-06-30' },
      { name: 'Cough Syrup (Dextromethorphan)', barcode: '8901004005', category: 'Cough & Cold', generic: 'Dextromethorphan', unitPrice: 50.0, costPrice: 35.0, stock: 70, unit: 'bottles', batchNo: 'DXM-24-01', expiryDate: '2027-04-10' },

      // ═══ SKIN / TOPICAL ═══
      { name: 'Betadine Ointment 20g', barcode: '8901005001', category: 'Topical', generic: 'Povidone Iodine', unitPrice: 45.0, costPrice: 30.0, stock: 100, unit: 'tubes', batchNo: 'BET-24-01', expiryDate: '2027-03-30' },
      { name: 'Povidone Iodine Solution 120ml', barcode: '8901005002', category: 'Topical', generic: 'Povidone Iodine', unitPrice: 55.0, costPrice: 38.0, stock: 60, unit: 'bottles', batchNo: 'PVS-24-01', expiryDate: '2027-05-15' },
      { name: 'Mupirocin Ointment', barcode: '8901005003', category: 'Topical', generic: 'Mupirocin', unitPrice: 55.0, costPrice: 40.0, stock: 60, unit: 'tubes', batchNo: 'MUP-24-01', expiryDate: '2026-12-10' },
      { name: 'Soframycin Cream', barcode: '8901005004', category: 'Topical', generic: 'Framycetin', unitPrice: 30.0, costPrice: 20.0, stock: 80, unit: 'tubes', batchNo: 'SOF-24-01', expiryDate: '2027-05-05' },
      { name: 'Moisturizer Lotion 200ml', barcode: '8901005005', category: 'Topical', generic: 'Moisturizer', unitPrice: 120.0, costPrice: 80.0, stock: 40, unit: 'bottles', batchNo: 'MOI-24-01', expiryDate: '2028-01-01' },
      { name: 'Sunscreen SPF 50 100ml', barcode: '8901005006', category: 'Topical', generic: 'Sunscreen', unitPrice: 250.0, costPrice: 180.0, stock: 30, unit: 'bottles', batchNo: 'SUN-24-01', expiryDate: '2027-10-15' },
      { name: 'Hydrocortisone Cream 1% 15g', barcode: '8901005007', category: 'Topical', generic: 'Hydrocortisone', unitPrice: 40.0, costPrice: 28.0, stock: 70, unit: 'tubes', batchNo: 'HYD-24-01', expiryDate: '2027-06-20' },

      // ═══ EYE & EAR ═══
      { name: 'Lubricant Eye Drop 10ml', barcode: '8901006001', category: 'Eye & Ear', generic: 'Carboxymethylcellulose', unitPrice: 80.0, costPrice: 55.0, stock: 50, unit: 'bottles', batchNo: 'LUB-24-01', expiryDate: '2027-08-20' },
      { name: 'Refresh Tears Eye Drop', barcode: '8901006002', category: 'Eye & Ear', generic: 'Carboxymethylcellulose', unitPrice: 95.0, costPrice: 65.0, stock: 40, unit: 'bottles', batchNo: 'RFR-24-01', expiryDate: '2027-09-10' },
      { name: 'Tobramycin Eye Drop', barcode: '8901006003', category: 'Eye & Ear', generic: 'Tobramycin', unitPrice: 50.0, costPrice: 35.0, stock: 50, unit: 'bottles', batchNo: 'TOB-24-01', expiryDate: '2026-12-15' },

      // ═══ MEDICAL DEVICES & SUPPLIES ═══
      { name: 'Surgical Mask (Box 50)', barcode: '8901007001', category: 'Medical Supply', generic: null, unitPrice: 120.0, costPrice: 80.0, stock: 40, unit: 'boxes', batchNo: 'MSK-24-01', expiryDate: '2028-12-31' },
      { name: 'N95 Mask (Box 5)', barcode: '8901007002', category: 'Medical Supply', generic: null, unitPrice: 250.0, costPrice: 180.0, stock: 30, unit: 'boxes', batchNo: 'N95-24-01', expiryDate: '2028-12-31' },
      { name: 'Gloves (Box 100)', barcode: '8901007003', category: 'Medical Supply', generic: null, unitPrice: 250.0, costPrice: 180.0, stock: 30, unit: 'boxes', batchNo: 'GLV-24-01', expiryDate: '2028-12-31' },
      { name: 'Band-Aid (Box 100)', barcode: '8901007004', category: 'Medical Supply', generic: null, unitPrice: 150.0, costPrice: 100.0, stock: 50, unit: 'boxes', batchNo: 'BND-24-01', expiryDate: '2028-12-31' },
      { name: 'Cotton Roll 500g', barcode: '8901007005', category: 'Medical Supply', generic: null, unitPrice: 80.0, costPrice: 55.0, stock: 60, unit: 'pcs', batchNo: 'COT-24-01', expiryDate: '2028-12-31' },
      { name: 'Gauze Roll 10m', barcode: '8901007006', category: 'Medical Supply', generic: null, unitPrice: 25.0, costPrice: 15.0, stock: 100, unit: 'pcs', batchNo: 'GAU-24-01', expiryDate: '2028-12-31' },
      { name: 'Elastic Bandage 6cm', barcode: '8901007007', category: 'Medical Supply', generic: null, unitPrice: 45.0, costPrice: 30.0, stock: 80, unit: 'pcs', batchNo: 'EBD-24-01', expiryDate: '2028-12-31' },
      { name: 'Adhesive Tape 2.5cm x 9m', barcode: '8901007008', category: 'Medical Supply', generic: null, unitPrice: 30.0, costPrice: 20.0, stock: 90, unit: 'pcs', batchNo: 'ATP-24-01', expiryDate: '2028-12-31' },
      { name: 'Digital Thermometer', barcode: '8901007009', category: 'Medical Supply', generic: null, unitPrice: 180.0, costPrice: 120.0, stock: 20, unit: 'pcs', batchNo: 'THM-24-01', expiryDate: '2028-12-31' },
      { name: 'BP Monitor (Digital)', barcode: '8901007010', category: 'Medical Supply', generic: null, unitPrice: 1800.0, costPrice: 1400.0, stock: 5, unit: 'pcs', batchNo: 'BPM-24-01', expiryDate: '2028-12-31' },
      { name: 'Glucometer Strips (Box 50)', barcode: '8901007011', category: 'Medical Supply', generic: null, unitPrice: 600.0, costPrice: 450.0, stock: 15, unit: 'boxes', batchNo: 'GLU-24-01', expiryDate: '2027-09-30' },
      { name: 'Glucometer Machine', barcode: '8901007012', category: 'Medical Supply', generic: null, unitPrice: 900.0, costPrice: 650.0, stock: 8, unit: 'pcs', batchNo: 'GLM-24-01', expiryDate: '2028-12-31' },
      { name: 'Hand Sanitizer 500ml', barcode: '8901007013', category: 'Medical Supply', generic: null, unitPrice: 90.0, costPrice: 60.0, stock: 80, unit: 'bottles', batchNo: 'SAN-24-01', expiryDate: '2028-06-30' },
      { name: 'ORS Saline (Sachet x10)', barcode: '8901007014', category: 'Medical Supply', generic: 'Oral Rehydration Salts', unitPrice: 40.0, costPrice: 25.0, stock: 100, unit: 'packs', batchNo: 'ORS-24-01', expiryDate: '2027-11-10' },
      { name: 'Syringe 5ml (Box 100)', barcode: '8901007015', category: 'Medical Supply', generic: null, unitPrice: 150.0, costPrice: 100.0, stock: 25, unit: 'boxes', batchNo: 'SYR-24-01', expiryDate: '2028-12-31' },
      { name: 'Stethoscope', barcode: '8901007016', category: 'Medical Supply', generic: null, unitPrice: 450.0, costPrice: 320.0, stock: 5, unit: 'pcs', batchNo: 'STE-24-01', expiryDate: '2028-12-31' },
      { name: 'Pulse Oximeter', barcode: '8901007017', category: 'Medical Supply', generic: null, unitPrice: 350.0, costPrice: 250.0, stock: 10, unit: 'pcs', batchNo: 'POX-24-01', expiryDate: '2028-12-31' },

      // ═══ PERSONAL CARE ═══
      { name: 'Savlon Antiseptic 500ml', barcode: '8901008001', category: 'Personal Care', generic: 'Chlorhexidine', unitPrice: 95.0, costPrice: 65.0, stock: 50, unit: 'bottles', batchNo: 'SAV-24-01', expiryDate: '2028-03-15' },
      { name: 'Dettol Antiseptic 500ml', barcode: '8901008002', category: 'Personal Care', generic: 'Chloroxylenol', unitPrice: 110.0, costPrice: 75.0, stock: 45, unit: 'bottles', batchNo: 'DET-24-01', expiryDate: '2028-04-20' },
      { name: 'Dettol Soap 100g', barcode: '8901008003', category: 'Personal Care', generic: null, unitPrice: 45.0, costPrice: 30.0, stock: 80, unit: 'pcs', batchNo: 'DTS-24-01', expiryDate: '2028-05-20' },
      { name: 'Lifebuoy Soap 100g', barcode: '8901008004', category: 'Personal Care', generic: null, unitPrice: 35.0, costPrice: 22.0, stock: 100, unit: 'pcs', batchNo: 'LFB-24-01', expiryDate: '2028-06-10' },
      { name: 'Baby Diaper (Medium x20)', barcode: '8901008005', category: 'Personal Care', generic: null, unitPrice: 450.0, costPrice: 350.0, stock: 25, unit: 'packs', batchNo: 'DPR-24-01', expiryDate: '2028-12-31' },
      { name: 'Baby Diaper (Large x20)', barcode: '8901008006', category: 'Personal Care', generic: null, unitPrice: 500.0, costPrice: 380.0, stock: 20, unit: 'packs', batchNo: 'DPRL-24-01', expiryDate: '2028-12-31' },
      { name: 'Baby Lotion 200ml', barcode: '8901008007', category: 'Personal Care', generic: null, unitPrice: 180.0, costPrice: 120.0, stock: 35, unit: 'bottles', batchNo: 'BBL-24-01', expiryDate: '2028-08-30' },
      { name: 'Antiseptic Cream 20g', barcode: '8901008008', category: 'Personal Care', generic: 'Chlorhexidine', unitPrice: 35.0, costPrice: 22.0, stock: 60, unit: 'tubes', batchNo: 'ASC-24-01', expiryDate: '2028-02-15' },

      // ═══ BEAUTY & SKINCARE ═══
      { name: 'Nivea Body Lotion 400ml', barcode: '8901009001', category: 'Beauty', generic: 'Moisturizer', unitPrice: 380.0, costPrice: 290.0, stock: 40, unit: 'bottles', batchNo: 'NVL-24-01', expiryDate: '2028-06-30' },
      { name: 'Pond\'s Face Wash 100g', barcode: '8901009002', category: 'Beauty', generic: null, unitPrice: 150.0, costPrice: 110.0, stock: 60, unit: 'pcs', batchNo: 'PND-24-01', expiryDate: '2028-04-15' },
      { name: 'Garnier Light Cream 50ml', barcode: '8901009003', category: 'Beauty', generic: null, unitPrice: 220.0, costPrice: 165.0, stock: 35, unit: 'pcs', batchNo: 'GAR-24-01', expiryDate: '2028-03-20' },
      { name: 'Fair & Lovely Cream 50g', barcode: '8901009004', category: 'Beauty', generic: null, unitPrice: 95.0, costPrice: 68.0, stock: 70, unit: 'pcs', batchNo: 'FAL-24-01', expiryDate: '2028-05-10' },
      { name: 'Vaseline Lip Balm 4.8g', barcode: '8901009005', category: 'Beauty', generic: null, unitPrice: 60.0, costPrice: 40.0, stock: 100, unit: 'pcs', batchNo: 'VSL-24-01', expiryDate: '2028-12-31' },
      { name: 'Sunscreen Lotion SPF 30 100ml', barcode: '8901009006', category: 'Beauty', generic: 'Sunscreen', unitPrice: 280.0, costPrice: 200.0, stock: 30, unit: 'bottles', batchNo: 'SFL-24-01', expiryDate: '2028-08-20' },
      { name: 'Himalaya Face Wash 150ml', barcode: '8901009007', category: 'Beauty', generic: null, unitPrice: 180.0, costPrice: 130.0, stock: 45, unit: 'bottles', batchNo: 'HIM-24-01', expiryDate: '2028-07-15' },
      { name: 'Jergens Lotion 250ml', barcode: '8901009008', category: 'Beauty', generic: 'Moisturizer', unitPrice: 320.0, costPrice: 240.0, stock: 30, unit: 'bottles', batchNo: 'JRG-24-01', expiryDate: '2028-09-30' },
      { name: 'Neutrogena Face Wash 100g', barcode: '8901009009', category: 'Beauty', generic: null, unitPrice: 250.0, costPrice: 185.0, stock: 35, unit: 'pcs', batchNo: 'NEU-24-01', expiryDate: '2028-05-25' },
      { name: 'Lakme Foundation 30ml', barcode: '8901009010', category: 'Beauty', generic: null, unitPrice: 350.0, costPrice: 260.0, stock: 25, unit: 'pcs', batchNo: 'LKM-24-01', expiryDate: '2028-10-15' },

      // ═══ HYGIENE ═══
      { name: 'Colgate Toothpaste 150g', barcode: '8901010001', category: 'Hygiene', generic: null, unitPrice: 85.0, costPrice: 60.0, stock: 100, unit: 'pcs', batchNo: 'CLG-24-01', expiryDate: '2028-06-30' },
      { name: 'Closeup Toothpaste 150g', barcode: '8901010002', category: 'Hygiene', generic: null, unitPrice: 80.0, costPrice: 58.0, stock: 90, unit: 'pcs', batchNo: 'CLO-24-01', expiryDate: '2028-05-15' },
      { name: 'Sensodyne Toothpaste 75g', barcode: '8901010003', category: 'Hygiene', generic: null, unitPrice: 140.0, costPrice: 105.0, stock: 50, unit: 'pcs', batchNo: 'SNS-24-01', expiryDate: '2028-08-20' },
      { name: 'Whisper Sanitary Pad (Pack 7)', barcode: '8901010004', category: 'Hygiene', generic: null, unitPrice: 120.0, costPrice: 85.0, stock: 80, unit: 'packs', batchNo: 'WSP-24-01', expiryDate: '2028-12-31' },
      { name: 'Kotex Sanitary Pad (Pack 8)', barcode: '8901010005', category: 'Hygiene', generic: null, unitPrice: 110.0, costPrice: 78.0, stock: 70, unit: 'packs', batchNo: 'KTX-24-01', expiryDate: '2028-12-31' },
      { name: 'Gillette Razor Blade (Pack 5)', barcode: '8901010006', category: 'Hygiene', generic: null, unitPrice: 200.0, costPrice: 145.0, stock: 50, unit: 'packs', batchNo: 'GIL-24-01', expiryDate: '2028-12-31' },
      { name: ' shaving Foam 200ml', barcode: '8901010007', category: 'Hygiene', generic: null, unitPrice: 150.0, costPrice: 105.0, stock: 45, unit: 'bottles', batchNo: 'SHV-24-01', expiryDate: '2028-09-15' },
      { name: 'Listerine Mouthwash 250ml', barcode: '8901010008', category: 'Hygiene', generic: null, unitPrice: 180.0, costPrice: 130.0, stock: 40, unit: 'bottles', batchNo: 'LST-24-01', expiryDate: '2028-07-30' },
      { name: 'Dettol Handwash 200ml', barcode: '8901010009', category: 'Hygiene', generic: 'Chloroxylenol', unitPrice: 70.0, costPrice: 48.0, stock: 70, unit: 'bottles', batchNo: 'DHW-24-01', expiryDate: '2028-06-15' },
      { name: 'Lifebuoy Handwash 200ml', barcode: '8901010010', category: 'Hygiene', generic: null, unitPrice: 60.0, costPrice: 42.0, stock: 65, unit: 'bottles', batchNo: 'LHW-24-01', expiryDate: '2028-05-30' },
      { name: 'Vim Dishwash Bar 500g', barcode: '8901010011', category: 'Hygiene', generic: null, unitPrice: 40.0, costPrice: 28.0, stock: 100, unit: 'pcs', batchNo: 'VIM-24-01', expiryDate: '2028-12-31' },
      { name: 'Harpic Toilet Cleaner 500ml', barcode: '8901010012', category: 'Hygiene', generic: null, unitPrice: 85.0, costPrice: 58.0, stock: 60, unit: 'bottles', batchNo: 'HRP-24-01', expiryDate: '2028-12-31' },
      { name: 'Domex Floor Cleaner 500ml', barcode: '8901010013', category: 'Hygiene', generic: null, unitPrice: 75.0, costPrice: 52.0, stock: 55, unit: 'bottles', batchNo: 'DMX-24-01', expiryDate: '2028-12-31' },

      // ═══ HEALTHCARE DEVICES ═══
      { name: 'Digital Thermometer', barcode: '8901011001', category: 'Healthcare', generic: null, unitPrice: 180.0, costPrice: 120.0, stock: 15, unit: 'pcs', batchNo: 'THM-24-01', expiryDate: '2028-12-31' },
      { name: 'BP Monitor (Digital)', barcode: '8901011002', category: 'Healthcare', generic: null, unitPrice: 1800.0, costPrice: 1400.0, stock: 5, unit: 'pcs', batchNo: 'BPM-24-01', expiryDate: '2028-12-31' },
      { name: 'Pulse Oximeter', barcode: '8901011003', category: 'Healthcare', generic: null, unitPrice: 350.0, costPrice: 250.0, stock: 10, unit: 'pcs', batchNo: 'POX-24-01', expiryDate: '2028-12-31' },
      { name: 'Nebulizer Machine', barcode: '8901011004', category: 'Healthcare', generic: null, unitPrice: 2200.0, costPrice: 1700.0, stock: 4, unit: 'pcs', batchNo: 'NEB-24-01', expiryDate: '2028-12-31' },
      { name: 'Blood Glucose Monitor', barcode: '8901011005', category: 'Healthcare', generic: null, unitPrice: 900.0, costPrice: 650.0, stock: 6, unit: 'pcs', batchNo: 'GLM-24-01', expiryDate: '2028-12-31' },
      { name: 'Glucometer Strips (Box 50)', barcode: '8901011006', category: 'Healthcare', generic: null, unitPrice: 600.0, costPrice: 450.0, stock: 12, unit: 'boxes', batchNo: 'GLU-24-01', expiryDate: '2027-09-30' },
      { name: 'Stethoscope', barcode: '8901011007', category: 'Healthcare', generic: null, unitPrice: 450.0, costPrice: 320.0, stock: 5, unit: 'pcs', batchNo: 'STE-24-01', expiryDate: '2028-12-31' },
      { name: 'Hot Water Bottle 500ml', barcode: '8901011008', category: 'Healthcare', generic: null, unitPrice: 120.0, costPrice: 80.0, stock: 30, unit: 'pcs', batchNo: 'HWB-24-01', expiryDate: '2028-12-31' },
      { name: 'Compression Bandage 15cm', barcode: '8901011009', category: 'Healthcare', generic: null, unitPrice: 65.0, costPrice: 42.0, stock: 40, unit: 'pcs', batchNo: 'CMP-24-01', expiryDate: '2028-12-31' },
      { name: 'Adult Diaper (Medium x10)', barcode: '8901011010', category: 'Healthcare', generic: null, unitPrice: 350.0, costPrice: 260.0, stock: 20, unit: 'packs', batchNo: 'ADL-24-01', expiryDate: '2028-12-31' },
      { name: 'Crepe Bandage 10cm x 4m', barcode: '8901011011', category: 'Healthcare', generic: null, unitPrice: 35.0, costPrice: 22.0, stock: 60, unit: 'pcs', batchNo: 'CRP-24-01', expiryDate: '2028-12-31' },
      { name: 'First Aid Kit (Small)', barcode: '8901011012', category: 'Healthcare', generic: null, unitPrice: 280.0, costPrice: 200.0, stock: 15, unit: 'pcs', batchNo: 'FAK-24-01', expiryDate: '2028-12-31' },
      { name: 'ORS Saline (Sachet x10)', barcode: '8901011013', category: 'Healthcare', generic: 'Oral Rehydration Salts', unitPrice: 40.0, costPrice: 25.0, stock: 100, unit: 'packs', batchNo: 'ORS-24-01', expiryDate: '2027-11-10' },
      { name: 'Paracetamol Suppository 125mg (Box 10)', barcode: '8901011014', category: 'Healthcare', generic: 'Paracetamol', unitPrice: 45.0, costPrice: 30.0, stock: 40, unit: 'boxes', batchNo: 'PSP-24-01', expiryDate: '2027-08-15' },
      { name: 'Antiseptic Liquid 500ml', barcode: '8901011015', category: 'Healthcare', generic: 'Chlorhexidine', unitPrice: 95.0, costPrice: 65.0, stock: 40, unit: 'bottles', batchNo: 'ASL-24-01', expiryDate: '2028-03-15' },
    ];

    // Insert products in batches to avoid SQLite limits
    const BATCH_SIZE = 50;
    const allProducts: Awaited<ReturnType<typeof db.product.create>>[] = [];
    for (let i = 0; i < productData.length; i += BATCH_SIZE) {
      const batch = productData.slice(i, i + BATCH_SIZE);
      const created = await Promise.all(
        batch.map((p) =>
          db.product.create({
            data: {
              name: p.name,
              barcode: p.barcode,
              category: p.category,
              generic: p.generic,
              unitPrice: p.unitPrice,
              costPrice: p.costPrice,
              stock: p.stock,
              unit: p.unit,
              batchNo: p.batchNo,
              expiryDate: p.expiryDate ? new Date(p.expiryDate) : null,
            },
          })
        )
      );
      allProducts.push(...created);
    }

    // Count generics with multiple products
    const genericCounts: Record<string, number> = {};
    for (const p of productData) {
      if (p.generic) {
        genericCounts[p.generic] = (genericCounts[p.generic] || 0) + 1;
      }
    }
    const multiGeneric = Object.entries(genericCounts)
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name} (${count})`);

    // ── Seed Payment Provider Configs + Clearing Accounts ──
    const DEFAULT_PROVIDERS = [
      { name: 'Cash', code: 'cash', type: 'cash', serviceCharge: 0, minCharge: 0, settlementInterval: 'manual' },
      { name: 'bKash', code: 'bkash', type: 'mfs', serviceCharge: 1.15, minCharge: 0, settlementInterval: '24h' },
      { name: 'Nagad', code: 'nagad', type: 'mfs', serviceCharge: 1.15, minCharge: 0, settlementInterval: '24h' },
      { name: 'Rocket', code: 'rocket', type: 'mfs', serviceCharge: 1.15, minCharge: 0, settlementInterval: '48h' },
      { name: 'Card', code: 'card', type: 'card', serviceCharge: 1.5, minCharge: 0, settlementInterval: '48h' },
      { name: 'Steadfast', code: 'steadfast', type: 'delivery', serviceCharge: 1.0, minCharge: 0, settlementInterval: '72h' },
      { name: 'Pathao', code: 'pathao', type: 'delivery', serviceCharge: 1.5, minCharge: 0, settlementInterval: '72h' },
      { name: 'Daowa Rider', code: 'daowa_rider', type: 'delivery', serviceCharge: 0.5, minCharge: 0, settlementInterval: '24h' },
      { name: 'RedX', code: 'redx', type: 'delivery', serviceCharge: 1.2, minCharge: 0, settlementInterval: '48h' },
      { name: 'Paperfly', code: 'paperfly', type: 'delivery', serviceCharge: 1.3, minCharge: 0, settlementInterval: '48h' },
      { name: 'Other', code: 'other', type: 'delivery', serviceCharge: 0, minCharge: 0, settlementInterval: 'manual' },
    ];

    for (const p of DEFAULT_PROVIDERS) {
      try {
        const existing = await db.paymentProviderConfig.findUnique({ where: { code: p.code } });
        if (existing) continue;

        const provider = await db.paymentProviderConfig.create({
          data: {
            name: p.name, code: p.code, type: p.type,
            serviceCharge: p.serviceCharge, minCharge: p.minCharge,
            settlementInterval: p.settlementInterval, isActive: true,
          },
        });

        // Create clearing account for non-cash providers
        if (p.code !== 'cash') {
          await db.clearingAccount.create({
            data: {
              providerConfigId: provider.id,
              name: `${p.name} Clearing`,
              accountCode: `CLR_${p.code.toUpperCase()}`,
              pendingBalance: 0, settledBalance: 0,
            },
          });
        }
      } catch (e) {
        // Skip if provider already exists or error
      }
    }

    return NextResponse.json({
      success: true,
      products: allProducts.length,
      customers: customers.length,
      genericsWithMultipleProducts: multiGeneric,
      totalUniqueGenerics: Object.keys(genericCounts).length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
