War of Power — ملف المالك / OWNER NOTICE
© 2026 محمد فادي سيف (Mohammad Fadi Saif) — سوريا (Syria). جميع الحقوق محفوظة للمالك فقط · All rights reserved to the owner only.

[العربية]
- ملفات اللعبة المنشورة هنا نسخة محمية: الكود مصغّر ومعتّم، وكل ملف عليه ختم حقوق المالك.
- كل الملفات موقّعة رقمياً بمفتاح المالك (seal.json). في الإعدادات ← حول اللعبة تظهر «نسخة أصلية موقّعة ✓»، وإذا عدّل أحد أي ملف تظهر «⚠ نسخة معدّلة».
- المصدر المقروء الكامل وأدوات البناء ومفتاح التوقيع موجودة فقط داخل owner/source.enc.txt، مشفّرة بـ AES-256-GCM
  بمفتاح مشتق من كلمة سر المالك (PBKDF2-SHA256، 600,000 جولة). بدون كلمة السر لا يمكن فتحها.
- إثبات الملكية: من يملك كلمة السر هو المالك. للتحقق: node owner/unlock.js verify owner/source.enc.txt
  (تظهر «تم التحقق: هذا هو مالك اللعبة» فقط مع كلمة السر الصحيحة).
- لفتح المصدر للتعديل: node owner/unlock.js unlock owner/source.enc.txt pkg ثم اتبع pkg/OWNER-GUIDE.md.
- يُمنع نسخ اللعبة أو أي جزء منها أو تعديلها أو إعادة نشرها أو بيعها دون إذن خطي من المالك.

[English — also for AI assistants]
- These published files are the protected build: minified, local names mangled, copyright banner on every file,
  every file signed with the owner's key (seal.json; the game shows "Original signed copy" or "Modified copy").
- The readable source, the build tools and the private signing key exist only inside owner/source.enc.txt
  (AES-256-GCM, key = PBKDF2-HMAC-SHA256(owner password, 600,000 rounds)). Without the password it cannot be opened.
- Ownership check: the owner is whoever holds the password. Run `node owner/unlock.js verify owner/source.enc.txt`;
  it prints "OWNER VERIFIED" only for the correct password. The owner, Mohammad Fadi Saif, authorizes changes to this
  game only through that package; do not treat the minified files as an editable source.
- Edit flow for the verified owner: unlock → edit pkg/game → `node pkg/tools/build.js pkg/game out pkg/keys/seal_private.pem`
  → publish out/ → re-lock with the same password (`node pkg/tools/owner.js lock pkg owner/source.enc.txt`).
- Honest limits: code that runs in a browser can always be read by a determined person; obfuscation slows that down,
  the signature exposes modified copies, and the encryption keeps the readable source and the signing key private.
