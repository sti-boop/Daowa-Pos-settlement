import { readFileSync } from 'fs'
import { join } from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const zipPath = join(process.cwd(), 'download', 'daowa-accounting.zip')
    const data = readFileSync(zipPath)
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="daowa-accounting.zip"',
        'Content-Length': String(data.length),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Zip file not found' }, { status: 404 })
  }
}
