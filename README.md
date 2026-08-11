# CryptoXai - منصة إدارة تداول العملات الرقمية

**الإصدار:** v0.2.0  
**آخر تحديث:** 11 أغسطس 2026  
**الحالة:** 🚧 في مرحلة التطوير النشط (MVP)

---

## 📋 جدول المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [ما تم بناؤه (v0.2.0)](#ما-تم-بناؤه-v020)
3. [التعليمات السريعة](#التعليمات-السريعة)
4. [البنية والمكونات](#البنية-والمكونات)
5. [متغيرات البيئة](#متغيرات-البيئة)
6. [الخطوات التالية](#الخطوات-التالية)
7. [خريطة الطريق](#خريطة-الطريق)
8. [استكشاف الأخطاء](#استكشاف-الأخطاء)

---

## 🎯 نظرة عامة

منصة ويب متقدمة لإدارة استراتيجيات التداول الآلي على Binance. تدعم نظام أدوار متعدد (super_admin, admin, trade_supervisor, client) مع توثيق شامل وتشفير الحساسيات.

**التقنيات المستخدمة:**
- Frontend: Next.js 15.5 + React 19 + TypeScript
- Backend: Node.js (Server Actions) + Python (Worker)
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Hosting: Vercel (Frontend) + Custom (Worker)
- Localization: عربي/إنجليزي (RTL/LTR)

---

## ✅ ما تم بناؤه (v0.2.0)

### الأساسيات المكتملة

#### 🔐 نظام المصادقة والتفويض
- ✅ تسجيل حساب آمن عبر Supabase Auth
- ✅ تسجيل دخول مع أمان عالي
- ✅ استعادة كلمة المرور
- ✅ نظام أدوار متقدم (4 أدوار)
- ✅ سجل تدقيق شامل لتغييرات الأدوار
- ✅ توجيه ذكي حسب الدور بعد تسجيل الدخول

#### 💳 إدارة المحافظ والرؤوس المال
- ✅ ربط حساب Binance API
- ✅ التحقق من بيانات الحساب
- ✅ تشفير مفاتيح API (KMS)
- ✅ التحقق من الحد الأدنى لرأس المال (USDT)
- ✅ عرض رصيد المحفظة المتحقق

#### 📊 لوحة المعلومات الأساسية
- ✅ عرض معلومات الملف الشخصي
- ✅ حالة اتصال Binance
- ✅ عرض رصيد USDT المتحقق
- ✅ سجل الصفقات المباشر (آخر 20 صفقة)
- ✅ عرض الخطة المشتركة الحالية
- ✅ زر تسجيل الخروج

#### ⚙️ إدارة المسؤولين
- ✅ صفحة تعيين الأدوار (admin/super_admin فقط)
- ✅ واجهة تعيين المشرفين على الخطط
- ✅ قائمة المستخدمين مع أدوارهم

#### 🌐 الدعم متعدد اللغات
- ✅ إنجليزي كامل
- ✅ عربي كامل مع RTL
- ✅ التبديل السلس بين اللغات

#### 🐍 Backend Worker (Python)
- ✅ تكامل Binance API كامل
- ✅ محرك تنفيذ الصفقات
- ✅ قاطع الدارة (Circuit Breaker) لحماية من الخسائر
- ✅ مصالح البيانات (Reconciliation)
- ✅ إدارة الإعدادات
- ✅ إدارة مفاتيح التشفير (KMS)

#### 🗄️ قاعدة البيانات
- ✅ Schema كامل مع RLS
- ✅ جداول: users, subscriptions, plans, orders, role_assignments
- ✅ سياسات أمان صفية (Row Level Security)

#### 🔧 الإصلاحات المطبّقة (v0.2.0)
1. **middleware.ts** - استثناء `/auth/callback` من locale prefix
2. **lib/supabase/server.ts** - تثبيت الجلسة صحيحاً مع getAll/setAll
3. **lib/actions/auth.ts** - توجيه ذكي للمستخدمين حسب أدوارهم

---

## 🚀 التعليمات السريعة

### المتطلبات
- Node.js 18+
- npm أو yarn
- حساب Supabase نشط
- حساب Vercel (للنشر)
- Python 3.9+ (للـ Worker)

### التشغيل المحلي

```bash
# 1. استنساخ أو فك ضغط المشروع
git clone https://github.com/khbm0110/cryptoxai.git
cd cryptoxai

# 2. تثبيت المكتبات
npm install

# 3. إعداد متغيرات البيئة
cp .env.local.example .env.local
# عدّل .env.local وأضف:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_SITE_URL (http://localhost:3000)
# - BINANCE_KEYS_MASTER_KEY

# 4. التشغيل المحلي
npm run dev
# الآن يمكنك زيارة http://localhost:3000

# 5. البناء للإنتاج
npm run build
npm run start
```

### الاختبار السريع
1. انتقل إلى http://localhost:3000/en/register
2. أنشئ حساباً جديداً
3. تأكد بريدك الإلكتروني
4. سجّل دخولك وتحقق من التوجيه لـ `/en/dashboard`

---

## 🏗️ البنية والمكونات

```
cryptoxai/
├── app/                           # Next.js app directory
│   ├── [locale]/                  # Dynamic locale routing
│   │   ├── login/                 # صفحة تسجيل الدخول
│   │   ├── register/              # صفحة التسجيل
│   │   ├── dashboard/             # لوحة المستخدم
│   │   ├── admin/roles/           # إدارة الأدوار (admin+)
│   │   ├── settings/binance/      # إعدادات Binance
│   │   ├── plans/                 # عرض الخطط
│   │   └── layout.tsx             # الـ layout الرئيسي
│   ├── auth/callback/             # OAuth callback
│   └── globals.css                # CSS عام
│
├── lib/                           # مكتبات وـ utilities
│   ├── actions/                   # Server Actions
│   │   ├── auth.ts                # تسجيل/دخول/logout
│   │   ├── admin.ts               # عمليات إدارية
│   │   ├── binance.ts             # عمليات Binance
│   │   ├── subscriptions.ts       # إدارة الاشتراكات
│   │   └── types.ts               # الأنواع المشتركة
│   ├── supabase/
│   │   ├── server.ts              # عميل Supabase (سيرفر)
│   │   └── client.ts              # عميل Supabase (متصفح)
│   ├── binance/                   # تكامل Binance
│   └── crypto/                    # التشفير والأمان
│
├── components/                    # React Components
│   ├── auth/                      # مكونات المصادقة
│   ├── admin/                     # مكونات الإدارة
│   ├── site/                      # مكونات عامة
│   └── ui/                        # مكونات UI أساسية
│
├── messages/                      # ترجمات i18n
│   ├── en.json                    # الإنجليزية
│   └── ar.json                    # العربية
│
├── worker/                        # Python Worker
│   ├── binance_client.py          # عميل Binance
│   ├── executor.py                # منفذ الصفقات
│   ├── reconciler.py              # مصالح البيانات
│   ├── circuit_breaker.py         # حماية من الخسائر
│   └── main.py                    # نقطة الدخول
│
├── db/
│   └── schema.sql                 # Schema قاعدة البيانات
│
├── middleware.ts                  # Next.js middleware (i18n)
├── i18n.config.ts                 # إعدادات i18n
├── package.json                   # المكتبات والـ scripts
└── README.md                      # هذا الملف
```

---

## 🔐 متغيرات البيئة

### مطلوبة في `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # أو رابط الإنتاج

# Security
BINANCE_KEYS_MASTER_KEY=your-secret-key-for-kms
```

### شرح كل متغير
| المتغير | الوصف | مثال |
|---------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | رابط Supabase API | `https://abcdef.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح Supabase العام | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح Supabase الخاص (سري!) | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_SITE_URL` | رابط الموقع (للـ redirects) | `http://localhost:3000` |
| `BINANCE_KEYS_MASTER_KEY` | مفتاح التشفير الرئيسي | `my-super-secret-key` |

---

## 🎯 الخطوات التالية (المتجقي)

### الأسبوع الأول - عاجل 🔴

#### 1. نظام الدفع (USDT Gateway)
```
الملف: lib/actions/subscriptions.ts (بدء تطبيق)
المطلوب:
- توليد عنوان محفظة USDT للدفع
- التحقق من استلام الدفع (polling/webhook)
- تفعيل الاشتراك تلقائياً عند الدفع
- إضافة محفظة الموقع (wallet address)
الوقت المتوقع: 3-4 أيام
```

#### 2. Telegram Integration
```
الملف: lib/actions/telegram.ts (جديد)، worker/telegram_bot.py (جديد)
المطلوب:
- إنشاء Telegram Bot
- ربط Bot بالموقع عبر webhook
- إنشاء قنوات خاصة للمستخدمين تلقائياً
- إرسال إشعارات الصفقات
الوقت المتوقع: 2-3 أيام
```

#### 3. Logging/Monitoring
```
الملفات: lib/logger.ts (جديد)، middleware.ts (تعديل)
المطلوب:
- Centralized logging (مثلاً: Winston أو Pino)
- تسجيل جميع الأخطاء والتحذيرات
- إرسال الأخطاء الحرجة إلى Slack/Email
- موشرات الأداء الأساسية
الوقت المتوقع: 1-2 يوم
```

### الأسبوع الثاني - مهم 🟠

#### 4. Trade Supervisor Dashboard
```
الملف: app/[locale]/supervisor/page.tsx (جديد)
المطلوب:
- صفحة خاصة لمشرفي الصفقات
- واجهة نشر الإشارات (publish signals)
- إدارة الخطط المرتبطة
- عرض إحصائيات الصفقات
الوقت المتوقع: 3-4 أيام
```

#### 5. Admin Dashboard الموسّع
```
الملفات: app/[locale]/admin/* (تعديل وإضافة)
المطلوب:
- إدارة المستخدمين (تفعيل/تعطيل)
- إدارة الخطط والأسعار
- تقارير مالية
- إحصائيات عامة
الوقت المتوقع: 4-5 أيام
```

#### 6. Unit Tests
```
الملفات: __tests__/* (جديد)
المطلوب:
- اختبارات auth
- اختبارات Binance integration
- اختبارات database queries
- اختبارات Server Actions
الوقت المتوقع: 3-4 أيام
```

---

## 📍 خريطة الطريق

### المرحلة الأولى: MVP (الآن - سبتمبر 2026) 🎯
**الهدف:** إطلاق النسخة الأولى من المنصة

```
✅ v0.2.0  (الحالي)
├─ Core auth & roles
├─ Binance integration
├─ Basic dashboard
└─ Admin roles management

🚧 v0.3.0 (next) - الدفع والتنبيهات
├─ USDT payment gateway
├─ Telegram bot integration
├─ Error logging/monitoring
└─ Supervisor dashboard

📋 v0.4.0 - الاختبار والاستقرار
├─ Unit & integration tests
├─ Admin dashboard v2
├─ Performance optimization
└─ Security audit
```

### المرحلة الثانية: Expansion (أكتوبر - نوفمبر 2026)
```
🔮 v1.0.0 - الإطلاق الرسمي
├─ Multi-strategy support
├─ Advanced analytics dashboard
├─ Mobile app (React Native)
├─ API public للعملاء الخارجيين
└─ 24/7 monitoring & support
```

### المرحلة الثالثة: Scale (ديسمبر 2026+)
```
🌟 v2.0.0 - النمو والعالمية
├─ Support for other exchanges
├─ Machine learning predictions
├─ DeFi integrations
├─ White-label solution
└─ Institutional clients
```

---

## 📝 معايير التطوير

### قبل كتابة أي كود:
1. ✅ فتح issue في GitHub شارحاً المتطلب
2. ✅ مراجعة code style (TypeScript strict mode)
3. ✅ كتابة اختبارات (لا أقل من 70% coverage)
4. ✅ توثيق التغييرات في CHANGELOG

### Commit messages
```
format: [type](scope): description

types: feat, fix, docs, style, refactor, test, chore
example: feat(auth): add email verification flow
```

### PR checklist
- [ ] تمت اختبارة المتطلبات
- [ ] تم تحديث التوثيق
- [ ] لا errors في TypeScript
- [ ] تم فحص الأمان

---

## 🐛 استكشاف الأخطاء

### المشكلة: "Session is undefined"
**السبب:** الجلسة لم تُحفظ بشكل صحيح  
**الحل:** تأكد من:
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` صحيح
- ✅ cookies مفعّلة بالمتصفح
- ✅ `lib/supabase/server.ts` فيه getAll/setAll

### المشكلة: "auth.callback redirect loop"
**السبب:** Locale middleware يعترض `/auth/callback`  
**الحل:** تأكد من:
- ✅ `middleware.ts` فيه `auth/callback` في matcher exceptions

### المشكلة: "Module not found: @/supabase"
**السبب:** مشاكل في import paths  
**الحل:**
```bash
npm install
npm run dev
# إذا استمرت: rm -rf .next node_modules && npm install
```

### المشكلة: Binance API "Invalid signature"
**السبب:** مفاتيح API غير صحيحة أو timestamp خاطئ  
**الحل:**
- ✅ تحقق من صحة المفاتيح في Binance dashboard
- ✅ تأكد من توقيت السيرفر (NTP sync)
- ✅ جرّب الـ testnet أولاً

---

## 📞 الدعم والتواصل

- **Issues:** ارفع issue على GitHub
- **Discussions:** استخدم GitHub Discussions
- **Email:** support@cryptoxai.dev
- **Slack:** [رابط الـ workspace]

---

## 📄 الترخيص

proprietary © 2026 CryptoXai. جميع الحقوق محفوظة.

---

## 🎉 شكراً!

شكراً لاستخدام CryptoXai. نتطلع لتطورك معنا! 🚀

