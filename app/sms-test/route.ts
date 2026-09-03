import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phone, customerName } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, message: 'رقم الجوال غير موجود.' }, { status: 400 });
    }

    const response = await fetch('https://star-sms.vercel.app/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'STAR-OTP-770326828'
      },
      body: JSON.stringify({
        phone: String(phone).trim(),
        message: `رسالة تجريبية من منظومة الوادي.\n\nالاسم: ${customerName || 'العميل'}\nتم اختبار خدمة الرسائل بنجاح.`
      })
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, message: 'فشل إرسال الرسالة التجريبية.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'تم إرسال الرسالة التجريبية بنجاح.' });
  } catch (error) {
    console.error('Test SMS Error:', error);
    return NextResponse.json({ success: false, message: 'تعذر الاتصال بخدمة الرسائل.' }, { status: 500 });
  }
}
