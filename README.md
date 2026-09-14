# Daowa POS — Medicine & Healthcare POS with Settlement Hub

A complete, production-ready Point of Sale system for pharmacies and healthcare retail, featuring an integrated Settlement Hub with double-entry accounting, EOD cash register, courier/rider/MFS/card settlements, and much more.

## Features

### POS (Point of Sale)
- **Product Management** — barcode scanning, categories, generics, stock tracking, expiry dates
- **Cart System** — item discounts, invoice discounts, rounding adjustment
- **8 Payment Methods** — Cash, bKash, Nagad, Rocket, Card, Due, COD (Cash on Delivery), Split
- **Split Payments** — pay with multiple methods simultaneously
- **Delivery Orders** — Steadfast, Pathao, RedX, Carrybee, Daowa Rider, with Free Delivery option
- **Customer Management** — loyalty points, purchase history, due tracking
- **Hold Orders** — suspend and resume transactions
- **Shift Management** — cashier shift open/close
- **Sales Analytics** — daily reports, charts
- **SMS Invoicing** — send invoice via SMS

### Settlement Hub
- **MFS Settlement** — bKash, Nagad, Rocket, Upay bank transfers with gateway fees
- **Courier COD Settlement** — Steadfast, Pathao, RedX, Carrybee bank deposits with delivery + COD deductions
- **Rider Cash Collection** — own rider cash deposits to Main Vault
- **Card Gateway Settlement** — Visa/Mastercard/POS terminal payouts
- **Individual Order Settlement** — settle any order via any method (auto, MFS, courier, rider, card, cash, due)
- **EOD Cash Register** — note breakdown counting, discrepancy tracking, vault transfer
- **Courier Return & Restock** — inspect and restock returned parcels (intact/damaged)
- **Fee & Commission Matrix** — configure delivery fees, COD %, MFS charges, card fees
- **Bank Account Management** — multiple bank accounts, default account switching
- **Audit Journal** — full double-entry ledger verification (100% balanced)
- **Free Delivery Accounting** — company absorbs delivery charge as Courier Expense
- **Rounding Income/Expense** — rounding up = income, rounding down = expense
- **Due Management** — settle due orders clears the due amount

### Accounting (Double-Entry)
- Automated journal entries for every sale
- Clearing accounts per provider (MFS, courier, card)
- Courier Expense for delivery charges
- MFS Charge Expense for gateway fees
- Card Gateway Expense for card processing
- Rounding Income/Expense accounts
- Cash Shortage/Overage tracking
- 100% balanced ledger verification

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with shadcn/ui
- **Database**: Prisma ORM with SQLite (easily switchable to PostgreSQL)
- **State**: Zustand for client state
- **Icons**: Lucide React
- **Charts**: Recharts
- **Fonts**: Manrope (POS), Geist (fallback)

## Getting Started

### Prerequisites
- Node.js 18+ or Bun runtime
- npm/pnpm/bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/daowa-pos.git
cd daowa-pos
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up the database:
```bash
# Copy the example env file
cp .env.example .env

# Push the Prisma schema to SQLite
npx prisma db push
# or
bun run db:push
```

4. Run the development server:
```bash
npm run dev
# or
bun run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

6. Seed the database (products, customers, payment providers):
   - The app will prompt you to seed on first load
   - Or call `POST /api/seed` manually

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema (SQLite/PostgreSQL)
├── src/
│   ├── app/
│   │   ├── page.tsx            # Main POS interface
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles + design system
│   │   └── api/                # API routes
│   │       ├── sales/          # Sale CRUD + journal entries
│   │       ├── products/       # Product CRUD
│   │       ├── customers/      # Customer CRUD + smart search
│   │       ├── settle/         # Settlement routes (mfs, courier, rider, card, order)
│   │       ├── eod/            # EOD shift close
│   │       ├── overview/       # Settlement hub overview
│   │       ├── orders/         # Orders list + simulate
│   │       ├── fees/           # Fee settings
│   │       ├── bank-accounts/  # Bank account management
│   │       ├── services/       # MFS/Courier provider management
│   │       ├── returns/        # Courier return & restock
│   │       ├── audit-journal/  # Double-entry audit journal
│   │       ├── seed/           # Database seeder
│   │       └── ...
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── pos/                # POS components
│   │   │   ├── ProductSearch, CartTable, PaymentSection
│   │   │   ├── DeliveryOrderSection, CustomerSection
│   │   │   ├── TotalsPanel, HoldOrders, SaleConfirmation
│   │   │   ├── SalesAnalytics, DailyReport, ProductManager
│   │   │   └── PaymentIcons (Cash, bKash, Nagad, Rocket, Card, Due, COD, Split)
│   │   └── daowa/              # Settlement Hub components
│   │       ├── SettlementHubOverlay (full-screen overlay)
│   │       ├── Navbar (balances + tab navigation)
│   │       ├── SettlementHub (MFS/Courier/Rider/Card/Individual tabs)
│   │       ├── EodCashRegister
│   │       ├── CourierReturnQueue
│   │       ├── FeeSettingsMatrix
│   │       ├── OrderDetailsSettlementModal
│   │       ├── AuditorInspectionModal
│   │       ├── BusinessBankAccountsModal
│   │       ├── AdminToolsModal
│   │       └── ServiceManagementModal
│   ├── lib/
│   │   ├── store.ts            # Settlement hub in-memory store (globalThis singleton)
│   │   ├── types.ts            # Shared types
│   │   ├── db.ts                # Prisma client (with mock-db fallback)
│   │   ├── mock-db.ts           # In-memory database fallback
│   │   ├── accounting/
│   │   │   └── transaction-processor.ts  # Double-entry journal logic
│   │   └── utils.ts
│   ├── services/
│   │   └── api.ts              # Settlement hub API client
│   ├── store/
│   │   └── pos-store.ts        # Zustand POS state
│   └── hooks/
│       ├── use-hydrated.ts
│       ├── use-toast.ts
│       └── use-mobile.ts
├── public/
│   ├── payment-icons/          # bKash, Nagad, Rocket logos
│   ├── logo.svg
│   └── robots.txt
├── package.json
├── prisma/schema.prisma
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

## Color Palette

| Color | Hex | Usage |
|---|---|---|
| Green (Primary) | `#3FB98C` | Brand color, MFS, primary buttons |
| Teal | `teal-600` | Courier sections |
| Amber | `amber-600` | Rider sections |
| Indigo | `indigo-600` | Card sections |
| Purple | `purple-600` | Individual settlements |
| Dark Brown | `#524646` | Headings |
| Warm Gray | `#A8A492` | Subtle labels |
| Warm Cream | `#FCF2E5` | Backgrounds |
| Orange-Red | `#EC5B38` | Danger/action accents |

## Payment Methods

| Method | Type | Accounting |
|---|---|---|
| Cash | POS counter | Dr POS Cash Holding, Cr Sales Revenue |
| bKash | MFS | Dr bKash Clearing, Dr MFS Charge Expense, Cr Sales Revenue |
| Nagad | MFS | Dr Nagad Clearing, Dr MFS Charge Expense, Cr Sales Revenue |
| Rocket | MFS | Dr Rocket Clearing, Dr MFS Charge Expense, Cr Sales Revenue |
| Card | Card gateway | Dr Card Clearing, Dr Card Gateway Expense, Cr Sales Revenue |
| Due | Accounts Receivable | Dr Customer AR, Cr Sales Revenue |
| COD | Cash on Delivery | Courier collects from customer → Dr Courier Clearing, Cr Revenue |
| Split | Multiple methods | Dr each method's clearing, Cr Revenue |

## License

MIT License — feel free to use this project for your pharmacy or healthcare business.

## Credits

Built with Next.js, Prisma, Tailwind CSS, and shadcn/ui.
