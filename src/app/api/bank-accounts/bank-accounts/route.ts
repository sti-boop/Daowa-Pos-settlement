import { NextRequest, NextResponse } from 'next/server';
import {
  businessBankAccounts,
  accounts,
  postAuditJournalEntry,
  BusinessBankAccount,
} from '@/lib/store';

export async function GET() {
  const totalLiquidity = businessBankAccounts.reduce(
    (sum, b) => sum + (b.isActive ? b.balance : 0),
    0
  );
  return NextResponse.json({ bankAccounts: businessBankAccounts, totalLiquidity });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      bankName,
      accountName,
      accountNumber,
      accountType = 'Corporate Current',
      branchName,
      routingNumber,
      initialBalance = 0,
      isDefault = false,
      notes = '',
    } = body;

    if (!bankName || !accountName || !accountNumber) {
      return NextResponse.json(
        { error: 'Bank name, account name, and account number are required.' },
        { status: 400 }
      );
    }

    const newId = `bank_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (isDefault) {
      businessBankAccounts.forEach((b) => {
        b.isDefault = false;
      });
    }

    const newAccount: BusinessBankAccount = {
      id: newId,
      bankName: bankName.trim(),
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      accountType,
      branchName: branchName ? branchName.trim() : 'Corporate Branch',
      routingNumber: routingNumber ? routingNumber.trim() : '125271829',
      balance: Number(initialBalance) || 0,
      isDefault: isDefault || businessBankAccounts.length === 0,
      isActive: true,
      openedDate: new Date().toISOString().slice(0, 10),
      notes: notes ? notes.trim() : '',
    };

    businessBankAccounts.push(newAccount);

    const bankPrefix = bankName.split(' ')[0];
    const ledgerKey = `${bankPrefix} Bank A/c`;
    if (!accounts[ledgerKey]) {
      accounts[ledgerKey] = {
        id: `acc_${newId}`,
        accountName: ledgerKey,
        friendlyLabel: `${bankName} (${accountType} #${accountNumber.slice(-4)})`,
        accountType: 'asset',
        balance: Number(initialBalance) || 0,
        isClearingAccount: false,
      };
    } else {
      accounts[ledgerKey].balance += Number(initialBalance) || 0;
    }

    if (Number(initialBalance) > 0) {
      postAuditJournalEntry(
        'Add Business Bank Account',
        'System Administrator',
        `Registered business bank account ${bankName} (#${accountNumber}) with starting liquidity ৳${Number(
          initialBalance
        ).toLocaleString()}`,
        [
          { accountName: ledgerKey, debit: Number(initialBalance), credit: 0 },
          { accountName: 'Main Cash/Vault A/c', debit: 0, credit: Number(initialBalance) },
        ]
      );
    }

    return NextResponse.json({
      success: true,
      bankAccount: newAccount,
      message: `Business bank account ${bankName} (#${accountNumber}) added successfully.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
