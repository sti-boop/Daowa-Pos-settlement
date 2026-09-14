import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, barcode, category, generic, unitPrice, costPrice, stock, unit, image, batchNo, expiryDate } = body;

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(barcode !== undefined ? { barcode: barcode || null } : {}),
        ...(category !== undefined ? { category: category || null } : {}),
        ...(generic !== undefined ? { generic: generic || null } : {}),
        ...(unitPrice !== undefined ? { unitPrice: parseFloat(unitPrice.toFixed(2)) } : {}),
        ...(costPrice !== undefined ? { costPrice: costPrice !== null ? parseFloat(costPrice.toFixed(2)) : null } : {}),
        ...(stock !== undefined ? { stock: parseInt(stock, 10) } : {}),
        ...(unit !== undefined ? { unit } : {}),
        ...(image !== undefined ? { image: image || null } : {}),
        ...(batchNo !== undefined ? { batchNo: batchNo || null } : {}),
        ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update product';
    if (message.includes('Unique')) {
      return NextResponse.json(
        { error: 'A product with this barcode already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if product is used in any sale
    const saleItemCount = await db.saleItem.count({
      where: { productId: id },
    });

    if (saleItemCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: product is used in ${saleItemCount} sale(s)` },
        { status: 400 }
      );
    }

    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
