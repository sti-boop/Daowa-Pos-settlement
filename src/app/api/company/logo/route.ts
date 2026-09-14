import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/** Resolve uploads directory — uses persistent volume in production */
function getUploadsDir(): string {
  if (process.env.NODE_ENV === 'production') {
    return '/data/daowa-accounting/uploads/logos';
  }
  return path.join(process.cwd(), 'public', 'uploads', 'logos');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, GIF, WebP, or SVG.' }, { status: 400 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
    }

    const uploadsDir = getUploadsDir();
    await mkdir(uploadsDir, { recursive: true });

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `company-logo.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // In production, serve via API route; in dev, serve via public/
    const url = process.env.NODE_ENV === 'production'
      ? `/api/company/logo/file/${fileName}`
      : `/uploads/logos/${fileName}`;

    return NextResponse.json({ url, fileName });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
