/**
 * Alpha SMS Gateway Integration
 * Supports Alpha SMS / SMS.net.bd gateway.
 *
 * Configured via environment variables:
 * - ALPHA_SMS_API_KEY (Required for live sending)
 * - ALPHA_SMS_SENDER_ID (Optional: approved Sender ID or Masking name)
 * - ALPHA_SMS_API_URL (Optional: defaults to https://api.sms.net.bd/sendsms or https://alphasms.biz/index.php/app/smsapi)
 */

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Normalizes phone numbers for Bangladesh SMS gateways
 * Converts formats like '01711223344', '+8801711223344', '8801711-223344' to '8801711223344'
 */
export function normalizeBdPhoneNumber(phone: string): string {
  // Strip all non-numeric characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('880')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `88${digits}`;
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `880${digits}`;
  }
  return digits;
}

export async function sendAlphaSms(
  recipientPhone: string,
  message: string
): Promise<SendSmsResult> {
  const apiKey = process.env.ALPHA_SMS_API_KEY || '';
  const senderId = process.env.ALPHA_SMS_SENDER_ID || '';
  const apiUrl =
    process.env.ALPHA_SMS_API_URL || 'https://api.sms.net.bd/sendsms';

  const cleanPhone = normalizeBdPhoneNumber(recipientPhone);

  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      error: `Invalid phone number: ${recipientPhone}`,
    };
  }

  // If no API key configured, provide clean fallback with instruction
  if (!apiKey || apiKey.trim() === '') {
    console.log(`[AlphaSMS (Simulated)] To: ${cleanPhone} | Message: ${message}`);
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}`,
    };
  }

  try {
    // Form data payload compatible with Alpha SMS endpoints
    const formData = new FormData();
    formData.append('api_key', apiKey.trim());
    formData.append('msg', message);
    formData.append('to', cleanPhone);
    if (senderId) {
      formData.append('sender_id', senderId.trim());
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    const responseText = await res.text();

    let jsonResponse: any = null;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch {
      // response might be plain text
    }

    // Check for success patterns from Alpha SMS / SMS.net.bd
    // Typical responses: { error: 0, msg: "SMS Sent Successfully", data: { request_id: ... } }
    // Or plain text containing 'success' / '1000'
    if (res.ok) {
      if (jsonResponse) {
        if (
          jsonResponse.error === 0 ||
          jsonResponse.status === 'success' ||
          jsonResponse.success === true ||
          jsonResponse.code === 200 ||
          jsonResponse.response_code === 200
        ) {
          return {
            success: true,
            messageId:
              jsonResponse.data?.request_id ||
              jsonResponse.request_id ||
              jsonResponse.message_id ||
              `alpha_${Date.now()}`,
          };
        }

        // Gateway returned an error object
        const errMsg =
          jsonResponse.msg ||
          jsonResponse.message ||
          jsonResponse.error_message ||
          JSON.stringify(jsonResponse);
        return {
          success: false,
          error: `Alpha SMS error: ${errMsg}`,
        };
      }

      // If text response indicates success
      if (
        responseText.toLowerCase().includes('success') ||
        responseText.toLowerCase().includes('sent') ||
        responseText.startsWith('100')
      ) {
        return {
          success: true,
          messageId: `alpha_${Date.now()}`,
        };
      }

      return {
        success: false,
        error: `Alpha SMS response: ${responseText.slice(0, 150)}`,
      };
    }

    return {
      success: false,
      error: `Alpha SMS HTTP ${res.status}: ${responseText.slice(0, 150)}`,
    };
  } catch (err: any) {
    console.error('Error sending Alpha SMS:', err);
    return {
      success: false,
      error: err?.message || 'Network error while calling Alpha SMS API',
    };
  }
}
