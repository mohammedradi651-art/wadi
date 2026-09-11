'use client';

import { FormEvent, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [loadingLabel, setLoadingLabel] = useState('جارِ المعالجة...');
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
    setLoadingLabel('جارِ الاستعلام عن الكرت...');
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
    setLoadingLabel('جارِ تجديد الاشتراك...');
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

  // Animation variants
  const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
  const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };

  return (
    <main className="shell">
      <section className="workspace" style={{ paddingTop: '60px' }}>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <div className="section-heading">
            <span className="step">01</span>
            <div>
              <h2>استعلام عن الكرت</h2>
              <p>أدخل رقم الكرت لمعرفة حالة الاشتراك الحالية</p>
            </div>
          </div>
          
          <form className="lookup" onSubmit={inquire}>
            <label htmlFor="card-number">رقم الكرت</label>
            <div className="input-row">
              <input 
                id="card-number" 
                inputMode="numeric" 
                value={cardNumber} 
                onChange={(event) => setCardNumber(event.target.value)} 
                placeholder="رقم الكرت" 
              />
              <button type="submit" disabled={loading}>
                {loading ? 'جارِ البحث...' : 'استعلام'}
              </button>
            </div>
          </form>
        </motion.div>

        <AnimatePresence>
          {message && (
            <motion.div 
              className="message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {subscriber && (
            <motion.div 
              className={`subscriber-card ${subscriber.days <= 10 ? 'danger-mode' : 'success-mode'}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            >
              <div className="sc-header">
                <div className="sc-identity">
                  <div className="sc-avatar">{subscriber.name.charAt(0)}</div>
                  <div className="sc-name">
                    <span>المشترك</span>
                    <strong>{subscriber.name}</strong>
                  </div>
                </div>
                <div className="sc-status-badge">
                  <i className="pulse-dot"></i>
                  {subscriber.days <= 0 ? 'منتهي' : subscriber.days <= 10 ? 'قارب على الانتهاء' : 'فعّال'}
                </div>
              </div>

              <div className="sc-body">
                <div className="sc-days">
                  <strong>{subscriber.days}</strong>
                  <span>يوم متبقٍ</span>
                </div>
                
                <div className="sc-details">
                  <div className="sc-detail-item">
                    <span>تاريخ الانتهاء</span>
                    <strong>{subscriber.expiry}</strong>
                  </div>
                  <div className="sc-detail-item">
                    <span>رقم الجوال</span>
                    <strong dir="ltr">{subscriber.mobile || 'غير مسجل'}</strong>
                  </div>
                </div>
              </div>

              <div className="sc-footer">
                <button 
                  className="sc-test-btn" 
                  onClick={sendTestSms} 
                  disabled={sendingTestSms || !subscriber.mobile}
                >
                  <span className="icon">✉</span>
                  {sendingTestSms ? 'جارِ الإرسال...' : 'إرسال رسالة تجريبية'}
                </button>
                <div className="sc-watermark">VIP MEMBER</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="section-heading renew-heading"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <span className="step">02</span>
          <div>
            <h2>اختر مدة التجديد</h2>
            <p>حدد الباقة المناسبة لاحتياجك</p>
          </div>
        </motion.div>

        <motion.div 
          className="packages"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {packages.map((item) => (
            <motion.div
              key={item.id} 
              variants={fadeIn}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className={`package ${selected === item.id ? 'selected' : ''}`} 
              onClick={() => setSelected(item.id)}
            >
              <span className="radio">{selected === item.id ? '✓' : ''}</span>
              <strong>{item.label}</strong>
              <span>{item.note}</span>
              <b>{item.price.toLocaleString('ar-LY')} <small>ريال يمني</small></b>
            </motion.div>
          ))}
        </motion.div>

        <motion.div 
          className="summary"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div>
            <span>الباقة المختارة</span>
            <strong>تجديد {selectedPackage.label}</strong>
          </div>
          <div>
            <span>الإجمالي</span>
            <strong className="total">{selectedPackage.price.toLocaleString('ar-LY')} <small>ريال</small></strong>
          </div>
          <button className="primary-btn" onClick={renew} disabled={loading}>
            {loading ? 'جارِ التنفيذ...' : <>تأكيد التجديد <span>←</span></>}
          </button>
        </motion.div>
      </section>

      <footer>
        <span>منظومة الوادي للبث الرقمي</span>
        <span>جميع العمليات آمنة وموثقة بتقنية التشفير</span>
      </footer>

      <AnimatePresence>
        {loading && (
          <motion.div
            className="overlay loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="loading-box"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <motion.div
                className="loading-spinner"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              />
              <strong>{loadingLabel}</strong>
              <span>يرجى الانتظار لحظات</span>
            </motion.div>
          </motion.div>
        )}

        {showConfirm && (
          <motion.div 
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="modal-content">
                <div className="modal-icon">؟</div>
                <h2>تأكيد التجديد</h2>
                <p>سيتم خصم <strong>{selectedPackage.price.toLocaleString('ar-LY')} ريال</strong> لتجديد كرت <strong>{cardNumber}</strong> لمدة {selectedPackage.label}.</p>
                <div className="modal-actions">
                  <button onClick={() => setShowConfirm(false)} className="secondary-btn">لا، إلغاء</button>
                  <button onClick={confirmRenewal} className="primary-btn">نعم، أكد التجديد</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {complete && (
          <motion.div 
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal success-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="modal-content">
                <motion.div 
                  className="success-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                >
                  ✓
                </motion.div>
                <p className="eyebrow" style={{ color: 'var(--success)' }}>تمت العملية بنجاح</p>
                <h2>تم تجديد الاشتراك</h2>
                <p>تم تسجيل تجديد كرت <strong>{cardNumber}</strong> لمدة {selectedPackage.label} بنجاح.</p>
                <button className="primary-btn" style={{ width: '100%' }} onClick={() => setComplete(false)}>متابعة</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
