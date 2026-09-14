import { NextRequest, NextResponse } from 'next/server';
import { sendAlphaSms } from '@/lib/sms';

export async function POST(req: NextRequest) {
  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone number and message text are required' },
        { status: 400 }
      );
    }

    const result = await sendAlphaSms(phone, message);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to send SMS via Alpha SMS',
          details: result,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      simulated: result.simulated ?? false,
      to: phone,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('SMS API Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while sending SMS' },
      { status: 500 }
    );
  }
}

