import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILENAME = 'daowa-pos-settlement.zip';

export async function GET() {
  try {
    const file = await readFile(path.join(process.cwd(), 'public', FILENAME));
    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${FILENAME}"`,
        'Content-Length': String(file.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { error: 'Download file not found. Please regenerate the app package.' },
      { status: 404 },
    );
  }
}
