import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { processSaleJournal, validateJournalBalance } from '@/lib/accounting/transaction-processor'
import { syncSaleToSettlementHub } from '@/lib/store'
import { syncPosSaleToAccounting } from '@/lib/accounting-sync'

function getDaySummary(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function calcSummary(sales: { paymentMethod: string; grandTotal: number; dueAmount: number; saleItems: { quantity: number }[] }[]) {
  const todaySales = sales.length
  const todayRevenue = sales
    .filter((s) => s.paymentMethod !== 'due')
    .reduce((sum, s) => sum + s.grandTotal, 0)
  const todayDue = sales
    .filter((s) => s.dueAmount > 0)
    .reduce((sum, s) => sum + s.dueAmount, 0)
  const totalItems = sales.reduce(
    (sum, s) => sum + s.saleItems.reduce((itemSum, si) => itemSum + si.quantity, 0),
    0
  )
  return {
    todaySales,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    todayDue: Math.round(todayDue * 100) / 100,
    totalItems,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const summary = searchParams.get('summary') === 'true'
    const cashSummary = searchParams.get('cashSummary') === 'true'
    const report = searchParams.get('report') === 'true'
    const comparison = searchParams.get('comparison') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const today = searchParams.get('today') === 'true'
    const customerIdFilter = searchParams.get('customerId')

    // Customer order history endpoint
    if (customerIdFilter) {
      const customerSales = await db.sale.findMany({
        where: {
          customerId: customerIdFilter,
          status: 'completed',
        },
        include: {
          saleItems: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      // Attach return counts
      const salesWithReturns = await Promise.all(
        customerSales.map(async (sale) => {
          const returnCount = await db.return.count({ where: { saleId: sale.id } });
          return { ...sale, _returnsCount: returnCount };
        })
      )

      const totalSpent = customerSales.reduce((sum, s) => sum + s.grandTotal, 0)
      const totalOrders = customerSales.length
      const totalDue = customerSales.reduce((sum, s) => sum + s.dueAmount, 0)

      return NextResponse.json({
        sales: salesWithReturns,
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalOrders,
        totalDue: Math.round(totalDue * 100) / 100,
      })
    }

    if (today) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // Payment stats endpoint
      if (searchParams.get('payment-stats') === 'true') {
        const todaySales = await db.sale.findMany({
          where: {
            createdAt: { gte: todayStart, lte: todayEnd },
            status: 'completed',
          },
          select: { paymentMethod: true, grandTotal: true },
        })

        const map = new Map<string, { count: number; total: number }>()
        for (const s of todaySales) {
          const existing = map.get(s.paymentMethod) || { count: 0, total: 0 }
          map.set(s.paymentMethod, {
            count: existing.count + 1,
            total: Math.round((existing.total + s.grandTotal) * 100) / 100,
          })
        }

        const result = Array.from(map.entries())
          .map(([method, data]) => ({ method, ...data }))
          .sort((a, b) => b.total - a.total)

        return NextResponse.json(result)
      }

      const todaySales = await db.sale.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'completed',
        },
      })

      const saleCount = todaySales.length
      const saleTotal = Math.round(
        todaySales.reduce((sum, s) => sum + s.grandTotal, 0) * 100
      ) / 100

      return NextResponse.json({ saleCount, saleTotal })
    }

    if (comparison) {
      const todayDate = new Date()
      const yesterday = new Date(todayDate)
      yesterday.setDate(yesterday.getDate() - 1)

      const todayRange = getDaySummary(todayDate)
      const yesterdayRange = getDaySummary(yesterday)

      const [todaySales, yesterdaySales] = await Promise.all([
        db.sale.findMany({
          where: {
            createdAt: { gte: todayRange.start, lte: todayRange.end },
            status: 'completed',
          },
          include: { saleItems: true },
        }),
        db.sale.findMany({
          where: {
            createdAt: { gte: yesterdayRange.start, lte: yesterdayRange.end },
            status: 'completed',
          },
          include: { saleItems: true },
        }),
      ])

      const todayData = calcSummary(todaySales)
      const yesterdayData = calcSummary(yesterdaySales)

      const salesChange = yesterdayData.todaySales === 0
        ? 0
        : ((todayData.todaySales - yesterdayData.todaySales) / yesterdayData.todaySales) * 100

      const revenueChange = yesterdayData.todayRevenue === 0
        ? 0
        : ((todayData.todayRevenue - yesterdayData.todayRevenue) / yesterdayData.todayRevenue) * 100

      // Hourly data for today's sparkline (last 7 hours)
      const currentHour = todayDate.getHours()
      const hourlyData: number[] = []
      for (let i = 6; i >= 0; i--) {
        const hour = currentHour - i
        if (hour < 0) {
          hourlyData.push(0)
          continue
        }
        const hourStart = new Date(todayDate)
        hourStart.setHours(hour, 0, 0, 0)
        const hourEnd = new Date(todayDate)
        hourEnd.setHours(hour, 59, 59, 999)
        const hourSales = todaySales.filter(
          (s) => new Date(s.createdAt) >= hourStart && new Date(s.createdAt) <= hourEnd
        )
        const hourRevenue = hourSales.reduce((sum, s) => sum + s.grandTotal, 0)
        hourlyData.push(Math.round(hourRevenue))
      }

      return NextResponse.json({
        today: todayData,
        yesterday: yesterdayData,
        changePercent: {
          salesChange: Math.round(salesChange * 10) / 10,
          revenueChange: Math.round(revenueChange * 10) / 10,
        },
        hourlyData,
      })
    }

    // Cash summary endpoint
    if (cashSummary) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const cashSales = await db.sale.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'completed',
          paymentMethod: { in: ['cash'] },
        },
      })

      const totalCashReceived = cashSales.reduce((sum, s) => sum + s.receivedAmount, 0)
      const totalChangeGiven = cashSales.reduce((sum, s) => sum + s.changeAmount, 0)

      return NextResponse.json({
        totalCashReceived: Math.round(totalCashReceived * 100) / 100,
        totalChangeGiven: Math.round(totalChangeGiven * 100) / 100,
        cashSaleCount: cashSales.length,
      })
    }

    // Daily report endpoint
    if (report) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const todaySales = await db.sale.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'completed',
        },
        include: { saleItems: true },
      })

      const totalSales = todaySales.length
      const totalRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0)
      const totalDue = todaySales.reduce((sum, s) => sum + s.dueAmount, 0)
      const totalDiscount = todaySales.reduce((sum, s) => sum + s.totalDiscount, 0)
      const totalDeliveryCharge = todaySales.reduce((sum, s) => sum + s.deliveryCharge, 0)
      const totalItemsSold = todaySales.reduce((sum, s) => sum + s.saleItems.reduce((iSum, si) => iSum + si.quantity, 0), 0)

      // Payment breakdown
      const paymentBreakdown: Record<string, number> = { cash: 0, bkash: 0, nagad: 0, card: 0, due: 0, split: 0, rocket: 0 }
      for (const s of todaySales) {
        if (paymentBreakdown[s.paymentMethod] !== undefined) {
          paymentBreakdown[s.paymentMethod]++
        }
      }

      // Top 5 products
      const productMap = new Map<string, { quantity: number; revenue: number }>()
      for (const s of todaySales) {
        for (const item of s.saleItems) {
          const existing = productMap.get(item.productName) || { quantity: 0, revenue: 0 }
          productMap.set(item.productName, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal,
          })
        }
      }
      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      // Hourly breakdown
      const hourlyMap = new Map<string, { sales: number; revenue: number }>()
      for (let h = 0; h < 24; h++) {
        hourlyMap.set(h.toString().padStart(2, '0'), { sales: 0, revenue: 0 })
      }
      for (const s of todaySales) {
        const hour = new Date(s.createdAt).getHours().toString().padStart(2, '0')
        const entry = hourlyMap.get(hour) || { sales: 0, revenue: 0 }
        entry.sales++
        entry.revenue += s.grandTotal
        hourlyMap.set(hour, entry)
      }
      const hourlyBreakdown = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .filter((h) => h.sales > 0)

      return NextResponse.json({
        date: todayStart.toISOString().split('T')[0],
        totalSales,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDue: Math.round(totalDue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalDeliveryCharge: Math.round(totalDeliveryCharge * 100) / 100,
        paymentBreakdown,
        totalItemsSold,
        topProducts,
        hourlyBreakdown,
      })
    }

    if (summary) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const todaySales = await db.sale.findMany({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: 'completed',
        },
        include: { saleItems: true },
      })

      const todaySalesCount = todaySales.length
      const todayRevenue = todaySales
        .filter((s) => s.paymentMethod !== 'due')
        .reduce((sum, s) => sum + s.grandTotal, 0)
      const todayDue = todaySales
        .filter((s) => s.dueAmount > 0)
        .reduce((sum, s) => sum + s.dueAmount, 0)
      const totalItems = todaySales.reduce(
        (sum, s) =>
          sum + s.saleItems.reduce((itemSum, si) => itemSum + si.quantity, 0),
        0
      )

      return NextResponse.json({
        todaySales: todaySalesCount,
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayDue: Math.round(todayDue * 100) / 100,
        totalItems,
      })
    }

    const sales = await db.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        saleItems: true,
        splitPayments: true,
      },
    })

    // Attach return counts for each sale
    const salesWithReturns = await Promise.all(
      sales.map(async (sale) => {
        const returnCount = await db.return.count({
          where: { saleId: sale.id },
        })
        return { ...sale, _returnsCount: returnCount }
      })
    )

    return NextResponse.json(salesWithReturns)
  } catch (error) {
    console.error('Failed to fetch sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerId,
      subtotal,
      totalDiscount,
      discountType,
      discountValue,
      deliveryCharge,
      roundingAdjust,
      grandTotal,
      paymentMethod,
      receivedAmount,
      changeAmount,
      dueAmount,
      items,
      splitPayments,
      isDelivery,
      deliveryPartnerCode,
      freeDelivery,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one sale item is required' },
        { status: 400 }
      )
    }

    const invoiceNo = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

    const sale = await db.$transaction(async (tx) => {
      // 1. Fetch all active provider configs with their clearing accounts
      const providerConfigs = await tx.paymentProviderConfig.findMany({
        where: { isActive: true },
        include: {
          clearingAccounts: {
            select: { id: true },
            take: 1,
          },
        },
      })

      // Map into the shape expected by processSaleJournal
      const providerConfigInput = providerConfigs.map((p) => ({
        code: p.code,
        name: p.name,
        type: p.type,
        serviceCharge: p.serviceCharge,
        minCharge: p.minCharge,
        clearingAccountId: p.clearingAccounts[0]?.id,
      }))

      // 2. Create the sale record
      const newSale = await tx.sale.create({
        data: {
          invoiceNo,
          customerId: customerId || null,
          subtotal,
          totalDiscount: totalDiscount ?? 0,
          discountType: discountType ?? 'percentage',
          discountValue: discountValue ?? 0,
          deliveryCharge: deliveryCharge ?? 0,
          roundingAdjust: roundingAdjust ?? 0,
          grandTotal,
          paymentMethod,
          receivedAmount: receivedAmount ?? 0,
          changeAmount: changeAmount ?? 0,
          dueAmount: dueAmount ?? 0,
          saleItems: {
            create: items.map(
              (item: {
                productId: string
                productName: string
                unitPrice: number
                quantity: number
                unit: string
                itemDiscount: number
                itemDiscountType: string
                subtotal: number
              }) => ({
                productId: item.productId,
                productName: item.productName,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                unit: item.unit,
                itemDiscount: item.itemDiscount ?? 0,
                itemDiscountType: item.itemDiscountType ?? 'percentage',
                subtotal: item.subtotal,
              })
            ),
          },
          splitPayments: splitPayments
            ? {
                create: splitPayments.map(
                  (sp: { method: string; amount: number }) => ({
                    method: sp.method,
                    amount: sp.amount,
                  })
                ),
              }
            : undefined,
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true },
          },
          saleItems: true,
          splitPayments: true,
        },
      })

      // 3. Decrement stock for each item sold
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product) {
          throw new Error(`Product ${item.productId} not found`)
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}: ${product.stock} available, ${item.quantity} requested`)
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // 4. Process journal entries via the transaction processor
      const journalLines = processSaleJournal(
        {
          subtotal,
          deliveryCharge: deliveryCharge ?? 0,
          grandTotal,
          totalDiscount: totalDiscount ?? 0,
          paymentMethod,
          receivedAmount: receivedAmount ?? 0,
          splitPayments,
          isDelivery: isDelivery ?? false,
          deliveryPartnerCode,
        },
        providerConfigInput
      )

      // 5. Validate journal balance
      const validation = validateJournalBalance(journalLines)
      if (!validation.balanced) {
        console.error(
          `Journal balance mismatch for sale ${newSale.id}:`,
          validation
        )
        throw new Error(
          `Journal balance error: debits=${validation.totalDebits}, credits=${validation.totalCredits}, diff=${validation.difference}`
        )
      }

      // 6. Persist all journal entries
      for (const line of journalLines) {
        await tx.journalEntry.create({
          data: {
            saleId: newSale.id,
            clearingId: line.clearingId || null,
            accountType: line.accountType,
            entryType: line.entryType,
            amount: line.amount,
            description: `${line.description} — ${invoiceNo}`,
          },
        })
      }

      // 7. Determine clearing status & delivery partner
      const isCashOrDue =
        paymentMethod === 'cash' || paymentMethod === 'due'

      const deliveryProvider = isDelivery && deliveryPartnerCode
        ? providerConfigs.find((p) => p.code === deliveryPartnerCode)
        : null

      const hasClearingJournalLine = journalLines.some(
        (l) => l.clearingId
      )

      const clearingStatus = isCashOrDue
        ? 'N/A'
        : hasClearingJournalLine
          ? 'PENDING_SETTLEMENT'
          : 'N/A'

      // 8. Update the sale with accounting fields
      const updatedSale = await tx.sale.update({
        where: { id: newSale.id },
        data: {
          isDelivery: isDelivery ?? false,
          deliveryPartnerId: deliveryProvider?.id || null,
          clearingStatus,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          saleItems: true,
          splitPayments: true,
        },
      })

      // 9. Increment clearing account pendingBalance for each involved clearing account
      const clearingIds = new Set(
        journalLines
          .filter((l) => l.clearingId)
          .map((l) => l.clearingId!)
      )

      for (const cid of clearingIds) {
        const totalDebitForClearing = journalLines
          .filter(
            (l) =>
              l.clearingId === cid && l.entryType === 'DEBIT'
          )
          .reduce((sum, l) => sum + l.amount, 0)

        const totalCreditForClearing = journalLines
          .filter(
            (l) =>
              l.clearingId === cid && l.entryType === 'CREDIT'
          )
          .reduce((sum, l) => sum + l.amount, 0)

        const netPending =
          Math.round((totalDebitForClearing - totalCreditForClearing) * 100) /
          100

        if (netPending > 0) {
          await tx.clearingAccount.update({
            where: { id: cid },
            data: { pendingBalance: { increment: netPending } },
          })
        }
      }

      return updatedSale
    })

    // Award loyalty points: 1 point per ৳100 spent (rounded down)
    let earnedPoints = 0
    if (customerId) {
      earnedPoints = Math.floor(grandTotal / 100)
      if (earnedPoints > 0) {
        await db.customer.update({
          where: { id: customerId },
          data: { loyaltyPoints: { increment: earnedPoints } },
        })
      }
    }

    // Sync the sale to the Settlement Hub's in-memory store
    try {
      syncSaleToSettlementHub({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        customerId: sale.customerId,
        customerName: sale.customer?.name,
        customerPhone: sale.customer?.phone,
        subtotal: sale.subtotal,
        totalDiscount: sale.totalDiscount,
        deliveryCharge: sale.deliveryCharge,
        grandTotal: sale.grandTotal,
        paymentMethod: sale.paymentMethod,
        receivedAmount: sale.receivedAmount,
        dueAmount: sale.dueAmount,
        status: sale.status,
        isDelivery: sale.isDelivery,
        deliveryPartnerCode: body.isDelivery ? body.deliveryPartnerCode : undefined,
        freeDelivery: body.freeDelivery || false,
        saleItems: sale.saleItems.map((si: any) => ({
          productName: si.productName,
          quantity: si.quantity,
          unitPrice: si.unitPrice,
          subtotal: si.subtotal,
        })),
        splitPayments: sale.splitPayments?.map((sp: any) => ({
          method: sp.method,
          amount: sp.amount,
        })),
        note: sale.note || body.note,
        createdAt: sale.createdAt,
      })
    } catch (syncErr) {
      console.error('Settlement Hub sync failed (non-fatal):', syncErr)
    }

    // Sync the sale to the Accounting system (double-entry mirror)
    try {
      await syncPosSaleToAccounting({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        customerId: sale.customerId,
        customerName: sale.customer?.name,
        subtotal: sale.subtotal,
        totalDiscount: sale.totalDiscount,
        deliveryCharge: sale.deliveryCharge,
        grandTotal: sale.grandTotal,
        paymentMethod: sale.paymentMethod,
        receivedAmount: sale.receivedAmount,
        dueAmount: sale.dueAmount,
        isDelivery: sale.isDelivery,
        deliveryPartnerCode: body.isDelivery ? body.deliveryPartnerCode : undefined,
        saleItems: sale.saleItems.map((si: any) => ({
          productName: si.productName,
          quantity: si.quantity,
          unitPrice: si.unitPrice,
          subtotal: si.subtotal,
        })),
        splitPayments: sale.splitPayments?.map((sp: any) => ({
          method: sp.method,
          amount: sp.amount,
        })),
        createdAt: sale.createdAt,
      })
    } catch (accSyncErr) {
      console.error('Accounting sync failed (non-fatal):', accSyncErr)
    }

    return NextResponse.json({ ...sale, earnedPoints }, { status: 201 })
  } catch (error: unknown) {
    console.error('Failed to create sale:', error)
    if (error instanceof Error && error.message.includes('Journal balance error')) {
      return NextResponse.json(
        { error: error.message },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    )
  }
}
