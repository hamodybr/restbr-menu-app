# إعداد نسخة مطعم جديدة من RESTBR Master

هذه النسخة مخصصة لمطعم واحد فقط. لكل مطعم جديد يجب إنشاء نسخة مستقلة وقاعدة بيانات مستقلة.

## 1. انسخ الماستر

أنشئ Repository جديدًا من `hamodybr/restbr-menu-app` ولا تعمل مباشرة على الماستر بعد ذلك.

## 2. أنشئ Supabase خاصًا بالمطعم

1. أنشئ Project جديدًا.
2. من Authentication > Users أنشئ حساب صاحب المطعم وفعّل بريده.
3. افتح SQL Editor.
4. شغّل `supabase/bootstrap.sql` كاملًا مرة واحدة.
5. بعده شغّل `supabase/migrations/20260911171000_generic_product_colors.sql` مرة واحدة لإضافة نظام ألوان الأصناف وصورة مستقلة لكل لون وحقول Snapshot للون داخل تفاصيل الطلب. الملف idempotent ويمكن إعادة تشغيله بأمان عند التحقق من البيئة.

الـbootstrap ينشئ الجداول الأساسية وRLS والإحصائيات والأسعار والخصومات وأوقات التوفر وحاوية `menu-images` والإعدادات، ثم migration الألوان تكمل مخطط النسخة الحالية بنظام `product_colors`.

## 3. اربط الموقع

من Supabase انسخ:
- Project URL
- Publishable key / anon key

ثم عدّل فقط القيم الخاصة بالمطعم في أعلى `js/runtime-config.js`:

```js
window.RESTBR_CONFIG = Object.freeze({
  restaurantName: 'Restaurant Name',
  orderIdPrefix: 'ORD',
  supabaseUrl: 'https://PROJECT_REF.supabase.co',
  supabasePublishableKey: 'PUBLISHABLE_KEY',
  enableUserManagement: false,
  enableRestaurantReset: false,
  legacyRestaurantNames: [],
  legacyBackupFormats: [],
  legacyLocalStorageKeys: {},
  legacySessionStorageKeys: {}
});
```

لا تستخدم `service_role` داخل أي ملف يصل للمتصفح.

## 4. انشر نسخة مستقلة

اربط Repository الجديد باستضافة مستقلة ودومين أو subdomain خاص بالمطعم، مثل:

`restaurant.restbr.com`

لا توجّه مطعمين إلى نفس Repository أو نفس Supabase project.

## 5. أكمل إعداد المطعم

بعد النشر:

1. افتح `/admin.html` وسجّل بحساب صاحب المطعم.
2. أدخل الاسم والشعار والهاتف وWhatsApp والموقع.
3. اضبط اللغات والتصميم وأوقات المطعم.
4. أضف الأقسام والأصناف والأسعار أو استورد Excel.
5. من تعديل الصنف أضف الألوان المطلوبة؛ يمكن لكل لون أن يحمل اسمه العربي/الكوردي/الإنجليزي وHEX وصورة مستقلة وحالة توفر خاصة به.
6. ارفع صور الأصناف والألوان إلى Storage الخاص بنفس المطعم.

## 6. فحص قبل التسليم

- Repository مستقل
- Supabase مستقل
- Auth owner صحيح
- migration نظام الألوان مطبّقة
- `runtime-config.js` يحتوي بيانات هذا المطعم فقط
- لا يوجد `service_role` في الكود
- الاسم والشعار والهاتف وWhatsApp والموقع صحيحة
- اللغة العربية/الكوردية/الإنجليزية تعمل حسب الإعداد
- الداشبورد عربي/English يعمل
- الأسعار داخل المطعم/السفري صحيحة
- ظهور الصنف حسب داخل المطعم/سفري/كلاهما يعمل
- أوقات المطعم وأوقات الأقسام تعمل
- ألوان الصنف تظهر بدون تكرار خيارات الصنف في الكارت
- تغيير اللون يغيّر صورة اللون عند توفرها
- نفس الصنف/الخيار يمكن إضافته بألوان مختلفة كسطور مستقلة في السلة
- اسم اللون يظهر ضمن الخيار في السلة وWhatsApp
- بيانات اللون المنظمة تبقى محفوظة مع نسخة السلة لاستخدامها من نظام الطلب/الفاتورة
- السلة تعمل
- رقم WhatsApp يخرج بالصيغة الدولية الصحيحة
- طلب WhatsApp تجريبي ناجح
- نافذة خاصة لا تعرض أي كاش أو هوية لمطعم سابق

## الميزات الاختيارية

`enableUserManagement` و`enableRestaurantReset` يبقيان `false` افتراضيًا. لا يتم تفعيلهما إلا إذا كانت متطلباتهما منشورة ومختبرة على نسخة المطعم نفسها.
