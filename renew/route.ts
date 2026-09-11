import { NextResponse } from 'next/server';
import xmlrpc from 'xmlrpc';

const url = "api.alwaadi.net";
const db = "alwaadi_DB";
const USERNAME = "770326M";
const PASSWORD = "770326828moh";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { cardNumber, packageId, subscriberId, customerName, phone, packageLabel, amount, currentExpiry } = body;

    if (!cardNumber || !packageId) {
      return NextResponse.json({ success: false, message: "بيانات الطلب غير مكتملة." }, { status: 400 });
    }

    const common = xmlrpc.createSecureClient({ host: url, port: 443, path: '/xmlrpc/2/common' });
    
    const uid: any = await new Promise((resolve, reject) => {
      common.methodCall("authenticate", [db, USERNAME, PASSWORD, {}], (err: any, value: any) => {
          if (err) reject(err); else resolve(value);
      });
    });

    if (!uid || typeof uid !== 'number') {
        return NextResponse.json({ success: false, message: "فشل التوثيق مع السيرفر." }, { status: 401 });
    }

    const models = xmlrpc.createSecureClient({ host: url, port: 443, path: '/xmlrpc/2/object' });

    const createData: any = {
        "num_card": cardNumber,
        "renewal_categories": parseInt(packageId)
    };

    if (subscriberId) {
        createData["subscriber"] = parseInt(subscriberId);
    }

    const createResult: any = await new Promise((resolve, reject) => {
        models.methodCall("execute_kw", [
            db, uid, PASSWORD, "renewal.proces", "create",
            [createData]
        ], (err: any, value: any) => {
            if (err) reject(err); else resolve(value);
        });
    });

    if (createResult) {
      let newExpiry = currentExpiry || "غير محدد";
      try {
        const createdRecord = await new Promise<any>((resolve, reject) => {
          models.methodCall("execute_kw", [
            db, uid, PASSWORD, "renewal.proces", "read",
            [[createResult]],
            { fields: ["expiry_date"] }
          ], (err: any, value: any) => {
            if (err) reject(err); else resolve(value?.[0]);
          });
        });
        newExpiry = createdRecord?.expiry_date || newExpiry;
      } catch (readError) {
        console.warn("تعذر قراءة تاريخ الانتهاء الجديد.", readError);
      }

      let smsSent = false;
      if (phone) {
        const smsResponse = await fetch("https://star-sms.vercel.app/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": "STAR-OTP-770326828"
          },
          body: JSON.stringify({
            phone: String(phone).trim(),
            message: `تم تجديد كرت منظومة الوادي بنجاح.\n\nالاسم: ${customerName || "غير محدد"}\nالفئة: ${packageLabel || "غير محددة"}\nالمبلغ: ${amount || "غير محدد"} ريال\n\nشكرًا لاختياركم ستار ميديا 💙`
          })
        });
        smsSent = smsResponse.ok;
        if (!smsSent) console.warn("فشل إرسال رسالة التجديد.", await smsResponse.text());
      }

      return NextResponse.json({
        success: true,
        smsSent,
        message: "تم تسجيل التجديد في المنظومة بنجاح."
      });
    }

    return NextResponse.json({ success: false, message: "فشل إنشاء سجل التجديد في المنظومة." });

  } catch (error: any) {
    console.error("Renewal Error:", error);
    return NextResponse.json({ success: false, message: error.message || "حدث خطأ غير متوقع أثناء الاتصال بالمنظومة." }, { status: 500 });
  }
}
