(() => {
  if (!/(?:^|\/)admin(?:\.html)?\/?$/i.test(location.pathname)) return;

  const STORAGE_KEY = 'RESTBR_ADMIN_LANGUAGE_V1';
  const LANGUAGES = ['ar', 'en'];
  const originals = new WeakMap();
  const originalAttrs = new WeakMap();
  const translatedValues = new WeakMap();
  const ignoredSelectors = [
    '.product-name',
    '.category-name',
    '.sort-item-name',
    '.analytics-label',
    '.admin-account-email',
    '.dynamic-item-title',
    '.option-chip',
    '[data-admin-i18n-ignore]'
  ];

  let currentLanguage = readSavedLanguage();
  let observer = null;

  const EN = new Map(Object.entries({
    'تسجيل دخول لوحة الإدارة':'Admin Dashboard Login',
    'البريد الإلكتروني':'Email',
    'كلمة المرور':'Password',
    'تسجيل الدخول':'Sign In',
    'جاري تسجيل الدخول...':'Signing in...',
    'تم تسجيل الدخول ✓':'Signed in ✓',
    'الرئيسية':'Home',
    'لوحة الإدارة':'Admin Dashboard',
    'تحديث':'Refresh',
    'أهلاً بك 👋':'Welcome 👋',
    'إدارة سريعة وبسيطة للمنيو. اختر اللي تحتاجه فقط.':'Quick and simple menu management. Choose only what you need.',
    'جاري الاتصال بقاعدة البيانات...':'Connecting to database...',
    'متصل بقاعدة البيانات':'Connected to database',
    'الأقسام':'Sections',
    'الأصناف':'Products',
    'الخيارات':'Options',
    '＋ إضافة صنف':'＋ Add Product',
    'اسم، صورة، سعر وخيارات':'Name, image, price and options',
    '＋ قسم جديد':'＋ New Section',
    'إضافة قسم للمنيو':'Add a menu section',
    '🍽 إدارة الأصناف':'🍽 Manage Products',
    'تعديل، إخفاء، توفر وترتيب':'Edit, hide, availability and order',
    '📊 الإحصائيات':'📊 Analytics',
    'الإحصائيات':'Analytics',
    'مشاهدات وتفاعل المنيو':'Menu views and engagement',
    '💾 النسخ الاحتياطي':'💾 Backup',
    'النسخ الاحتياطي':'Backup',
    'Backup و Restore':'Backup & Restore',
    'إضافة وتعديل وإخفاء المواد':'Add, edit and hide products',
    'ابحث عن صنف...':'Search products...',
    '+ إضافة':'+ Add',
    'الكل':'All',
    'الظاهر':'Visible',
    'المخفي':'Hidden',
    'غير متوفر':'Unavailable',
    'غير متوفر حالياً':'Currently unavailable',
    'غير معروض':'Not displayed',
    'قائمة الأصناف':'Product List',
    'جاري تحميل الأصناف...':'Loading products...',
    'ترتيب أصناف قسم معيّن':'Reorder products in a section',
    'حفظ الترتيب':'Save Order',
    'اسحب من علامة ☰ ثم اضغط حفظ.':'Drag using ☰, then tap Save.',
    'إضافة وتعديل وإخفاء الأقسام':'Add, edit and hide sections',
    '+ قسم':'+ Section',
    'قائمة الأقسام':'Section List',
    'جاري تحميل الأقسام...':'Loading sections...',
    'ترتيب الأقسام':'Reorder Sections',
    'إحصائيات خفيفة بدون أسماء، أرقام هواتف أو بيانات شخصية':'Lightweight analytics without names, phone numbers, or personal data',
    'آخر 7 أيام':'Last 7 days',
    'آخر 30 يوم':'Last 30 days',
    'آخر 90 يوم':'Last 90 days',
    '↻ تحديث':'↻ Refresh',
    'فتح المنيو':'Menu opens',
    'تفاعل مع الأصناف':'Product engagement',
    'استخدام البحث':'Search usage',
    'مشاركة روابط':'Link shares',
    '📂 أكثر الأقسام اهتماماً':'📂 Most viewed sections',
    '🍽 أكثر الأصناف تفاعلاً':'🍽 Most engaged products',
    '🌐 اللغات المستخدمة':'🌐 Languages used',
    '🔗 المشاركة':'🔗 Sharing',
    'الإحصائيات تجمع عدادات فقط: فتح المنيو، الضغط على الأقسام والأصناف، البحث، اللغة والمشاركة. لا نخزن اسم الزبون، رقم الهاتف، الموقع، IP أو نص البحث.':'Analytics store counters only: menu opens, section and product taps, search usage, language changes, and sharing. We do not store customer names, phone numbers, location, IP address, or search text.',
    'لا توجد بيانات بعد.':'No data yet.',
    'جاري تحميل الإحصائيات...':'Loading analytics...',
    'العربي':'Arabic',
    'الكوردي':'Kurdish',
    'عربي':'Arabic',
    'کوردی':'Kurdish',
    'مشاركة صنف':'Product share',
    'مشاركة قسم':'Section share',
    'الإعدادات':'Settings',
    'كل إعداد بمكانه — افتح فقط القسم اللي تحتاجه':'Everything is organized — open only the section you need',
    '☀️ نهاري':'☀️ Light',
    '🌙 ليلي':'🌙 Dark',
    'الوضع الليلي':'Dark mode',
    'الوضع النهاري':'Light mode',
    'تفعيل الوضع الليلي للإعدادات':'Enable dark mode for settings',
    'تفعيل الوضع النهاري للإعدادات':'Enable light mode for settings',
    'تبديل وضع الإعدادات':'Toggle settings theme',
    'إعدادات المطعم':'Restaurant Settings',
    'التغييرات لا تثبت إلا بعد الضغط على حفظ.':'Changes are applied only after you press Save.',
    'حفظ التغييرات':'Save Changes',
    'حفظ إعدادات المطعم':'Save Restaurant Settings',
    'جاري الحفظ...':'Saving...',
    'تم حفظ الإعدادات بنجاح ✓':'Settings saved successfully ✓',
    'الحالة والطلبات':'Status & Orders',
    'فتح المطعم، الطلبات، التوصيل والاستلام':'Restaurant status, ordering, delivery and pickup',
    'المطعم مفتوح':'Restaurant Open',
    'إذا أوقفته يظهر تنبيه الإغلاق ويتوقف الطلب.':'If disabled, the closed notice appears and ordering stops.',
    'استقبال الطلبات':'Accept Orders',
    'إيقاف السلة والإرسال مع بقاء المنيو للتصفح.':'Disable cart and ordering while keeping the menu available to browse.',
    'التوصيل':'Delivery',
    'تشغيل أو إيقاف خيار التوصيل.':'Enable or disable delivery.',
    'الاستلام من المطعم':'Pickup',
    'تشغيل أو إيقاف الاستلام من المطعم.':'Enable or disable restaurant pickup.',
    'رسالة الإغلاق':'Closed Message',
    'تظهر فقط عندما يكون الطلب متوقفاً.':'Shown only when ordering is disabled.',
    'رسالة الإغلاق بالعربي':'Closed message in Arabic',
    'الهوية وواجهة المنيو':'Branding & Menu Interface',
    'الاسم، الشعار، العنوان، اللغة وعناصر الواجهة':'Name, logo, title, language and interface elements',
    'اسم المطعم':'Restaurant Name',
    'عنوان المنيو':'Menu Title',
    'اسم المطعم بالعربي':'Restaurant name in Arabic',
    'الشعار':'Logo',
    'يظهر أعلى المنيو وفي شاشة البداية.':'Shown at the top of the menu and on the intro screen.',
    'إظهار':'Show',
    '📷 رفع شعار':'📷 Upload Logo',
    'رابط الشعار — ويمكن تركه فارغاً':'Logo URL — can be left blank',
    'النص تحت اسم المنيو':'Text Below Menu Name',
    'يمكن استخدام {name} ليأخذ اسم المطعم تلقائياً.':'You can use {name} to insert the restaurant name automatically.',
    'مثال: اكتشف منيو {name}':'Example: Discover {name} Menu',
    'مبدّل اللغة':'Language Switcher',
    'عربي / کوردی / English':'Arabic / Kurdish / English',
    'شريط الأقسام':'Section Navigation',
    'أزرار الأقسام أعلى الأصناف.':'Section buttons above products.',
    'زر الرجوع للأعلى':'Back-to-Top Button',
    'السهم الذي يظهر عند النزول بالصفحة.':'Arrow shown after scrolling down.',
    'شاشة البداية':'Intro Screen',
    'Intro عند أول فتح للمنيو.':'Intro shown when the menu first opens.',
    'أحجام وتخطيط المنيو':'Menu Sizing & Layout',
    'تحكم بالكروت، الشفافية، نسبة الصورة، الخطوط، الأزرار، السلة والهيدر':'Control cards, transparency, image ratio, fonts, buttons, cart and header',
    'تخصيص واجهة الزبون':'Customize Customer Interface',
    'غيّر الأحجام ثم اضغط حفظ إعدادات المطعم.':'Adjust sizes, then save restaurant settings.',
    'إعادة ضبط الكل':'Reset All',
    '🍽 كارت الصنف':'🍽 Product Card',
    'الأبعاد ونسبة الصورة والمعلومات':'Dimensions, image ratio and information',
    'افتراضي':'Default',
    'ارتفاع الكارت':'Card Height',
    'نسبة مساحة الصورة':'Image Area Ratio',
    'شفافية زجاج الكارت — مثل الفوتر':'Card Glass Transparency — Like Footer',
    'استدارة الحواف':'Corner Radius',
    'المسافة بين الكروت':'Gap Between Cards',
    'Padding معلومات الكارت':'Card Info Padding',
    '🔤 خطوط المنيو':'🔤 Menu Fonts',
    'اسم الصنف، الخيارات، السعر وعنوان القسم':'Product name, options, price and section title',
    'اسم الصنف':'Product Name',
    'خط الخيارات':'Option Font',
    'خط السعر':'Price Font',
    'عنوان القسم':'Section Title',
    '🔘 الأزرار والتنقل':'🔘 Buttons & Navigation',
    'زر الإضافة، الأقسام والأزرار العلوية':'Add button, sections and top buttons',
    'ارتفاع زر الإضافة':'Add Button Height',
    'خط زر الإضافة':'Add Button Font',
    'ارتفاع زر القسم':'Section Button Height',
    'خط زر القسم':'Section Button Font',
    'ارتفاع الأزرار العلوية':'Top Button Height',
    'خط الأزرار العلوية':'Top Button Font',
    '🛒 زر السلة العائم':'🛒 Floating Cart Button',
    'الحجم والموقع على الشاشة':'Size and screen position',
    'عرض السلة':'Cart Width',
    'ارتفاع السلة':'Cart Height',
    'خط زر السلة':'Cart Button Font',
    'الموقع الأفقي':'Horizontal Position',
    'الارتفاع عن أسفل الشاشة':'Distance from Bottom',
    '🏷 الهيدر والبحث والفوتر':'🏷 Header, Search & Footer',
    'الشعار والعنوان والبحث والفوتر':'Logo, title, search and footer',
    'حجم الشعار':'Logo Size',
    'النص تحت العنوان':'Text Below Title',
    'ارتفاع البحث':'Search Height',
    'خط البحث':'Search Font',
    'عنوان الفوتر':'Footer Title',
    'أزرار الفوتر':'Footer Buttons',
    'رقم الهاتف بالفوتر':'Footer Phone Number',
    'التواصل وأزرار أعلى المنيو':'Contact & Top Menu Buttons',
    'الهاتف، WhatsApp، الموقع وأسماء الأزرار':'Phone, WhatsApp, location and button labels',
    'رقم الهاتف':'Phone Number',
    'رقم WhatsApp':'WhatsApp Number',
    'رابط Google Maps':'Google Maps URL',
    '📍 زر الموقع':'📍 Location Button',
    'زر الموقع الظاهر أعلى المنيو.':'Location button shown at the top of the menu.',
    'موقعنا':'Location',
    '☎ زر الاتصال':'☎ Call Button',
    'زر الاتصال الظاهر أعلى المنيو.':'Call button shown at the top of the menu.',
    'اتصال':'Call',
    '💬 زر WhatsApp':'💬 WhatsApp Button',
    'زر WhatsApp الظاهر أعلى المنيو.':'WhatsApp button shown at the top of the menu.',
    'واتساب منيو':'WhatsApp Menu',
    'أزرار علوية إضافية':'Additional Top Buttons',
    'أضف أي زر: Telegram، حجز، موقع ثانٍ، رقم آخر…':'Add any button: Telegram, booking, second location, another number…',
    '+ إضافة زر':'+ Add Button',
    'السوشيال ميديا':'Social Media',
    'الرابط + إظهار أو إخفاء كل منصة':'URL + show or hide each platform',
    'منصات إضافية':'Additional Platforms',
    'YouTube، Telegram، X أو أي موقع آخر.':'YouTube, Telegram, X, or any other site.',
    '+ إضافة منصة':'+ Add Platform',
    'الفوتر أسفل المنيو':'Menu Footer',
    'الاسم، العنوان، الهاتف، الأزرار وحقوق النشر':'Name, address, phone, buttons and copyright',
    'الفوتر بالكامل':'Entire Footer',
    'إخفاء أو إظهار الجزء السفلي كاملاً.':'Hide or show the entire footer.',
    'الاسم داخل الفوتر.':'Restaurant name in the footer.',
    'الرقم النصي في الفوتر.':'Phone number text in the footer.',
    'حقوق النشر':'Copyright',
    'اسم المطعم والسنة.':'Restaurant name and year.',
    'روابط السوشيال':'Social Links',
    'مجموعة Instagram وغيرها.':'Instagram and other social links.',
    'العنوان الظاهر':'Displayed Address',
    'مثال: دهوك • كوردستان':'Example: Duhok • Kurdistan',
    'زر الموقع في الفوتر':'Footer Location Button',
    'زر الاتصال في الفوتر':'Footer Call Button',
    'زر WhatsApp في الفوتر':'Footer WhatsApp Button',
    'أزرار سفلية إضافية':'Additional Footer Buttons',
    'تظهر مع أزرار الفوتر ويمكن ترتيبها.':'Shown with footer buttons and can be reordered.',
    'الإعلان ومعلومات التوصيل':'Announcement & Delivery Info',
    'نصوص اختيارية تظهر للزبون':'Optional text shown to the customer',
    'إعلان أعلى المنيو':'Menu Announcement',
    'عرض، تنبيه أو رسالة قصيرة.':'Offer, notice, or short message.',
    'مثال: 🔥 عروض قوية اليوم':'Example: 🔥 Great offers today',
    'معلومات التوصيل':'Delivery Information',
    'تظهر داخل صفحة إكمال الطلب.':'Shown on the checkout page.',
    'مثال: التوصيل داخل دهوك فقط • 30–45 دقيقة':'Example: Delivery within Duhok only • 30–45 min',
    'الخلفية والمظهر':'Background & Appearance',
    'فيديو الخلفية وعناصر العرض':'Background video and display elements',
    'فيديو الخلفية':'Background Video',
    'يمكن إيقافه بدون حذف الرابط.':'Can be disabled without deleting the URL.',
    'assets/background.mp4 أو رابط مباشر':'assets/background.mp4 or direct URL',
    'تحكم بمدة ظهور الـ Intro عند فتح المنيو.':'Control how long the intro appears when the menu opens.',
    'مدة شاشة البداية بالمللي ثانية':'Intro Duration in Milliseconds',
    'تعديل الأسعار دفعة واحدة':'Bulk Price Adjustment',
    'كل المنيو أو قسم معيّن':'Entire menu or a specific section',
    'النطاق':'Scope',
    'كل المنيو':'Entire Menu',
    'العملية':'Operation',
    'زيادة السعر':'Increase Price',
    'تنزيل السعر':'Decrease Price',
    'المقدار بالدينار العراقي':'Amount in Iraqi Dinars',
    'اختر النطاق والمقدار لمعاينة التغيير.':'Choose a scope and amount to preview the change.',
    'يتم تعديل السعر الأساسي وكل خيارات الأصناف. يمنع النظام نزول أي سعر تحت الصفر.':'The base price and all product option prices are adjusted. Prices cannot go below zero.',
    'تنفيذ تغيير الأسعار':'Apply Price Change',
    'تنزيل آخر نسخة أسعار':'Download Last Price Backup',
    'Excel — تصدير واستيراد':'Excel — Export & Import',
    'تعديل الأصناف والأسعار بكميات كبيرة ثم رفع الملف':'Bulk-edit products and prices, then upload the file',
    'تنزيل Excel الحالي':'Download Current Excel',
    'اختيار Excel واستيراد':'Choose Excel & Import',
    'النسخ الاحتياطي والاسترجاع':'Backup & Restore',
    'Backup كامل أو جزئي':'Full or partial backup',
    'تنزيل Backup كامل':'Download Full Backup',
    'اختيار ملف واسترجاع':'Choose File & Restore',
    'آخر Backup تلقائي':'Latest Auto Backup',
    'نوع النسخة':'Backup Type',
    'كل شيء':'Everything',
    'الإعدادات فقط':'Settings Only',
    'الأقسام فقط':'Sections Only',
    'الأصناف والخيارات':'Products & Options',
    'الأسعار فقط':'Prices Only',
    'قسم معيّن مع أصنافه':'Specific Section with Products',
    'اختر القسم':'Choose Section',
    'تنزيل النسخة المختارة':'Download Selected Backup',
    'النسخة الكاملة تشمل الأقسام، الأصناف، الخيارات وإعدادات المطعم.':'The full backup includes sections, products, options and restaurant settings.',
    'حساب الإدارة':'Admin Account',
    'الحساب الحالي وتسجيل الخروج':'Current account and sign out',
    'تسجيل الخروج':'Sign Out',
    'هل تريد تسجيل الخروج من لوحة الإدارة؟':'Do you want to sign out of the admin dashboard?',
    'تعديل الصنف':'Edit Product',
    'إضافة صنف جديد':'Add New Product',
    'إضافة الصنف':'Add Product',
    'حفظ التعديلات':'Save Changes',
    'إلغاء':'Cancel',
    'تعديل':'Edit',
    'حذف':'Delete',
    'فعال':'Active',
    'ظاهر':'Visible',
    'ظاهر في المنيو':'Visible in Menu',
    'متوفر':'Available',
    '⭐ الأكثر طلبًا':'⭐ Most Popular',
    '⭐ الأكثر طلباً':'⭐ Most Popular',
    '✨ جديد':'✨ New',
    '🔥 حار':'🔥 Hot',
    '🏷 عرض مميز':'🏷 Featured Offer',
    'الاسم العربي':'Arabic Name',
    'الاسم العربي *':'Arabic Name *',
    'الاسم الكوردي':'Kurdish Name',
    'الاسم الإنجليزي':'English Name',
    'القسم':'Section',
    'القسم *':'Section *',
    'صورة الصنف — من الجهاز أو رابط مباشر':'Product Image — Device Upload or Direct URL',
    '📷 اختيار صورة':'📷 Choose Image',
    'لم يتم اختيار صورة جديدة':'No new image selected',
    'لم يتم اختيار صورة':'No image selected',
    'رابط الصورة (اختياري)':'Image URL (Optional)',
    'السعر الأساسي':'Base Price',
    'الترتيب':'Order',
    'الوصف العربي':'Arabic Description',
    'الوصف الكوردي':'Kurdish Description',
    'الوصف الإنجليزي':'English Description',
    '⏰ توفر تلقائي حسب الوقت':'⏰ Automatic Time-Based Availability',
    'خارج الفترة يظهر الصنف غير متوفر حالياً.':'Outside the set hours, the product appears unavailable.',
    'فعّله إذا الصنف متوفر في ساعات معينة فقط.':'Enable if the product is available only during specific hours.',
    'متوفر من':'Available From',
    'متوفر إلى':'Available Until',
    'خيارات الصنف والأسعار':'Product Options & Prices',
    '+ إضافة خيار':'+ Add Option',
    'اسم الخيار':'Option Name',
    'السعر':'Price',
    'مثلاً: صغير / وسط / كبير':'Example: Small / Medium / Large',
    'إضافة قسم جديد':'Add New Section',
    'اسم القسم بالعربي *':'Section Name in Arabic *',
    'اسم القسم بالكوردي':'Section Name in Kurdish',
    'اسم القسم بالإنجليزي':'Section Name in English',
    'إضافة القسم':'Add Section',
    '⏰ توفر القسم حسب الوقت':'⏰ Section Availability by Time',
    'القسم متوفر من':'Section Available From',
    'القسم متوفر إلى':'Section Available Until',
    'تعديل القسم':'Edit Section',
    'حفظ القسم':'Save Section',
    '🏷 ليبلات كل أصناف القسم':'🏷 Labels for All Products in This Section',
    'بدون تغيير':'No Change',
    'تفعيل على كل الأصناف':'Enable for All Products',
    'إزالة من كل الأصناف':'Remove from All Products',
    'قسم غير معروض':'Hidden System Section',
    '📦 هذا قسم نظامي':'📦 This Is a System Section',
    'حسناً':'OK',
    'لا توجد أقسام.':'No sections found.',
    'لا توجد نتائج.':'No results found.',
    'لا توجد أقسام للترتيب.':'No sections to reorder.',
    'لا توجد أصناف داخل هذا القسم.':'No products in this section.',
    'اسحب للترتيب':'Drag to reorder',
    'مخفي من المنيو':'Hidden from menu',
    'مخفي':'Hidden',
    'قسم نظامي غير معروض':'Hidden system section',
    'بدون اسم':'Unnamed',
    'بدون قسم':'No Section',
    'خيار':'Option',
    'لغات المنيو':'Menu Languages',
    'اختر لغة واحدة أو لغتين أو اللغات الثلاث.':'Choose one, two, or all three menu languages.',
    'سيتم حفظ اختيار اللغات مع زر حفظ التغييرات.':'Language selection is saved with the Save Changes button.',
    'يجب إبقاء لغة واحدة على الأقل.':'At least one language must remain enabled.',
    'تم تغيير الاختيار. اضغط حفظ التغييرات.':'Selection changed. Press Save Changes.',
    'اختر لغة واحدة على الأقل.':'Choose at least one language.',
    'جاري حفظ اللغات...':'Saving languages...',
    'تم حفظ لغات المنيو ✓':'Menu languages saved ✓',
    '🕒 أوقات عمل المطعم':'🕒 Restaurant Opening Hours',
    'جاري تحميل الإعدادات...':'Loading settings...',
    'حسب توقيت العراق. زر «المطعم مفتوح» أعلاه يبقى إغلاق يدوي فوري.':'Times use Iraq time. The “Restaurant Open” switch above remains an immediate manual override.',
    '24/7 — مفتوح دائماً':'24/7 — Always Open',
    'نفس الوقت كل يوم':'Same Hours Every Day',
    'حسب اليوم والوقت':'By Day and Time',
    'إذا كان زر «المطعم مفتوح» مفعلاً، يبقى استقبال الطلبات مفتوحاً طوال الأسبوع.':'If “Restaurant Open” is enabled, ordering stays open all week.',
    'يفتح':'Opens',
    'يغلق':'Closes',
    'مفتوح':'Open',
    'مغلق':'Closed',
    'السبت':'Saturday',
    'الأحد':'Sunday',
    'الاثنين':'Monday',
    'الثلاثاء':'Tuesday',
    'الأربعاء':'Wednesday',
    'الخميس':'Thursday',
    'الجمعة':'Friday',
    'حفظ أوقات الدوام':'Save Opening Hours',
    '🟢 الآن مفتوح — وضع 24/7.':'🟢 Open now — 24/7 mode.',
    '🟢 الآن مفتوح حسب جدول الدوام.':'🟢 Open now according to schedule.',
    '🔴 الآن مغلق حسب جدول الدوام.':'🔴 Closed now according to schedule.',
    '🔴 الآن مغلق — زر «المطعم مفتوح» مطفأ يدوياً.':'🔴 Closed now — “Restaurant Open” is manually disabled.',
    'نافذة داخل المطعم / سفري':'Dine-In / Takeaway Window',
    'تعديل كل النصوص التي تظهر قبل فتح المنيو — عربي، کوردي وEnglish':'Edit all text shown before the menu opens — Arabic, Kurdish and English',
    'تخصيص نافذة نوع الطلب':'Customize Order Type Window',
    'عدّل النصوص أدناه ثم استخدم زر «حفظ التغييرات» الرئيسي أعلى صفحة الإعدادات.':'Edit the text below, then use the main “Save Changes” button at the top of Settings.',
    'العنوان الرئيسي':'Main Title',
    'النص الكبير أعلى نافذة الاختيار.':'Large text at the top of the selection window.',
    'التوضيح القصير قبل خياري الطلب.':'Short explanation before the two order choices.',
    'اسم خيار داخل المطعم':'Dine-In Option Name',
    'العنوان داخل زر 🍴.':'Title inside the 🍴 button.',
    'النص تحت داخل المطعم':'Text Below Dine-In',
    'الوصف الصغير داخل خيار داخل المطعم.':'Small description inside the dine-in option.',
    'اسم خيار سفري':'Takeaway Option Name',
    'العنوان داخل زر 🥡.':'Title inside the 🥡 button.',
    'النص تحت سفري':'Text Below Takeaway',
    'الوصف الصغير داخل خيار سفري.':'Small description inside the takeaway option.',
    'نص التحميل':'Loading Text',
    'يظهر بعد اختيار داخل المطعم أو سفري أثناء تجهيز الأسعار.':'Shown after choosing dine-in or takeaway while prices are prepared.',
    'الخصومات':'Discounts',
    'خصم بالنسبة المئوية على المطعم أو قسم أو صنف — داخل، سفري أو الاثنين':'Percentage discount on the restaurant, a section, or a product — dine-in, takeaway, or both',
    'إنشاء خصم':'Create Discount',
    'الأسعار الأصلية تبقى محفوظة ولن يتم تعديلها.':'Original prices remain stored and are not modified.',
    'نسبة الخصم %':'Discount %',
    'مثال: 20':'Example: 20',
    'يطبق على':'Applies To',
    'داخل + سفري':'Dine-In + Takeaway',
    'داخل المطعم فقط':'Dine-In Only',
    'سفري فقط':'Takeaway Only',
    'مكان الخصم':'Discount Scope',
    'المطعم كامل':'Entire Restaurant',
    'قسم كامل':'Entire Section',
    'صنف واحد':'Single Product',
    'اختيار الهدف':'Choose Target',
    'إضافة الخصم':'Add Discount',
    'الخصومات الحالية':'Current Discounts',
    'تقدر توقف الخصم مؤقتًا أو تحذفه.':'You can pause a discount temporarily or delete it.',
    'جاري التحميل...':'Loading...',
    'لا توجد خصومات حاليًا.':'No discounts currently.',
    'مفعّل':'Active',
    'متوقف':'Paused',
    'إيقاف':'Pause',
    'تفعيل':'Enable',
    'داخل المطعم':'Dine-In',
    'سفري':'Takeaway',
    'جاري حفظ الخصم...':'Saving discount...',
    'تم حفظ الخصم ✓':'Discount saved ✓',
    'تم إيقاف الخصم.':'Discount paused.',
    'تم تفعيل الخصم ✓':'Discount enabled ✓',
    'حذف هذا الخصم نهائيًا؟':'Delete this discount permanently?',
    'تم حذف الخصم.':'Discount deleted.',
    'الوضع الحالي: 24/7 — اضغط للتعديل':'Current mode: 24/7 — tap to edit',
    'لا توجد منصات إضافية حالياً.':'No additional platforms currently.',
    'منصة جديدة':'New Platform',
    'بدون رابط':'No URL',
    'الأيقونة / Emoji':'Icon / Emoji',
    'اسم المنصة':'Platform Name',
    'الرابط':'URL',
    '↑ للأعلى':'↑ Move Up',
    '↓ للأسفل':'↓ Move Down',
    'ماكو منصات إضافية حالياً.':'No additional platforms currently.',
    'ماكو أزرار سفلية إضافية حالياً.':'No additional footer buttons currently.',
    'ماكو أزرار علوية إضافية حالياً.':'No additional top buttons currently.',
    'زر جديد':'New Button',
    'الرابط / Action':'URL / Action',
    'اسم الزر بالعربي':'Button label in Arabic',
    'إعادة كل أحجام وتصميم المنيو إلى الإعدادات الافتراضية؟':'Reset all menu sizing and design settings to defaults?'
  }));

  const REGEX_RULES = [
    [/^متصل بقاعدة بيانات\s+(.+)$/u, 'Connected to $1 database'],
    [/^(\d+)\s+من\s+(\d+)$/u, '$1 of $2'],
    [/^الترتيب\s+(\d+)\s*•\s*(\d+)\s+صنف$/u, 'Order $1 • $2 products'],
    [/^(\d+)\s+صنف$/u, '$1 products'],
    [/^قسم:\s*(.+)$/u, 'Section: $1'],
    [/^صنف:\s*(.+)$/u, 'Product: $1'],
    [/^(\d+)%\s+خصم$/u, '$1% discount'],
    [/^الوضع الحالي:\s*(.+)\s+—\s+اضغط للتعديل$/u, 'Current mode: $1 — tap to edit'],
    [/^تم حفظ القسم وتطبيق الليبلات على\s+(\d+)\s+صنف\s+✓$/u, 'Section saved and labels applied to $1 products ✓'],
    [/^سيتم تطبيق خيارات الليبلات على\s+(\d+)\s+صنف داخل القسم\. متابعة؟$/u, 'Label changes will be applied to $1 products in this section. Continue?'],
    [/^مفعّل على\s+(\d+)\s+من\s+(\d+)$/u, 'Enabled on $1 of $2'],
    [/^تم حذف\s+"(.+)"\s+بنجاح\s+✓$/u, '“$1” deleted successfully ✓'],
    [/^تم حذف قسم\s+"(.+)"\s+✓$/u, 'Section “$1” deleted ✓'],
    [/^هل تريد حذف القسم الفارغ\s+"(.+)"\s+نهائياً؟$/u, 'Delete the empty section “$1” permanently?'],
    [/^لا توجد نسخة أسعار محفوظة حتى الآن\.$/u, 'No price backup has been saved yet.'],
    [/^التغيير:\s*(.+)$/u, 'Change: $1'],
    [/^الأصناف ضمن النطاق:\s*(\d+)\s*•\s*أسعار أساسية:\s*(\d+)\s*•\s*أسعار خيارات:\s*(\d+)$/u, 'Products in scope: $1 • Base prices: $2 • Option prices: $3'],
    [/^فشل (.+):\s*(.+)$/u, 'Failed $1: $2'],
    [/^تعذر (.+):\s*(.+)$/u, 'Could not $1: $2'],
    [/^جاري (.+)\.\.\.$/u, 'Processing $1...']
  ];

  const PHRASE_RULES = [
    ['جاري رفع الصورة...', 'Uploading image...'],
    ['تم رفع الصورة ✓', 'Image uploaded ✓'],
    ['جاري رفع الشعار...', 'Uploading logo...'],
    ['تم تنزيل Excel الحالي ✓', 'Current Excel downloaded ✓'],
    ['جاري إنشاء ملف Excel...', 'Creating Excel file...'],
    ['جاري قراءة Excel...', 'Reading Excel file...'],
    ['جاري تحديث البيانات...', 'Updating data...'],
    ['تم استيراد Excel بنجاح ✓', 'Excel imported successfully ✓'],
    ['مكتبة Excel لم تتحمل. سوِّ Refresh وحاول مرة ثانية.', 'Excel library did not load. Refresh and try again.'],
    ['لا توجد أصناف معروضة ضمن هذا النطاق.', 'There are no displayed products in this scope.'],
    ['اكتب مقدار صحيح أكبر من صفر.', 'Enter a valid amount greater than zero.'],
    ['جاري تعديل الأسعار...', 'Updating prices...'],
    ['جاري حفظ نسخة أمان ثم تنفيذ التغيير...', 'Saving a safety backup, then applying the change...'],
    ['تم تنزيل آخر نسخة أسعار ✓', 'Last price backup downloaded ✓'],
    ['جاري حفظ ترتيب الأقسام...', 'Saving section order...'],
    ['تم حفظ ترتيب الأقسام بنجاح ✓', 'Section order saved successfully ✓'],
    ['جاري حفظ ترتيب الأصناف...', 'Saving product order...'],
    ['تم حفظ ترتيب الأصناف بنجاح ✓', 'Product order saved successfully ✓'],
    ['تم تغيير الترتيب محلياً. اضغط «حفظ ترتيب الأقسام».', 'Order changed locally. Press “Save Section Order”.'],
    ['تم تغيير ترتيب الأصناف محلياً. اضغط «حفظ ترتيب الأصناف».', 'Product order changed locally. Press “Save Product Order”.'],
    ['تعذر تحميل مكتبة السحب والإفلات. اعمل Refresh للصفحة.', 'Drag-and-drop library failed to load. Refresh the page.'],
    ['تم حفظ الصنف والصورة والخيارات بنجاح ✓', 'Product, image, and options saved successfully ✓'],
    ['تمت إضافة الصنف بنجاح ✓', 'Product added successfully ✓'],
    ['تمت إضافة القسم بنجاح ✓', 'Section added successfully ✓'],
    ['تم حفظ القسم وإخفاؤه من المنيو ✓', 'Section saved and hidden from the menu ✓'],
    ['تم حفظ القسم ✓', 'Section saved ✓'],
    ['اكتب الاسم العربي للصنف أولاً.', 'Enter the product Arabic name first.'],
    ['اختر القسم أولاً.', 'Choose a section first.'],
    ['اكتب اسم القسم بالعربي أولاً.', 'Enter the section Arabic name first.'],
    ['الملف المختار ليس صورة.', 'The selected file is not an image.'],
    ['الملف المختار ليس صورة', 'The selected file is not an image'],
    ['حجم الصورة أكبر من 10MB.', 'Image size is larger than 10 MB.'],
    ['حجم الصورة أكبر من 10MB', 'Image size is larger than 10 MB'],
    ['حجم الشعار أكبر من 10MB.', 'Logo size is larger than 10 MB.'],
    ['تعذر إنشاء رابط الصورة', 'Could not create image URL'],
    ['تعذر إنشاء رابط عام للشعار.', 'Could not create a public logo URL.'],
    ['تعذر قراءة الصنف بعد الحفظ.', 'Could not read the product after saving.'],
    ['هذا قسم نظامي ولا يمكن تعديله.', 'This is a system section and cannot be edited.'],
    ['قسم "غير معروض" قسم نظامي ولا يمكن حذفه.', 'The “Not displayed” section is a system section and cannot be deleted.'],
    ['جاري نقل الأصناف...', 'Moving products...'],
    ['جاري حذف الخيارات والأصناف...', 'Deleting options and products...'],
    ['تم حذف الأصناف. جاري حذف القسم...', 'Products deleted. Deleting section...'],
    ['جاري قراءة واسترجاع النسخة...', 'Reading and restoring backup...'],
    ['تم استرجاع النسخة الاحتياطية بنجاح ✓', 'Backup restored successfully ✓'],
    ['لا يوجد Backup تلقائي محفوظ على هذا الجهاز حالياً.', 'No automatic backup is currently saved on this device.'],
    ['تم تنزيل آخر Backup تلقائي محفوظ ✓', 'Latest automatic backup downloaded ✓'],
    ['تم إنشاء نسخة كاملة ✓', 'Full backup created ✓'],
    ['تم إنشاء نسخة للإعدادات فقط ✓', 'Settings-only backup created ✓'],
    ['تم إنشاء نسخة للأقسام فقط ✓', 'Sections-only backup created ✓'],
    ['تم إنشاء نسخة للأصناف والخيارات ✓', 'Products and options backup created ✓'],
    ['تم إنشاء نسخة للأسعار فقط ✓', 'Prices-only backup created ✓'],
    ['اختر قسماً أولاً.', 'Choose a section first.'],
    ['هذا الملف ليس Backup مدعوم.', 'This file is not a supported backup.'],
    ['النسخة لا تحتوي بيانات قابلة للاسترجاع.', 'The backup contains no restorable data.'],
    ['تعذر تحميل الإحصائيات. تأكد من تشغيل SQL الخاص بـ V4.0.', 'Could not load analytics. Make sure the V4.0 SQL has been applied.'],
    ['البريد الإلكتروني أو كلمة المرور غير صحيحة.', 'Incorrect email or password.'],
    ['البريد الإلكتروني غير مؤكد في Supabase Auth.', 'Email is not confirmed in Supabase Auth.'],
    ['لم يتم إنشاء جلسة تسجيل دخول.', 'A login session could not be created.'],
    ['تمت إعادة النصوص للقيم الافتراضية محلياً. اضغط «حفظ التغييرات» لتثبيتها.', 'Default text was restored locally. Press “Save Changes” to apply it.'],
    ['جاري تحميل نصوص النافذة...', 'Loading window text...'],
    ['تعذر تحميل النصوص المحفوظة، لذلك تظهر القيم الافتراضية.', 'Saved text could not be loaded, so default values are shown.'],
    ['جاري حفظ نصوص نافذة داخل المطعم / سفري...', 'Saving dine-in / takeaway window text...'],
    ['تم حفظ نصوص نافذة داخل المطعم / سفري ✓', 'Dine-in / takeaway window text saved ✓'],
    ['اكتب نسبة صحيحة من 1 إلى 100.', 'Enter a valid percentage from 1 to 100.'],
    ['اختر القسم أو الصنف.', 'Choose a section or product.'],
    ['تعذر تحميل الخصومات.', 'Could not load discounts.'],
    ['جاري حفظ أوقات الدوام...', 'Saving opening hours...'],
    ['تم حفظ أوقات الدوام ✓', 'Opening hours saved ✓'],
    ['إعدادات المطعم غير موجودة.', 'Restaurant settings were not found.']
  ];

  function readSavedLanguage() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return LANGUAGES.includes(value) ? value : 'ar';
    } catch (_) {
      return 'ar';
    }
  }

  function saveLanguage(language) {
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
  }

  function hasArabic(value) {
    return /[\u0600-\u06FF]/u.test(String(value || ''));
  }

  function preserveWhitespace(original, translated) {
    const value = String(original ?? '');
    const prefix = value.match(/^\s*/u)?.[0] || '';
    const suffix = value.match(/\s*$/u)?.[0] || '';
    return prefix + translated + suffix;
  }

  function translateText(value) {
    const raw = String(value ?? '');
    const trimmed = raw.trim();
    if (!trimmed || !hasArabic(trimmed)) return raw;

    if (EN.has(trimmed)) {
      return preserveWhitespace(raw, EN.get(trimmed));
    }

    for (const [pattern, replacement] of REGEX_RULES) {
      if (pattern.test(trimmed)) {
        pattern.lastIndex = 0;
        return preserveWhitespace(raw, trimmed.replace(pattern, replacement));
      }
    }

    let result = trimmed;
    PHRASE_RULES.forEach(([ar, en]) => {
      if (result.includes(ar)) result = result.split(ar).join(en);
    });

    result = result
      .replace(/\bأقسام\s*:/gu, 'Sections:')
      .replace(/\bأصناف\s*:/gu, 'Products:')
      .replace(/\bخيارات\s*:/gu, 'Options:')
      .replace(/\bإعدادات\s*:/gu, 'Settings:')
      .replace(/\bأسعار\s*:/gu, 'Prices:')
      .replace(/كل المنيو — الأصناف المعروضة/gu, 'Entire Menu — Displayed Products')
      .replace(/زيادة\s+([\d,]+)\s+د\.ع/gu, 'Increase $1 IQD')
      .replace(/تنزيل\s+([\d,]+)\s+د\.ع/gu, 'Decrease $1 IQD')
      .replace(/([+-]?[\d,]+)\s+د\.ع/gu, '$1 IQD')
      .replace(/د\.ع/gu, 'IQD');

    return preserveWhitespace(raw, result);
  }

  function shouldIgnoreTextNode(node) {
    const parent = node?.parentElement;
    if (!parent) return true;
    if (['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return true;
    return ignoredSelectors.some(selector => parent.matches(selector));
  }

  function rememberText(node, value) {
    const lastTranslated = translatedValues.get(node);
    if (lastTranslated !== undefined && String(value) === String(lastTranslated)) return;
    originals.set(node, String(value));
  }

  function applyTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || shouldIgnoreTextNode(node)) return;

    const live = String(node.nodeValue ?? '');
    rememberText(node, live);
    const source = originals.get(node) ?? live;

    if (currentLanguage === 'en') {
      const translated = translateText(source);
      translatedValues.set(node, translated);
      if (node.nodeValue !== translated) node.nodeValue = translated;
    } else {
      translatedValues.delete(node);
      if (node.nodeValue !== source) node.nodeValue = source;
    }
  }

  function attributeCacheFor(element) {
    if (!originalAttrs.has(element)) originalAttrs.set(element, {});
    return originalAttrs.get(element);
  }

  function applyAttributes(element) {
    if (!(element instanceof Element)) return;
    if (element.matches('[data-admin-i18n-ignore]')) return;

    const cache = attributeCacheFor(element);
    ['placeholder', 'title', 'aria-label'].forEach(attribute => {
      if (!element.hasAttribute(attribute)) return;
      const live = element.getAttribute(attribute) || '';
      if (!(attribute in cache) || (currentLanguage === 'ar' && live !== cache[attribute])) {
        cache[attribute] = live;
      }
      const source = cache[attribute];
      const next = currentLanguage === 'en' ? translateText(source) : source;
      if (live !== next) element.setAttribute(attribute, next);
    });
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      applyTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document) return;

    if (root instanceof Element) applyAttributes(root);

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );

    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) applyTextNode(node);
      else applyAttributes(node);
      node = walker.nextNode();
    }
  }

  function installStyles() {
    if (document.getElementById('restbrAdminI18nStyles')) return;
    const style = document.createElement('style');
    style.id = 'restbrAdminI18nStyles';
    style.textContent = `
      .restbr-admin-lang-btn{
        flex:0 0 auto;min-width:42px;height:42px;padding:0 10px;border-radius:12px;
        border:1px solid rgba(216,169,88,.25);background:#17130f;color:#e8b862;
        font:800 11px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;
        display:grid;place-items:center;white-space:nowrap;box-shadow:0 7px 18px rgba(0,0,0,.16);
        -webkit-tap-highlight-color:transparent
      }
      body.admin-global-light .restbr-admin-lang-btn{
        background:#fffdf8;color:#7a5319;border-color:rgba(99,69,27,.18);
        box-shadow:0 5px 16px rgba(86,57,19,.07)
      }
      #adminLoginLanguageToggle{
        position:fixed;z-index:10001;top:max(14px,env(safe-area-inset-top));inset-inline-end:14px
      }
      body:not(.auth-locked) #adminLoginLanguageToggle{display:none}
      html[data-admin-lang="en"] body{direction:ltr}
      html[data-admin-lang="en"] .admin-header,
      html[data-admin-lang="en"] .admin-header-copy,
      html[data-admin-lang="en"] .home-hero,
      html[data-admin-lang="en"] .quick-action,
      html[data-admin-lang="en"] .view-title-row,
      html[data-admin-lang="en"] .panel,
      html[data-admin-lang="en"] .category-row,
      html[data-admin-lang="en"] .product-row,
      html[data-admin-lang="en"] .compact-details,
      html[data-admin-lang="en"] .tools-card,
      html[data-admin-lang="en"] .settings-clean-wrap,
      html[data-admin-lang="en"] .settings-element,
      html[data-admin-lang="en"] .settings-toggle-card,
      html[data-admin-lang="en"] .settings-field-clean,
      html[data-admin-lang="en"] .modal-choice,
      html[data-admin-lang="en"] .login-field,
      html[data-admin-lang="en"] .admin-modal-card{
        text-align:left
      }
      html[data-admin-lang="en"] .admin-header-actions{direction:ltr!important}
      html[data-admin-lang="en"] .modal-choice{text-align:left!important}
      html[data-admin-lang="en"] .settings-switch i::after{right:auto;left:3px}
      html[data-admin-lang="en"] .settings-switch input:checked + i::after{transform:translateX(20px)}
      html[data-admin-lang="en"] .mini-visibility i::after{right:auto;left:2px}
      html[data-admin-lang="en"] .mini-visibility input:checked + i::after{transform:translateX(16px)}
      html[data-admin-lang="en"] .product-side{align-items:flex-end}
      @media(max-width:650px){
        .restbr-admin-lang-btn{height:38px;min-width:38px;padding:0 8px;border-radius:11px;font-size:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function buildLanguageButtons() {
    let headerButton = document.getElementById('adminLanguageToggle');
    const actions = document.getElementById('adminHeaderActions');

    if (!headerButton && actions) {
      headerButton = document.createElement('button');
      headerButton.id = 'adminLanguageToggle';
      headerButton.type = 'button';
      headerButton.className = 'restbr-admin-lang-btn';
      headerButton.dataset.adminI18nIgnore = '1';
      headerButton.addEventListener('click', toggleLanguage);
      actions.insertBefore(headerButton, actions.firstChild);
    }

    let loginButton = document.getElementById('adminLoginLanguageToggle');
    if (!loginButton && document.body) {
      loginButton = document.createElement('button');
      loginButton.id = 'adminLoginLanguageToggle';
      loginButton.type = 'button';
      loginButton.className = 'restbr-admin-lang-btn';
      loginButton.dataset.adminI18nIgnore = '1';
      loginButton.addEventListener('click', toggleLanguage);
      document.body.appendChild(loginButton);
    }

    syncLanguageButtons();
    return !!(headerButton || loginButton);
  }

  function syncLanguageButtons() {
    const text = currentLanguage === 'ar' ? 'EN' : 'عربي';
    const title = currentLanguage === 'ar' ? 'Switch dashboard to English' : 'تبديل لوحة الإدارة إلى العربية';
    ['adminLanguageToggle', 'adminLoginLanguageToggle'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.textContent = text;
      button.title = title;
      button.setAttribute('aria-label', title);
    });
  }

  function setDocumentDirection() {
    const html = document.documentElement;
    html.dataset.adminLang = currentLanguage;
    html.lang = currentLanguage;
    html.dir = currentLanguage === 'en' ? 'ltr' : 'rtl';
  }

  function translateDocument() {
    setDocumentDirection();
    walk(document.body);
    syncLanguageButtons();

    const refresh = document.getElementById('refreshBtn');
    if (refresh) applyAttributes(refresh);

    document.dispatchEvent(new CustomEvent('restbr:admin-language-change', {
      detail:{ language:currentLanguage }
    }));
  }

  function setLanguage(language) {
    currentLanguage = LANGUAGES.includes(language) ? language : 'ar';
    saveLanguage(currentLanguage);
    translateDocument();
  }

  function toggleLanguage() {
    setLanguage(currentLanguage === 'ar' ? 'en' : 'ar');
  }

  function patchDialogs() {
    if (window.__restbrAdminI18nDialogsPatched) return;
    window.__restbrAdminI18nDialogsPatched = true;

    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    const nativePrompt = window.prompt.bind(window);

    window.alert = function(message) {
      return nativeAlert(currentLanguage === 'en' ? translateText(message) : message);
    };

    window.confirm = function(message) {
      return nativeConfirm(currentLanguage === 'en' ? translateText(message) : message);
    };

    window.prompt = function(message, defaultValue) {
      const originalMessage = String(message ?? '');
      const shownMessage = currentLanguage === 'en' ? translateText(originalMessage) : originalMessage;
      const result = nativePrompt(shownMessage, defaultValue);

      if (
        currentLanguage === 'en' &&
        /اكتب كلمة حذف للتأكيد/u.test(originalMessage) &&
        /^delete$/i.test(String(result || '').trim())
      ) {
        return 'حذف';
      }

      return result;
    };
  }

  function watchMutations() {
    if (observer || !document.body) return;

    observer = new MutationObserver(mutations => {
      let needsButtons = false;

      mutations.forEach(mutation => {
        if (mutation.type === 'characterData') {
          applyTextNode(mutation.target);
          return;
        }

        mutation.addedNodes.forEach(node => {
          walk(node);
          if (node.nodeType === Node.ELEMENT_NODE) needsButtons = true;
        });
      });

      if (needsButtons) buildLanguageButtons();
    });

    observer.observe(document.body, {
      subtree:true,
      childList:true,
      characterData:true
    });
  }

  function start() {
    installStyles();
    patchDialogs();
    setDocumentDirection();
    buildLanguageButtons();
    walk(document.body);
    watchMutations();

    [80, 250, 600, 1200, 2200].forEach(delay => {
      setTimeout(() => {
        buildLanguageButtons();
        if (currentLanguage === 'en') walk(document.body);
      }, delay);
    });

    window.RESTBR_ADMIN_I18N = Object.freeze({
      get language(){ return currentLanguage; },
      setLanguage,
      translate:translateText
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once:true });
  } else {
    start();
  }
})();
