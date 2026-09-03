'use client';

import { FormEvent, useState } from 'react';

const packages = [
  { id: '1', label: 'شهرين', price: 3000, note: 'الأكثر طلبًا' },
  { id: '3', label: '4 أشهر', price: 6000, note: 'للاستخدام الأطول' },
  { id: '7', label: '6 أشهر', price: 9000, note: 'قيمة أفضل' },
  { id: '9', label: 'سنة كاملة', price: 15000, note: 'راحة طوال العام' },
];

export default function HomePage() {
  const [cardNumber, setCardNumber] = useState('');
  const [subscriber, setSubscriber] = useState<{ id?: number; name: string; expiry: string; mobile?: string; days: number } | null>(null);
  const [selected, setSelected] = useState('1');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [complete, setComplete] = useState(false);

  const selectedPackage = packages.find((item) => item.id === selected) ?? packages[1];

  async function inquire(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setSubscriber(null);
    if (!cardNumber.trim()) {
      setMessage('أدخل رقم الكرت للاستعلام.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: cardNumber.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.message || 'تعذر الاستعلام عن الكرت.');
        return;
      }
      setSubscriber({
        id: result.data.id,
        name: result.data.name,
        expiry: result.data.expiry,
        mobile: result.data.mobile,
        days: result.data.days_left,
      });
    } catch {
      setMessage('تعذر الاتصال بخدمة الاستعلام.');
    } finally {
      setLoading(false);
    }
  }

  function renew() {
    if (!subscriber) {
      setMessage('استعلم عن الكرت أولًا قبل اختيار التجديد.');
      return;
    }
    setShowConfirm(true);
  }

  async function confirmRenewal() {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await fetch('/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardNumber: cardNumber.trim(),
          packageId: selectedPackage.id,
          subscriberId: subscriber?.id,
          customerName: subscriber?.name,
          phone: subscriber?.mobile,
          packageLabel: selectedPackage.label,
          amount: selectedPackage.price,
          currentExpiry: subscriber?.expiry,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.message || 'فشلت عملية التجديد.');
        return;
      }
      setComplete(true);
    } catch {
      setMessage('تعذر الاتصال بخدمة التجديد.');
    } finally {
      setLoading(false);
    }
  }

  async function sendTestSms() {
    if (!subscriber?.mobile) {
      setMessage('لا يوجد رقم جوال مسجل لهذا المشترك.');
      return;
    }
    setSendingTestSms(true);
    setMessage('');
    try {
      const response = await fetch('/sms-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: subscriber.mobile, customerName: subscriber.name }),
      });
      const result = await response.json();
      setMessage(result.message || 'تعذر إرسال الرسالة التجريبية.');
    } catch {
      setMessage('تعذر الاتصال بخدمة الرسائل.');
    } finally {
      setSendingTestSms(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">و</span><span>ستار موبايل</span></div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">خدمة إلكترونية سريعة</p>
          <h1>منظومة <em>الوادي</em></h1>
          <p className="hero-text">استعلم عن كرتك وجدد اشتراكك خلال لحظات، من مكان واحد.</p>
        </div>
        <div className="hero-seal"><span>AL</span><small>ALWADI<br />NETWORK</small></div>
      </section>

      <section className="workspace">
        <div className="section-heading"><span className="step">01</span><div><h2>استعلام عن الكرت</h2><p>أدخل رقم الكرت لمعرفة حالة الاشتراك الحالية</p></div></div>
        <form className="lookup" onSubmit={inquire}>
          <label htmlFor="card-number">رقم الكرت</label>
          <div className="input-row"><input id="card-number" inputMode="numeric" value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="مثال: 123456" /><button type="submit" disabled={loading}>{loading ? 'جارِ البحث...' : 'استعلام'}</button></div>
          <small>للمعاينة السريعة جرّب: 123456</small>
        </form>

        {subscriber && <div className="subscriber"><div className="subscriber-identity"><div className="avatar">{subscriber.name.charAt(0)}</div><div className="subscriber-name"><span>بيانات المشترك</span><strong>{subscriber.name}</strong></div></div><div className="subscriber-data"><span>تاريخ الانتهاء</span><strong>{subscriber.expiry}</strong></div><div className="subscriber-phone"><span>رقم الجوال</span><strong>{subscriber.mobile || 'غير مسجل'}</strong><button className="test-sms" onClick={sendTestSms} disabled={sendingTestSms || !subscriber.mobile}>{sendingTestSms ? 'جارِ الإرسال...' : 'إرسال رسالة تجريبية'}</button></div><div className="status"><i /> فعّال <small className="days-left">{subscriber.days} يوم متبقٍ</small></div></div>}
        {message && <div className="message">{message}</div>}

        <div className="section-heading renew-heading"><span className="step">02</span><div><h2>اختر مدة التجديد</h2><p>حدد الباقة المناسبة لاحتياجك</p></div></div>
        <div className="packages">{packages.map((item) => <button key={item.id} className={`package ${selected === item.id ? 'selected' : ''}`} onClick={() => setSelected(item.id)}><span className="radio">{selected === item.id ? '✓' : ''}</span><strong>{item.label}</strong><span>{item.note}</span><b>{item.price.toLocaleString('ar-LY')} <small>د.ل</small></b></button>)}</div>

        <div className="summary"><div><span>الباقة المختارة</span><strong>تجديد {selectedPackage.label}</strong></div><div><span>الإجمالي</span><strong className="total">{selectedPackage.price.toLocaleString('ar-LY')} <small>د.ل</small></strong></div><button className="primary" onClick={renew}>تأكيد التجديد <span>←</span></button></div>
      </section>

      <footer><span>منظومة الوادي</span><span>جميع العمليات آمنة وموثقة</span></footer>

      {showConfirm && <div className="overlay"><div className="modal"><div className="modal-icon">؟</div><h2>هل تريد تأكيد التجديد؟</h2><p>سيتم خصم <strong>{selectedPackage.price.toLocaleString('ar-LY')} د.ل</strong> لتجديد كرت <strong>{cardNumber}</strong> لمدة {selectedPackage.label}.</p><div className="modal-actions"><button onClick={() => setShowConfirm(false)} className="secondary">لا، إلغاء</button><button onClick={confirmRenewal} className="primary">نعم، أكد التجديد</button></div></div></div>}
      {complete && <div className="overlay"><div className="modal success-modal"><div className="success-icon">✓</div><p className="eyebrow">تمت العملية بنجاح</p><h2>تم تجديد الاشتراك</h2><p>تم تسجيل تجديد كرت <strong>{cardNumber}</strong> لمدة {selectedPackage.label} بنجاح.</p><button className="primary" onClick={() => setComplete(false)}>متابعة</button></div></div>}
    </main>
  );
}
