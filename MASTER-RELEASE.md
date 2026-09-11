# RESTBR Master — Release Handoff

هذه النسخة هي **قالب مطعم واحد**. كل زبون جديد يأخذ Repository مستقل وSupabase Project مستقل. لا تستخدم نفس قاعدة البيانات لأكثر من مطعم.

## المسار المعتمد لنسخة جديدة

1. انسخ Repository من `restbr-menu-app`.
2. أنشئ Supabase Project جديد وحساب Owner.
3. نفّذ ملفات قاعدة البيانات بالترتيب الموجود في `restbr-release-manifest.json`.
4. غيّر فقط هوية المطعم وSupabase URL وPublishable Key داخل `js/runtime-config.js`، ثم أكمل بيانات المطعم من الداشبورد.
5. اختبر السلة، تثبيت الطلب، WhatsApp، قسم الطلبات، تغيير الحالات، 100×150 وA4.
6. لا تسلّم النسخة إلا بعد نجاح GitHub Actions وLive Smoke.

## ما يجب ألا يُنسخ بين المطاعم

- Supabase Project أو مفاتيحه.
- حسابات Auth الخاصة بمطعم آخر.
- بيانات الطلبات أو الزبائن.
- الصور/Storage الخاصة بمطعم آخر.
- دومين أو إعدادات هوية مطعم آخر.

## مصدر الحقيقة

`restbr-release-manifest.json` هو manifest الإصدار الحالي، و`scripts/master-readiness-check.mjs` يحمي هذا العقد داخل CI. إذا تغيّر ترتيب قاعدة البيانات أو أضيف Runtime أساسي جديد، حدّث الـmanifest والفحص مع نفس Pull Request.

قد تبقى بعض معرفات `SHORASH_*` القديمة داخل مسارات توافق النسخ الاحتياطية/Local Storage فقط حتى لا تنكسر نسخ قديمة. هذه ليست هوية القالب النشطة ولا تُستخدم لإعداد مطعم جديد.
