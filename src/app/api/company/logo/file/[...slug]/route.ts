import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

/** Serve logo files from persistent volume in production */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const filePath = slug.join('/');

    if (!filePath || filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const fullPath = path.join('/data/daowa-accounting/uploads/logos', filePath);
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const data = await readFile(fullPath);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    };

    return new NextResponse(data, {
      headers: {
        'Content-Type': mimeTypes[ext || ''] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
