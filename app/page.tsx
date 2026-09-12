'use client';

import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const packages = [
  { id: '1', label: 'شهرين', price: 3000 },
  { id: '3', label: '4 أشهر', price: 6000 },
  { id: '7', label: '6 أشهر', price: 9000 },
  { id: '9', label: 'سنة كاملة', price: 15000 },
];

const banks = [
  { id: 'al-amqi', label: 'شركة العمقي للصرافة', account: '254157699', logo: '/m.png', hint: 'رقم حسابك في العمقي', placeholder: '25000000' },
  { id: 'alkuraimi', label: 'بنك الكريمي', account: '1055518', logo: '/k.webp', hint: 'رقم العملية', placeholder: 'أدخل رقم العملية' },
];

type Subscriber = { id?: number; name: string; expiry: string; days: number | string };
type Deposit = { id?: string | number; senderName?: string; identifier?: string | number; reference?: string | number; amount?: number; bank?: string; date?: string; status?: string };

const formatNumber = (value: number) => value.toLocaleString('en-US');
const formatDays = (value: number | string) => typeof value === 'number' ? Math.max(0, value).toLocaleString('en-US') : value;

const formatBankLabel = (value?: string) => {
  const bank = String(value ?? '').toLowerCase();

  if (bank.includes('alomqy') || bank.includes('al-amqi') || bank.includes('mash')) return 'العمقي';
  if (bank.includes('kuraimi') || bank.includes('الكريمي')) return 'الكريمي';

  return value || 'البنك';
};

const getPackageByAmount = (amount?: number | string) => {
  const formattedAmount = Number(amount);
  if (!Number.isFinite(formattedAmount)) return null;

  return packages.find((item) => item.price === formattedAmount) ?? null;
};

export default function HomePage() {
  const [cardNumber, setCardNumber] = useState('');
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [selected, setSelected] = useState('1');
  const [selectedBank, setSelectedBank] = useState('al-amqi');
  const [bankValue, setBankValue] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('جارِ المعالجة...');
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [complete, setComplete] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [renewalConfirmationOpen, setRenewalConfirmationOpen] = useState(false);

  const selectedPackage = packages.find((item) => item.id === selected) ?? packages[0];
  const bank = banks.find((item) => item.id === selectedBank) ?? banks[0];
  const isSuccessMessage = message.startsWith('تمت مطابقة');

  async function copyAccount() {
    await navigator.clipboard.writeText(bank.account);
    setCopiedAccount(true);
    window.setTimeout(() => setCopiedAccount(false), 1800);
  }

  async function inquire(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setSubscriber(null);
    setDeposit(null);
    if (!cardNumber.trim()) {
      setMessage('أدخل رقم الكرت للاستعلام.');
      return;
    }
    setLoadingLabel('جارِ الاستعلام عن الكرت...');
    setLoading(true);
    try {
      const response = await fetch('/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: cardNumber.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.message || 'تعذر الاستعلام عن الكرت.');
        return;
      }
      setSubscriber({ id: result.data.id, name: result.data.name, expiry: result.data.expiry, days: result.data.days_left });
    } catch {
      setMessage('تعذر الاتصال بخدمة الاستعلام.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyDeposit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setDeposit(null);
    if (!subscriber) {
      setMessage('استعلم عن الكرت أولًا.');
      return;
    }
    if (!bankValue.trim()) {
      setMessage(`أدخل ${bank.hint}.`);
      return;
    }
    setLoadingLabel('جارِ مطابقة الإيداع...');
    setLoading(true);
    try {
      const response = await fetch('/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: cardNumber.trim(), subscriberName: subscriber.name, bank: bank.label, bankId: bank.id, reference: bankValue.trim(), amount: selectedPackage.price, packageLabel: selectedPackage.label }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.message || 'لم يتم العثور على إيداع مطابق.');
        return;
      }

      const matchedPackage = getPackageByAmount(result.deposit?.amount);
      if (matchedPackage) {
        setSelected(matchedPackage.id);
      }

      setDeposit(result.deposit);
      setMessage('');
    } catch {
      setMessage('تعذر الاتصال بخدمة مطابقة الإيداعات.');
    } finally {
      setLoading(false);
    }
  }

  function openRenewalConfirmation() {
    if (!subscriber || !deposit) return;
    setRenewalConfirmationOpen(true);
  }

  async function confirmRenewal() {
    if (!subscriber || !deposit) return;

    const renewalPackage = getPackageByAmount(deposit.amount) ?? selectedPackage;

    setRenewalConfirmationOpen(false);
    setLoadingLabel('جارِ تسجيل التجديد...');
    setLoading(true);
    try {
      const response = await fetch('/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNumber: cardNumber.trim(), packageId: renewalPackage.id, subscriberId: subscriber.id, customerName: subscriber.name, packageLabel: renewalPackage.label, amount: renewalPackage.price, currentExpiry: subscriber.expiry, paymentReference: bankValue.trim(), paymentBank: bank.label, depositId: deposit.id }),
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

  return (
    <main className="site-shell">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-brand">
            <img src="/LOGO.png" alt="شعار منظومة الوادي" />
            <h1>استعلم عن اشتراكك<br /><em>وسدّد كرتك بضغطة زر</em></h1>
          </div>
        </div>
        <div className="hero-orbit"><div><strong>24/7</strong><span>خدمة إلكترونية</span></div></div>
      </section>

      <section className="content-grid">
        <div className="main-column">
          <form className="lookup" onSubmit={inquire}>
            <label htmlFor="card-number">رقم الكرت</label>
            <div className="input-row"><input id="card-number" inputMode="numeric" pattern="[0-9]*" value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, ''))} placeholder="ادخل رقم الكرت" /><button type="submit" disabled={loading}>استعلام عن الكرت</button></div>
          </form>

          <AnimatePresence>
            {message && isSuccessMessage && <motion.div className="message message-success" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{message}</motion.div>}
          </AnimatePresence>

          <AnimatePresence>
            {subscriber && <motion.div className={`subscriber-card ${typeof subscriber.days === 'number' && subscriber.days <= 10 ? 'danger-mode' : ''}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <div className="sc-header"><div className="sc-identity"><div className="sc-avatar">{subscriber.name.charAt(0)}</div><div><span>بيانات المشترك</span><strong>{subscriber.name}</strong></div></div></div>
              <div className="sc-body"><div className="sc-stat"><span>المدة المتبقية</span><strong>{formatDays(subscriber.days)} <small>يوم</small></strong></div><div className="sc-stat"><span>تاريخ الانتهاء</span><strong>{subscriber.expiry}</strong></div></div>
              {typeof subscriber.days === 'number' && subscriber.days <= 0 && <div className="expiry-warning">لقد انتهت صلاحية الكرت</div>}
              {Number(subscriber.days) > 0 && <div className="active-warning">كرتك فعال</div>}
            </motion.div>}
          </AnimatePresence>

          <div className="section-heading section-gap"><span className="step">02</span><div><h2>اختر باقة التجديد</h2></div></div>
          <div className="package-select-wrap">
            <div className="package-select-label"><label htmlFor="renewal-package">الباقة المطلوبة</label></div>
            <div className="package-select-control">
              <select id="renewal-package" className="package-select" value={selected} onChange={(event) => { setSelected(event.target.value); setDeposit(null); }}>
                {packages.map((item) => <option key={item.id} value={item.id}>{item.label} - {formatNumber(item.price)} ريال</option>)}
              </select>
            </div>
          </div>

          <div className="payment-panel">
            <div className="section-heading"><span className="step">03</span><div><h2>تحقق من الإيداع</h2><p>{bank.id === 'al-amqi' ? 'اختر المصرف الذي أودعت فيه ثم أدخل رقم حسابك' : 'اختر البنك الذي أودعت فيه ثم أدخل رقم العملية'}</p></div></div>
            <div className="bank-list">{banks.map((item) => <button type="button" key={item.id} className={`bank-option bank-option-${item.id} ${selectedBank === item.id ? 'selected' : ''}`} onClick={() => { setSelectedBank(item.id); setBankValue(''); setDeposit(null); }}><span className="bank-icon"><img src={item.logo} alt="" /></span><strong>{item.label}</strong><span className="bank-check">{selectedBank === item.id ? '✓' : ''}</span></button>)}</div>
            <div className="account-display"><strong dir="ltr">{bank.account}</strong><button type="button" className="copy-account" onClick={copyAccount}>{copiedAccount ? 'تم النسخ ✓' : 'نسخ رقم الحساب'}</button></div>
            <form onSubmit={verifyDeposit} className="deposit-form"><label htmlFor="bank-reference">{bank.hint}</label><input id="bank-reference" dir="rtl" inputMode="numeric" pattern="[0-9]*" value={bankValue} onChange={(event) => setBankValue(event.target.value.replace(/\D/g, ''))} placeholder={bank.placeholder} /><button className="primary-btn" type="submit" disabled={loading || !subscriber}>تأكيد مطابقة الإيداع</button></form>
          </div>

          {deposit && <motion.div className="deposit-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><div className="deposit-result-title"><span>✓</span><div><strong>تم مطابقة الإيداع</strong></div></div><div className="deposit-details"><span>البنك<strong>{formatBankLabel(deposit.bank || bank.label)}</strong></span><span>المبلغ<strong>{formatNumber(Number(deposit.amount))} ريال</strong></span><span>الرقم<strong>{deposit.identifier || deposit.reference || bankValue}</strong></span></div><button className="primary-btn" onClick={openRenewalConfirmation} disabled={loading}>تأكيد السداد والتجديد</button></motion.div>}
        </div>

      </section>

      <AnimatePresence>{message && !isSuccessMessage && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="modal error-modal" initial={{ opacity: 0, scale: .88, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .94, y: 10 }} transition={{ type: 'spring', stiffness: 280, damping: 22 }}><div className="error-icon">!</div><p>{message}</p><button className="primary-btn" onClick={() => setMessage('')}>إغلاق</button></motion.div></motion.div>}{loading && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="loading-box"><div className="loading-spinner" /><strong>{loadingLabel}</strong><span>يرجى الانتظار لحظات</span></div></motion.div>}{renewalConfirmationOpen && deposit && subscriber && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="modal" initial={{ opacity: 0, scale: .9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .95, y: 10 }}><div className="success-icon">?</div><span className="eyebrow">تأكيد التجديد</span><h2>هل تريد تأكيد السداد والتجديد؟</h2><div className="confirmation-details"><div><span>اسم المشترك</span><strong>{subscriber.name}</strong></div><div><span>رقم الكرت</span><strong dir="ltr">{cardNumber}</strong></div><div><span>الباقة</span><strong>{(getPackageByAmount(deposit.amount) ?? selectedPackage).label}</strong></div><div><span>المبلغ المودع</span><strong>{formatNumber(Number(deposit.amount))} ريال</strong></div></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setRenewalConfirmationOpen(false)}>إلغاء</button><button type="button" className="primary-btn" onClick={confirmRenewal}>تأكيد السداد والتجديد</button></div></motion.div></motion.div>}{complete && <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="modal"><div className="success-icon">✓</div><span className="eyebrow">تمت العملية بنجاح</span><h2>تم تجديد الاشتراك</h2><p>تم تسجيل تجديد كرت <strong>{cardNumber}</strong> لمدة {selectedPackage.label} بنجاح.</p><button className="primary-btn" onClick={() => setComplete(false)}>متابعة</button></div></motion.div>}</AnimatePresence>
    </main>
  );
}
