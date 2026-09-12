import { NextResponse } from 'next/server';

const ADMIN_PHONE = '770326828';
const DEPOSITS_ENDPOINT = 'https://star26.vercel.app/api/external/v1/deposits';

type ExternalDeposit = {
  id?: string | number;
  amount?: string | number;
  bank?: string;
  identifier?: string | number;
  status?: string;
  date?: string;
};

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '');
}

function isSupportedBank(depositBank: unknown, bankId: string) {
  const bank = normalize(depositBank);
  if (bankId === 'al-amqi') {
    return bank.includes('mashqas') || bank.includes('mashaqis') || bank.includes('مشاقص') || bank.includes('العمقي');
  }
  return bank.includes('kuraimi') || bank.includes('الكريمي');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cardNumber, subscriberName, bank, bankId, reference, amount, packageLabel } = body;

    if (!cardNumber || !bankId || !reference || !amount) {
      return NextResponse.json({ success: false, message: 'بيانات المطابقة غير مكتملة.' }, { status: 400 });
    }

    const masterApiKey = process.env.MASTER_API_KEY;
    if (!masterApiKey) {
      return NextResponse.json({ success: false, message: `خدمة مطابقة الإيداعات غير مفعلة حاليًا. تواصل مع الإدارة على ${ADMIN_PHONE}.` }, { status: 503 });
    }

    const query = new URLSearchParams({ limit: '100', status: 'unpaid' });
    const depositsResponse = await fetch(`${DEPOSITS_ENDPOINT}?${query.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${masterApiKey}` },
      cache: 'no-store',
    });

    if (!depositsResponse.ok) {
      return NextResponse.json({ success: false, message: 'تعذر الاتصال بخدمة مطابقة الإيداعات.' }, { status: 502 });
    }

    const result = await depositsResponse.json();
    const deposits: ExternalDeposit[] = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    const inputIdentifier = normalize(reference);
    const deposit = deposits.find((item) => isSupportedBank(item.bank, bankId) && normalize(item.identifier) === inputIdentifier && Number(item.amount) === Number(amount));

    if (!deposit) {
      return NextResponse.json({ success: false, message: `لم يتم العثور على إيداع مطابق. تواصل مع الإدارة على ${ADMIN_PHONE}.` }, { status: 404 });
    }

    if (Number(deposit.amount) !== Number(amount)) {
      return NextResponse.json({ success: false, message: `المبلغ غير صحيح، تواصل مع الإدارة على ${ADMIN_PHONE}.` }, { status: 422 });
    }

    return NextResponse.json({ success: true, deposit: { ...deposit, id: deposit.id, bank: deposit.bank || bank, amount: Number(deposit.amount), reference: deposit.identifier } });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء مطابقة الإيداع.' }, { status: 500 });
  }
}
