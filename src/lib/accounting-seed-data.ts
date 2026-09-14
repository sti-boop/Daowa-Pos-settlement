// Daowa Accounting — default seed data (Chart of Accounts, voucher types, ledgers, stock)
// Shared by the in-memory accounting engine (src/lib/accounting-db.ts) and the seed endpoint.


export const DEFAULT_GROUPS = [

  // ============================================================
  // 1-xx  ASSETS
  // ============================================================

  { name: 'Current Assets', code: '1100', isPrimary: true, nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Current', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Cash In Hand', code: '1110', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Cash', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Cash at Bank', code: '1120', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Bank', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Mobile Banking (bKash/Nagad/Rocket)', code: '1130', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Bank', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Inventory (Stock in Hand)', code: '1140', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Inventory', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Receivables (Money to Receive)', code: '1150', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Current', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Advance to Staff, Suppliers & Other', code: '1160', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Current', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Prepaid Expenses', code: '1170', parentName: 'Current Assets', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Current', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Fixed Assets (Long-term Property)', code: '1500', isPrimary: true, nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Fixed Asset', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Land & Building', code: '1510', parentName: 'Fixed Assets (Long-term Property)', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Fixed Asset', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Furniture & Fixtures', code: '1520', parentName: 'Fixed Assets (Long-term Property)', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Fixtures', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Electrical, Computers & IT Equipment', code: '1530', parentName: 'Fixed Assets (Long-term Property)', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Equipment', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Vehicles', code: '1540', parentName: 'Fixed Assets (Long-term Property)', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Equipment', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Machinery', code: '1550', parentName: 'Fixed Assets (Long-term Property)', nature: 'Asset', classification: 'Balance Sheet', subCategory: 'Equipment', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Accumulated Depreciation', code: '1560', parentName: 'Fixed Assets (Long-term Property)', nature: 'Asset', classification: 'Balance Sheet', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  // ============================================================
  // 2-xx  LIABILITIES
  // ============================================================

  { name: 'Current Liabilities', code: '2100', isPrimary: true, nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Current', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Payables (Money to Pay)', code: '2110', parentName: 'Current Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Payables', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Bank Overdraft / CC Loan', code: '2120', parentName: 'Current Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Loans', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Staff Salaries Payable', code: '2130', parentName: 'Current Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Accrued', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Tax / VAT Payable', code: '2140', parentName: 'Current Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Taxes', affectsGrossProfit: false, isTaxRelated: true, isReserved: true, notes: '' },

  { name: 'Advance from Customers', code: '2150', parentName: 'Current Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Current', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Long-term Liabilities', code: '2500', isPrimary: true, nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Long-Term', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Bank Loan', code: '2510', parentName: 'Long-term Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Loans', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Loans from Others', code: '2520', parentName: 'Long-term Liabilities', nature: 'Liability', classification: 'Balance Sheet', subCategory: 'Loans', affectsGrossProfit: false, isReserved: true, notes: '' },

  // ============================================================
  // 3-xx  EQUITY / CAPITAL
  // ============================================================

  { name: 'Capital', code: '3000', isPrimary: true, nature: 'Equity', classification: 'Balance Sheet', subCategory: 'Equity', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: "Owner's Capital", code: '3100', parentName: 'Capital', nature: 'Equity', classification: 'Balance Sheet', subCategory: 'Capital', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Retained Earnings', code: '3110', parentName: 'Capital', nature: 'Equity', classification: 'Balance Sheet', subCategory: 'Earnings', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: "Owner's Drawings", code: '3120', parentName: 'Capital', nature: 'Equity', classification: 'Balance Sheet', subCategory: 'Drawings', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Profit & Loss A/c', code: '3130', parentName: 'Capital', nature: 'Equity', classification: 'Balance Sheet', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  // ============================================================
  // 4-xx  INCOME
  // ============================================================

  { name: 'Direct Income (Sales)', code: '4000', isPrimary: true, nature: 'Income', classification: 'Profit & Loss', subCategory: 'Revenue', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Medicine Sales', code: '4100', parentName: 'Direct Income (Sales)', nature: 'Income', classification: 'Profit & Loss', subCategory: 'Revenue', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Healthcare Product Sales', code: '4110', parentName: 'Direct Income (Sales)', nature: 'Income', classification: 'Profit & Loss', subCategory: 'Revenue', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'General Item Sales', code: '4120', parentName: 'Direct Income (Sales)', nature: 'Income', classification: 'Profit & Loss', subCategory: 'Revenue', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Indirect Income (Other Income)', code: '4500', isPrimary: true, nature: 'Income', classification: 'Profit & Loss', subCategory: 'Revenue', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Delivery Income', code: '4510', parentName: 'Indirect Income (Other Income)', nature: 'Income', classification: 'Profit & Loss', subCategory: 'Shipping', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Discount Received', code: '4520', parentName: 'Indirect Income (Other Income)', nature: 'Income', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Commission Received', code: '4530', parentName: 'Indirect Income (Other Income)', nature: 'Income', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Other Income', code: '4540', parentName: 'Indirect Income (Other Income)', nature: 'Income', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  // ============================================================
  // 5-xx  EXPENSES
  // ============================================================

  { name: 'Cost of Goods Sold (Direct Expenses)', code: '5000', isPrimary: true, nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Cost of Sales', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Purchase of Medicines', code: '5100', parentName: 'Cost of Goods Sold (Direct Expenses)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Cost of Sales', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Purchase of Healthcare Products', code: '5110', parentName: 'Cost of Goods Sold (Direct Expenses)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Cost of Sales', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Purchase of General Items', code: '5120', parentName: 'Cost of Goods Sold (Direct Expenses)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Cost of Sales', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Damaged / Expired Stock Loss', code: '5130', parentName: 'Cost of Goods Sold (Direct Expenses)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Wastage', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Delivery & Packaging Cost', code: '5140', parentName: 'Cost of Goods Sold (Direct Expenses)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Distribution', affectsGrossProfit: true, isReserved: true, notes: '' },

  { name: 'Indirect Expenses (Overhead)', code: '5500', isPrimary: true, nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Operating Exp', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Shop Rent', code: '5510', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Rent', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Electricity & Utilities', code: '5520', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Utilities', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Salary & Wages', code: '5530', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Payroll', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Delivery Rider Expenses', code: '5540', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Distribution', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Advertising & Marketing', code: '5550', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Marketing', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Depreciation', code: '5560', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Bank Charges & Interest', code: '5570', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Government License & Fees', code: '5580', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Legal/Licenses', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Printing & Stationery', code: '5590', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Insurance', code: '5600', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Bad Debts', code: '5610', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Telephone & Internet', code: '5620', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: 'Utilities', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Repair & Maintenance', code: '5630', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Travel & Conveyance', code: '5640', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Miscellaneous Expenses', code: '5650', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'bKash/Nagad Cash Out Charges', code: '5660', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Discount Allowed', code: '5670', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },

  { name: 'Round Off', code: '5680', parentName: 'Indirect Expenses (Overhead)', nature: 'Expense', classification: 'Profit & Loss', subCategory: '-', affectsGrossProfit: false, isReserved: true, notes: '' },
];

// ============================================================
// VOUCHER TYPES
// ============================================================

export const DEFAULT_VOUCHER_TYPES = [
  { name: 'Expense', prefix: 'EV' },
  { name: 'Income', prefix: 'RV' },
  { name: 'Journal', prefix: 'JV' },
  { name: 'Sales', prefix: 'SV' },
  { name: 'Purchase', prefix: 'PV' },
  { name: 'Contra', prefix: 'CV' },
  { name: 'Debit Note', prefix: 'DNV' },
  { name: 'Credit Note', prefix: 'CNV' },
];

// ============================================================
// LEDGERS — One per leaf COA group
// ============================================================

export const DEFAULT_LEDGERS = [
  // === 1-01 Current Assets ===
  { name: 'Counter Cash', groupName: 'Cash In Hand', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Cash in Safe/Vault', groupName: 'Cash In Hand', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Petty Cash', groupName: 'Cash In Hand', openingBalance: 0, balanceType: 'Dr' },

  { name: 'City Bank', groupName: 'Cash at Bank', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Dutch-Bangla Bank', groupName: 'Cash at Bank', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Islami Bank', groupName: 'Cash at Bank', openingBalance: 0, balanceType: 'Dr' },

  { name: 'bKash Merchant', groupName: 'Mobile Banking (bKash/Nagad/Rocket)', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Nagad Merchant', groupName: 'Mobile Banking (bKash/Nagad/Rocket)', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Rocket Merchant', groupName: 'Mobile Banking (bKash/Nagad/Rocket)', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Medicine Stock', groupName: 'Inventory (Stock in Hand)', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Healthcare Products Stock', groupName: 'Inventory (Stock in Hand)', openingBalance: 0, balanceType: 'Dr' },
  { name: 'General Items Stock', groupName: 'Inventory (Stock in Hand)', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Customer A', groupName: 'Receivables (Money to Receive)', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Customer B', groupName: 'Receivables (Money to Receive)', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Staff Advance', groupName: 'Advance to Staff, Suppliers & Other', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Supplier Advance', groupName: 'Advance to Staff, Suppliers & Other', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Prepaid Rent', groupName: 'Prepaid Expenses', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Prepaid Insurance', groupName: 'Prepaid Expenses', openingBalance: 0, balanceType: 'Dr' },

  // === 1-02 Fixed Assets ===
  { name: 'Shop Land & Building', groupName: 'Land & Building', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Display Racks', groupName: 'Furniture & Fixtures', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Dispensary Counter', groupName: 'Furniture & Fixtures', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Office Furniture', groupName: 'Furniture & Fixtures', openingBalance: 0, balanceType: 'Dr' },

  { name: 'POS Terminal 01', groupName: 'Electrical, Computers & IT Equipment', openingBalance: 0, balanceType: 'Dr' },
  { name: 'POS Terminal 02', groupName: 'Electrical, Computers & IT Equipment', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Office Computer', groupName: 'Electrical, Computers & IT Equipment', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Medicine Fridge 01', groupName: 'Electrical, Computers & IT Equipment', openingBalance: 0, balanceType: 'Dr' },
  { name: 'AC Unit - Shop Floor', groupName: 'Electrical, Computers & IT Equipment', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Delivery Van', groupName: 'Vehicles', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Dispensing Machine', groupName: 'Machinery', openingBalance: 0, balanceType: 'Dr' },

  { name: 'Accumulated Depreciation A/c', groupName: 'Accumulated Depreciation', openingBalance: 0, balanceType: 'Cr' },

  // === 2-01 Current Liabilities ===
  { name: 'Square Pharmaceuticals', groupName: 'Payables (Money to Pay)', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Beximco Pharma', groupName: 'Payables (Money to Pay)', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Incepta Pharmaceuticals', groupName: 'Payables (Money to Pay)', openingBalance: 0, balanceType: 'Cr' },
  { name: 'General Vendor A', groupName: 'Payables (Money to Pay)', openingBalance: 0, balanceType: 'Cr' },
  { name: 'General Vendor B', groupName: 'Payables (Money to Pay)', openingBalance: 0, balanceType: 'Cr' },

  { name: 'CC Loan - City Bank', groupName: 'Bank Overdraft / CC Loan', openingBalance: 0, balanceType: 'Cr' },

  { name: 'Outstanding Salary', groupName: 'Staff Salaries Payable', openingBalance: 0, balanceType: 'Cr' },

  { name: 'VAT Payable', groupName: 'Tax / VAT Payable', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Income Tax Payable', groupName: 'Tax / VAT Payable', openingBalance: 0, balanceType: 'Cr' },

  { name: 'Customer Advance A', groupName: 'Advance from Customers', openingBalance: 0, balanceType: 'Cr' },

  // === 2-02 Long-term Liabilities ===
  { name: 'Business Loan', groupName: 'Bank Loan', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Personal Loan Received', groupName: 'Loans from Others', openingBalance: 0, balanceType: 'Cr' },

  // === 3-01 Capital ===
  { name: "Owner's Capital A/c", groupName: "Owner's Capital", openingBalance: 500000, balanceType: 'Cr' },
  { name: 'Retained Earnings A/c', groupName: 'Retained Earnings', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Drawings A/c', groupName: "Owner's Drawings", openingBalance: 0, balanceType: 'Dr' },

  // === 4-01 Direct Income ===
  { name: 'Shop Medicine Sales', groupName: 'Medicine Sales', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Online Medicine Sales', groupName: 'Medicine Sales', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Shop Healthcare Sales', groupName: 'Healthcare Product Sales', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Online Healthcare Sales', groupName: 'Healthcare Product Sales', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Shop General Sales', groupName: 'General Item Sales', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Online General Sales', groupName: 'General Item Sales', openingBalance: 0, balanceType: 'Cr' },

  // === 4-02 Indirect Income ===
  { name: 'Delivery Charges Collected', groupName: 'Delivery Income', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Supplier Discount', groupName: 'Discount Received', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Agency Commission', groupName: 'Commission Received', openingBalance: 0, balanceType: 'Cr' },
  { name: 'Miscellaneous Income', groupName: 'Other Income', openingBalance: 0, balanceType: 'Cr' },

  // === 5-01 Cost of Goods Sold ===
  { name: 'Medicine Purchase Cost', groupName: 'Purchase of Medicines', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Healthcare Product Purchase Cost', groupName: 'Purchase of Healthcare Products', openingBalance: 0, balanceType: 'Dr' },
  { name: 'General Item Purchase Cost', groupName: 'Purchase of General Items', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Expired Medicine Write-off', groupName: 'Damaged / Expired Stock Loss', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Courier Charges', groupName: 'Delivery & Packaging Cost', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Packaging Materials', groupName: 'Delivery & Packaging Cost', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Rider Fuel Expense', groupName: 'Delivery & Packaging Cost', openingBalance: 0, balanceType: 'Dr' },

  // === 5-02 Indirect Expenses ===
  { name: 'Monthly Shop Rent', groupName: 'Shop Rent', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Electricity Bill', groupName: 'Electricity & Utilities', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Gas Bill', groupName: 'Electricity & Utilities', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Water Bill', groupName: 'Electricity & Utilities', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Pharmacist Salary', groupName: 'Salary & Wages', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Sales Staff Salary', groupName: 'Salary & Wages', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Delivery Rider Salary', groupName: 'Salary & Wages', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Staff Bonus & Overtime', groupName: 'Salary & Wages', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Rider Fuel & Allowance', groupName: 'Delivery Rider Expenses', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Facebook Ads', groupName: 'Advertising & Marketing', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Google Ads', groupName: 'Advertising & Marketing', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Fixed Asset Depreciation', groupName: 'Depreciation', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Bank Charges', groupName: 'Bank Charges & Interest', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Interest on Loan', groupName: 'Bank Charges & Interest', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Drug License Renewal', groupName: 'Government License & Fees', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Trade License Renewal', groupName: 'Government License & Fees', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Legal & Audit Fees', groupName: 'Government License & Fees', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Printing & Stationery', groupName: 'Printing & Stationery', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Business Insurance', groupName: 'Insurance', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Bad Debt Write-off', groupName: 'Bad Debts', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Internet Bill', groupName: 'Telephone & Internet', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Telephone Bill', groupName: 'Telephone & Internet', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Equipment Repair', groupName: 'Repair & Maintenance', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Shop Maintenance', groupName: 'Repair & Maintenance', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Travel Expense', groupName: 'Travel & Conveyance', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Conveyance Allowance', groupName: 'Travel & Conveyance', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Miscellaneous', groupName: 'Miscellaneous Expenses', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Suspense A/c', groupName: 'Miscellaneous Expenses', openingBalance: 0, balanceType: 'Dr' },
  { name: 'bKash Cash Out Charge', groupName: 'bKash/Nagad Cash Out Charges', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Nagad Cash Out Charge', groupName: 'bKash/Nagad Cash Out Charges', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Sales Discount', groupName: 'Discount Allowed', openingBalance: 0, balanceType: 'Dr' },
  { name: 'Round Off A/c', groupName: 'Round Off', openingBalance: 0, balanceType: 'Dr' },
];

// ============================================================
// STOCK GROUPS — Pharma / healthcare inventory taxonomy
// ============================================================

export const DEFAULT_STOCK_GROUPS = [
  { name: 'Medicines', parentName: null },
  { name: 'Antibiotics', parentName: 'Medicines' },
  { name: 'Analgesics & Antipyretics', parentName: 'Medicines' },
  { name: 'Cardiovascular', parentName: 'Medicines' },
  { name: 'Diabetes Care', parentName: 'Medicines' },
  { name: 'Vitamins & Supplements', parentName: 'Medicines' },
  { name: 'Medical Devices', parentName: null },
  { name: 'Diagnostic Devices', parentName: 'Medical Devices' },
  { name: 'Personal Care', parentName: null },
  { name: 'Baby & Mother Care', parentName: 'Personal Care' },
];

// ============================================================
// STOCK ITEMS — Sample inventory (opening stock)
// ============================================================

export const DEFAULT_STOCK_ITEMS = [
  { name: 'Napa (Paracetamol) 500mg — Strip of 10', groupName: 'Analgesics & Antipyretics', hsnCode: '30049099', vatRate: 0, unit: 'Strip', openingQty: 250, openingRate: 12.5, openingValue: 3125, minStockLevel: 50 },
  { name: 'Ace (Paracetamol) 500mg — Strip of 10', groupName: 'Analgesics & Antipyretics', hsnCode: '30049099', vatRate: 0, unit: 'Strip', openingQty: 180, openingRate: 12, openingValue: 2160, minStockLevel: 40 },
  { name: 'Amoxil (Amoxicillin) 500mg — Strip of 10', groupName: 'Antibiotics', hsnCode: '30041020', vatRate: 0, unit: 'Strip', openingQty: 90, openingRate: 85, openingValue: 7650, minStockLevel: 30 },
  { name: 'Ceftriaxone 1g Injection', groupName: 'Antibiotics', hsnCode: '30042013', vatRate: 0, unit: 'Nos', openingQty: 24, openingRate: 145, openingValue: 3480, minStockLevel: 25 },
  { name: 'Atorvastatin 20mg — Strip of 10', groupName: 'Cardiovascular', hsnCode: '30049099', vatRate: 0, unit: 'Strip', openingQty: 120, openingRate: 95, openingValue: 11400, minStockLevel: 30 },
  { name: 'Metformin 500mg — Strip of 10', groupName: 'Diabetes Care', hsnCode: '30049099', vatRate: 0, unit: 'Strip', openingQty: 150, openingRate: 45, openingValue: 6750, minStockLevel: 40 },
  { name: 'Ceevit (Vitamin C) 250mg — Strip of 10', groupName: 'Vitamins & Supplements', hsnCode: '30045010', vatRate: 0, unit: 'Strip', openingQty: 200, openingRate: 25, openingValue: 5000, minStockLevel: 50 },
  { name: 'Digital Thermometer', groupName: 'Diagnostic Devices', hsnCode: '90251980', vatRate: 0, unit: 'Nos', openingQty: 15, openingRate: 320, openingValue: 4800, minStockLevel: 10 },
  { name: 'Blood Pressure Monitor (Upper Arm)', groupName: 'Diagnostic Devices', hsnCode: '90189019', vatRate: 0, unit: 'Nos', openingQty: 8, openingRate: 2650, openingValue: 21200, minStockLevel: 5 },
  { name: 'Pulse Oximeter Fingertip', groupName: 'Diagnostic Devices', hsnCode: '90370090', vatRate: 0, unit: 'Nos', openingQty: 4, openingRate: 1450, openingValue: 5800, minStockLevel: 6 },
  { name: 'Baby Diapers (Medium, 44pcs)', groupName: 'Baby & Mother Care', hsnCode: '96190010', vatRate: 0, unit: 'Pack', openingQty: 60, openingRate: 385, openingValue: 23100, minStockLevel: 15 },
  { name: 'Baby Wipes (80pcs)', groupName: 'Baby & Mother Care', hsnCode: '33079090', vatRate: 0, unit: 'Pack', openingQty: 75, openingRate: 140, openingValue: 10500, minStockLevel: 20 },
];
