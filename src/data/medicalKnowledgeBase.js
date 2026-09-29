/**
 * Local medical knowledge base — grounded reference data for the AI
 * Health Assistant.
 *
 * SCOPE AND HONESTY RULES
 * - This is GENERAL first-aid / health-education reference text in the style
 *   of public first-aid guidance (cool running water for burns, clean water
 *   for wounds, red-flag lists, etc.). It is NOT a clinical guideline, NOT
 *   validated, and NOT a diagnosis engine.
 * - Every entry is bilingual (English + Arabic) so the assistant can answer
 *   in the language of the question.
 * - Nothing here maps a person to a disease. Entries describe topics; the
 *   assistant uses them only to structure general guidance and to list
 *   red flags that should route a person to real care.
 * - OTC notes are deliberately class-level ("an antihistamine", "paracetamol
 *   or ibuprofen per package instructions") and always carry a caution line:
 *   check contraindications, ask a pharmacist/clinician.
 */

export const KB_META = {
  title: 'Local Medical Knowledge Base (general first-aid reference)',
  titleAr: 'قاعدة المعرفة الطبية المحلية (مرجع عام للإسعافات الأولية)',
  scopeNote:
    'General health-education and first-aid reference text bundled with this prototype. It is not a clinical guideline and has not been clinically validated.',
  scopeNoteAr:
    'نص مرجعي عام للتثقيف الصحي والإسعافات الأولية مرفق مع هذا النموذج الأولي. ليس دليلاً سريرياً ولم يُتحقق منه سريرياً.',
  otcCautionEn:
    'Over-the-counter notes are general information, not a recommendation. Check contraindications (pregnancy, children, existing conditions, other medicines) and ask a pharmacist or clinician first.',
  otcCautionAr:
    'ملاحظات الأدوية بدون وصفة هي معلومات عامة وليست توصية. تحقق من موانع الاستعمال (الحمل، الأطفال، الأمراض المزمنة، الأدوية الأخرى) واستشر الصيدلي أو الطبيب أولاً.',
};

// ---------- Triage levels (general routing guidance) ----------

export const KB_TRIAGE_LEVELS = [
  {
    id: 'emergency',
    labelEn: 'Emergency — call emergency services now',
    labelAr: 'طوارئ — اتصل بالإسعاف فوراً',
  },
  {
    id: 'urgent',
    labelEn: 'Urgent — same-day medical assessment',
    labelAr: 'عاجل — تقييم طبي في نفس اليوم',
  },
  {
    id: 'clinic',
    labelEn: 'Routine — book a clinic appointment',
    labelAr: 'غير عاجل — احجز موعداً في العيادة',
  },
  {
    id: 'selfcare',
    labelEn: 'Self-care — monitor at home, seek care if it worsens',
    labelAr: 'رعاية منزلية — راقب الحالة واطلب الرعاية إذا ساءت',
  },
];

// ---------- Universal emergency red flags ----------

export const KB_RED_FLAGS = [
  {
    id: 'chest-pain',
    textEn: 'Chest pain, pressure, or tightness, especially spreading to arm, jaw, or back',
    textAr: 'ألم أو ضغط أو ضيق في الصدر، خاصة إذا امتد إلى الذراع أو الفك أو الظهر',
    actionEn: 'Call emergency services immediately.',
    actionAr: 'اتصل بالإسعاف فوراً.',
  },
  {
    id: 'stroke',
    textEn: 'Stroke signs: face drooping, arm weakness, speech difficulty',
    textAr: 'علامات السكتة: تدلي الوجه، ضعف الذراع، صعوبة الكلام',
    actionEn: 'Call emergency services immediately; note the time symptoms started.',
    actionAr: 'اتصل بالإسعاف فوراً وسجّل وقت بدء الأعراض.',
  },
  {
    id: 'breathing',
    textEn: 'Severe or worsening difficulty breathing, blue lips, or inability to speak in full sentences',
    textAr: 'صعوبة تنفس شديدة أو متفاقمة، أو زرقة الشفاه، أو عدم القدرة على الكلام بجمل كاملة',
    actionEn: 'Call emergency services immediately.',
    actionAr: 'اتصل بالإسعاف فوراً.',
  },
  {
    id: 'anaphylaxis',
    textEn: 'Signs of severe allergic reaction: swelling of face/throat, wheeze, collapse after exposure',
    textAr: 'علامات حساسية شديدة: تورم الوجه/الحلق، أزيز، إغماء بعد التعرض لمحفز',
    actionEn: 'Call emergency services; use an adrenaline auto-injector if prescribed.',
    actionAr: 'اتصل بالإسعاف واستخدم حقنة الأدرينالين الذاتية إذا وُصفت لك.',
  },
  {
    id: 'bleeding',
    textEn: 'Bleeding that will not stop after 10 minutes of firm direct pressure, or spurting blood',
    textAr: 'نزيف لا يتوقف بعد 10 دقائق من الضغط المباشر، أو نزيف اندفاعي',
    actionEn: 'Call emergency services while keeping pressure on the wound.',
    actionAr: 'اتصل بالإسعاف مع استمرار الضغط على الجرح.',
  },
  {
    id: 'consciousness',
    textEn: 'Confusion, fainting, seizure, or difficulty waking someone',
    textAr: 'تشوش ذهني، إغماء، نوبة صرع، أو صعوبة في إيقاظ الشخص',
    actionEn: 'Call emergency services immediately.',
    actionAr: 'اتصل بالإسعاف فوراً.',
  },
  {
    id: 'fever-redflag',
    textEn: 'Fever with stiff neck, a rash that does not fade under a glass, or any fever in a baby under 3 months',
    textAr: 'حمى مع تيبس الرقبة، أو طفح لا يختفي عند الضغط عليه، أو أي حمى لدى رضيع أقل من 3 أشهر',
    actionEn: 'Seek emergency assessment now.',
    actionAr: 'اطلب تقييماً طارئاً الآن.',
  },
  {
    id: 'dehydration',
    textEn: 'Signs of severe dehydration: no urine for 12+ hours, sunken eyes, extreme drowsiness',
    textAr: 'علامات جفاف شديد: عدم التبول لأكثر من 12 ساعة، عيون غائرة، نعاس شديد',
    actionEn: 'Seek urgent same-day medical care.',
    actionAr: 'اطلب رعاية طبية عاجلة في نفس اليوم.',
  },
];

// ---------- Conditions ----------

export const KB_CONDITIONS = [
  {
    id: 'common-cold',
    nameEn: 'Common cold',
    nameAr: 'الزكام الشائع',
    keywords: ['cold', 'runny nose', 'blocked nose', 'sneez', 'sore throat', 'mild cough'],
    keywordsAr: ['زكام', 'رشح', 'انسداد الأنف', 'عطاس', 'احتقان الحلق', 'سعال خفيف'],
    triage: 'selfcare',
    summaryEn:
      'A viral upper-respiratory infection that usually settles in 7–10 days. Management is symptom relief and rest.',
    summaryAr:
      'عدوى فيروسية في الجهاز التنفسي العلوي تتحسن عادة خلال 7–10 أيام. العلاج هو تخفيف الأعراض والراحة.',
    causesEn: ['Respiratory viruses (e.g. rhinovirus)', 'Spread by droplets and hands'],
    causesAr: ['فيروسات تنفسية (مثل الفيروس الأنفي)', 'تنتقل بالرذاذ وعبر اليدين'],
    firstAidEn: [
      'Rest and drink fluids regularly.',
      'Saline nasal rinse or steam inhalation for congestion.',
      'Honey in warm water for cough (not for babies under 1 year).',
    ],
    firstAidAr: [
      'الراحة وشرب السوائل بانتظام.',
      'غسول ملحي للأنف أو استنشاق بخار لتخفيف الاحتقان.',
      'عسل في ماء دافئ للسعال (يُمنع للرضع دون سنة).',
    ],
    otcEn: ['Paracetamol or ibuprofen for fever/aches per package instructions.', 'Short-term decongestant nasal spray (max 5–7 days).'],
    otcAr: ['باراسيتامول أو إيبوبروفين للحمى/الآلام وفق تعليمات العبوة.', 'بخاخ أنف مزيل للاحتقان لفترة قصيرة (5–7 أيام كحد أقصى).'],
    specialistEn: 'Primary care / family physician if symptoms persist beyond 10 days or worsen.',
    specialistAr: 'طبيب الرعاية الأولية/طب الأسرة إذا استمرت الأعراض أكثر من 10 أيام أو ساءت.',
    redFlagsEn: ['Breathing difficulty', 'Fever over 39.4°C or fever lasting more than 3 days', 'Symptoms worsening after day 5–7'],
    redFlagsAr: ['صعوبة التنفس', 'حمى فوق 39.4°م أو حمى تستمر أكثر من 3 أيام', 'تفاقم الأعراض بعد اليوم 5–7'],
  },
  {
    id: 'influenza',
    nameEn: 'Influenza (flu)',
    nameAr: 'الإنفلونزا',
    keywords: ['flu', 'influenza', 'high fever', 'chills', 'body aches', 'fatigue'],
    keywordsAr: ['انفلونزا', 'إنفلونزا', 'حمى عالية', 'قشعريرة', 'آلام الجسم', 'إرهاق'],
    triage: 'selfcare',
    summaryEn:
      'Sudden-onset fever, muscle aches, headache and dry cough. Most people recover with rest and fluids; antivirals are only useful early and need a clinician.',
    summaryAr:
      'حمى مفاجئة وآلام عضلية وصداع وسعال جاف. يتعافى معظم الناس بالراحة والسوائل؛ الأدوية المضادة للفيروسات مفيدة فقط مبكراً وتحتاج طبيباً.',
    causesEn: ['Influenza viruses A/B', 'Seasonal spread by droplets'],
    causesAr: ['فيروسات الإنفلونزا أ/ب', 'انتقال موسمي عبر الرذاذ'],
    firstAidEn: [
      'Rest, fluids, and light meals.',
      'Keep room ventilated; avoid close contact with vulnerable people.',
      'Track temperature twice daily.',
    ],
    firstAidAr: [
      'الراحة والسوائل ووجبات خفيفة.',
      'تهوية الغرفة وتجنب مخالطة الفئات الهشة.',
      'قياس الحرارة مرتين يومياً.',
    ],
    otcEn: ['Paracetamol or ibuprofen for fever and aches per package instructions.', 'Avoid aspirin in anyone under 16 (Reye syndrome risk).'],
    otcAr: ['باراسيتامول أو إيبوبروفين للحمى والآلام وفق تعليمات العبوة.', 'تجنب الأسبرين لمن هم دون 16 عاماً (خطر متلازمة راي).'],
    specialistEn: 'Primary care; urgent care for high-risk groups (pregnancy, 65+, chronic disease, immunosuppression).',
    specialistAr: 'الرعاية الأولية؛ رعاية عاجلة للفئات عالية الخطورة (الحمل، 65+، الأمراض المزمنة، نقص المناعة).',
    redFlagsEn: ['Breathing difficulty or chest pain', 'Confusion or fainting', 'Fever lasting more than 4 days', 'High-risk person with flu symptoms'],
    redFlagsAr: ['صعوبة تنفس أو ألم صدري', 'تشوش ذهني أو إغماء', 'حمى تستمر أكثر من 4 أيام', 'أعراض إنفلونزا لدى شخص عالي الخطورة'],
  },
  {
    id: 'migraine',
    nameEn: 'Migraine headache',
    nameAr: 'صداع الشقيقة (الميغرين)',
    keywords: ['migraine', 'throbbing headache', 'one-sided headache', 'aura', 'light sensitivity', 'nausea'],
    keywordsAr: ['شقيقة', 'ميغرين', 'صداع نابض', 'صداع نصفي', 'هالة بصرية', 'حساسية للضوء', 'غثيان'],
    triage: 'selfcare',
    summaryEn:
      'Recurring moderate-severe throbbing headache, often one-sided, with light/sound sensitivity or nausea. Attacks usually last 4–72 hours.',
    summaryAr:
      'صداع نابض متوسط إلى شديد متكرر، غالباً في جانب واحد، مع حساسية للضوء/الصوت أو غثيان. تستمر النوبة عادة 4–72 ساعة.',
    causesEn: ['Neurovascular susceptibility, often familial', 'Triggers: sleep loss, skipped meals, stress, dehydration, some foods'],
    causesAr: ['استعداد عصبي وعائي غالباً وراثي', 'محفزات: قلة النوم، تخطي الوجبات، التوتر، الجفاف، بعض الأطعمة'],
    firstAidEn: [
      'Rest in a dark, quiet room; cool compress on forehead.',
      'Hydrate; eat if a meal was skipped.',
      'Note triggers in a diary for the clinician.',
    ],
    firstAidAr: [
      'الراحة في غرفة مظلمة هادئة مع كمادة باردة على الجبهة.',
      'شرب الماء وتناول طعام إذا فُوتت وجبة.',
      'تدوين المحفزات في مفكرة لعرضها على الطبيب.',
    ],
    otcEn: ['Paracetamol, ibuprofen, or aspirin at attack onset per package instructions (adults).', 'Limit painkiller use to under 10 days/month to avoid rebound headache.'],
    otcAr: ['باراسيتامول أو إيبوبروفين أو أسبرين عند بدء النوبة وفق العبوة (للبالغين).', 'قلل المسكنات لأقل من 10 أيام شهرياً لتجنب صداع الارتداد.'],
    specialistEn: 'Neurologist if attacks are frequent (4+ days/month) or disabling.',
    specialistAr: 'طبيب أعصاب إذا كانت النوبات متكررة (4+ أيام شهرياً) أو مُعطِّلة.',
    redFlagsEn: ['Sudden "worst ever" thunderclap headache', 'Headache with fever, stiff neck, rash, or after head injury', 'New neurological weakness, vision loss, or speech change'],
    redFlagsAr: ['صداع مفاجئ شديد جداً ("أسوأ صداع في الحياة")', 'صداع مع حمى أو تيبس رقبة أو طفح أو بعد إصابة رأس', 'ضعف عصبي جديد أو فقدان بصر أو تغير الكلام'],
  },
  {
    id: 'gastroenteritis',
    nameEn: 'Acute gastroenteritis (stomach flu)',
    nameAr: 'التهاب المعدة والأمعاء الحاد (نزلة معوية)',
    keywords: ['diarrhea', 'diarrhoea', 'vomiting', 'stomach cramps', 'food poisoning', 'nausea'],
    keywordsAr: ['إسهال', 'قيء', 'استفراغ', 'مغص', 'تسمم غذائي', 'غثيان'],
    triage: 'selfcare',
    summaryEn:
      'Short-lived vomiting/diarrhoea, usually viral or food-borne. The priority is rehydration; antibiotics are rarely needed.',
    summaryAr:
      'قيء/إسهال قصير الأمد، غالباً فيروسي أو من الطعام. الأولوية لتعويض السوائل؛ المضادات الحيوية نادراً ما تلزم.',
    causesEn: ['Viruses (norovirus, rotavirus)', 'Contaminated food or water', 'Some medicines'],
    causesAr: ['فيروسات (نوروفيروس، روتا)', 'طعام أو ماء ملوث', 'بعض الأدوية'],
    firstAidEn: [
      'Small frequent sips of oral rehydration solution or water.',
      'Resume plain food (rice, banana, toast) as tolerated.',
      'Wash hands thoroughly; avoid preparing food for others.',
    ],
    firstAidAr: [
      'رشفات صغيرة متكررة من محلول معالجة الجفاف أو الماء.',
      'العودة لطعام بسيط (أرز، موز، خبز محمص) حسب التحمل.',
      'غسل اليدين جيداً وتجنب تحضير الطعام للآخرين.',
    ],
    otcEn: ['Oral rehydration salts from the pharmacy.', 'Antidiarrhoeals (e.g. loperamide) only for adults and short-term; avoid if blood in stool or high fever.'],
    otcAr: ['أملاح معالجة الجفاف من الصيدلية.', 'مضادات الإسهال (مثل لوبراميد) للبالغين ولفترة قصيرة فقط؛ تُتجنب عند وجود دم في البراز أو حمى عالية.'],
    specialistEn: 'Primary care if symptoms persist beyond 48–72 hours; paediatrician for children.',
    specialistAr: 'الرعاية الأولية إذا استمرت الأعراض أكثر من 48–72 ساعة؛ طبيب أطفال للأطفال.',
    redFlagsEn: ['Blood in stool or vomit', 'Signs of severe dehydration', 'Fever above 39°C with diarrhoea', 'Symptoms in an infant, elderly, or pregnant person'],
    redFlagsAr: ['دم في البراز أو القيء', 'علامات جفاف شديد', 'حمى فوق 39°م مع إسهال', 'أعراض لدى رضيع أو مسن أو حامل'],
  },
  {
    id: 'allergic-rhinitis',
    nameEn: 'Allergic rhinitis (hay fever)',
    nameAr: 'التهاب الأنف التحسسي (حمى القش)',
    keywords: ['allergy', 'hay fever', 'itchy eyes', 'sneezing', 'pollen', 'dust allergy'],
    keywordsAr: ['حساسية', 'حمى القش', 'حكة العين', 'عطاس', 'حبوب اللقاح', 'حساسية الغبار'],
    triage: 'selfcare',
    summaryEn:
      'Itchy eyes/nose, sneezing and watery discharge triggered by allergens such as pollen or dust mites.',
    summaryAr:
      'حكة في العينين/الأنف وعطاس وإفرازات مائية بسبب محسسات مثل حبوب اللقاح أو عث الغبار.',
    causesEn: ['Pollen, dust mites, pet dander, mould', 'IgE-mediated response in susceptible people'],
    causesAr: ['حبوب اللقاح، عث الغبار، وبر الحيوانات، العفن', 'استجابة مناعية (IgE) لدى الأشخاص المؤهبين'],
    firstAidEn: [
      'Rinse eyes with cool clean water; saline nasal rinse.',
      'Keep windows closed on high-pollen days; shower after outdoor exposure.',
      'Wash bedding hot weekly for dust-mite control.',
    ],
    firstAidAr: [
      'غسل العينين بماء بارد نظيف وغسول ملحي للأنف.',
      'إغلاق النوافذ في أيام انتشار اللقاح والاستحمام بعد الخروج.',
      'غسل المفارش بماء ساخن أسبوعياً للحد من عث الغبار.',
    ],
    otcEn: ['Non-drowsy antihistamine tablet per package instructions.', 'Antihistamine or steroid nasal spray for persistent symptoms.'],
    otcAr: ['مضاد هيستامين غير مسبب للنعاس وفق العبوة.', 'بخاخ أنف بمضاد هيستامين أو ستيرويد للأعراض المستمرة.'],
    specialistEn: 'Allergist / ENT if symptoms are persistent or asthma coexists.',
    specialistAr: 'أخصائي حساسية/أنف وأذن وحنجرة إذا استمرت الأعراض أو وُجد ربو.',
    redFlagsEn: ['Wheeze or breathing difficulty (possible asthma attack)', 'Swelling of lips/tongue or throat tightness'],
    redFlagsAr: ['أزيز أو صعوبة تنفس (ربو محتمل)', 'تورم الشفاه/اللسان أو ضيق الحلق'],
  },
  {
    id: 'contact-dermatitis',
    nameEn: 'Contact dermatitis / eczema flare',
    nameAr: 'التهاب الجلد التماسي / نوبة إكزيما',
    keywords: ['rash', 'itchy skin', 'eczema', 'dermatitis', 'dry patch', 'red patch'],
    keywordsAr: ['طفح', 'حكة جلدية', 'إكزيما', 'التهاب جلد', 'بقعة جافة', 'بقعة حمراء'],
    triage: 'selfcare',
    summaryEn:
      'Itchy, red, dry skin patches after contact with an irritant/allergen, or an eczema flare. Care focuses on barrier repair and avoiding the trigger.',
    summaryAr:
      'بقع جلدية حمراء جافة مثيرة للحكة بعد ملامسة مهيج/محفز أو نوبة إكزيما. العناية تركز على إصلاح حاجز الجلد وتجنب المحفز.',
    causesEn: ['Soaps, detergents, metals (nickel), fragrances, plants', 'Dry skin and scratching worsen flares'],
    causesAr: ['صابون ومنظفات ومعادن (نيكل) وعطور ونباتات', 'جفاف الجلد والهرش يزيدان النوبة'],
    firstAidEn: [
      'Gently wash the area with lukewarm water; pat dry.',
      'Apply a plain fragrance-free moisturiser several times daily.',
      'Cool compress for itch; keep nails short to avoid scratching.',
    ],
    firstAidAr: [
      'غسل المنطقة بلطف بماء فاتر وتجفيفها بالطبطبة.',
      'وضع مرطب خالٍ من العطر عدة مرات يومياً.',
      'كمادة باردة للحكة وتقصير الأظافر لتجنب الهرش.',
    ],
    otcEn: ['Moisturiser (emollient) as the base treatment.', 'Short course of mild hydrocortisone cream on small areas per package instructions; avoid face unless advised.'],
    otcAr: ['مرطب (مطري) كعلاج أساسي.', 'كورس قصير من كريم هيدروكورتيزون خفيف على مناطق صغيرة وفق العبوة؛ يُتجنب على الوجه إلا بمشورة.'],
    specialistEn: 'Dermatologist for widespread, recurrent, or weeping rash.',
    specialistAr: 'طبيب جلدية للطفح الواسع أو المتكرر أو الناضح.',
    redFlagsEn: ['Spreading redness, warmth, pus, or fever (possible infection)', 'Rash that does not fade under pressure with fever', 'Rash involving eyes or mouth'],
    redFlagsAr: ['احمرار ممتد أو سخونة أو صديد أو حمى (عدوى محتملة)', 'طفح لا يختفي بالضغط مع حمى', 'طفح يشمل العينين أو الفم'],
  },
  {
    id: 'insect-bites',
    nameEn: 'Insect bites and stings',
    nameAr: 'لدغات ولسعات الحشرات',
    keywords: ['bite', 'sting', 'mosquito', 'bee', 'wasp', 'swollen bump', 'itchy bump'],
    keywordsAr: ['لدغة', 'لسعة', 'بعوض', 'نحل', 'دبور', 'تورم', 'انتفاخ مثير للحكة'],
    triage: 'selfcare',
    summaryEn:
      'Local itchy or painful bumps after bites/stings. Most settle in days; the main risks are infection from scratching and rare severe allergy.',
    summaryAr:
      'انتفاخات موضعية مثيرة للحكة أو مؤلمة بعد اللدغ. تتحسن خلال أيام؛ أهم المخاطر عدوى من الهرش وحساسية شديدة نادرة.',
    causesEn: ['Mosquitoes, bees, wasps, ants, spiders', 'Local histamine response to saliva/venom'],
    causesAr: ['بعوض ونحل ودبور ونمل وعناكب', 'استجابة هيستامين موضعية للعاب/السم'],
    firstAidEn: [
      'Wash the area with soap and water.',
      'Remove a bee stinger by scraping sideways (do not squeeze).',
      'Cool compress 10 minutes; elevate if on a limb.',
    ],
    firstAidAr: [
      'غسل المنطقة بالماء والصابون.',
      'إزالة إبرة النحل بالكشط جانبياً (دون عصر).',
      'كمادة باردة 10 دقائق ورفع الطرف إذا كانت اللسعة فيه.',
    ],
    otcEn: ['Oral non-drowsy antihistamine for itch.', 'Mild hydrocortisone cream on the bump for a few days per package instructions.'],
    otcAr: ['مضاد هيستامين فموي غير مسبب للنعاس للحكة.', 'كريم هيدروكورتيزون خفيف على الانتفاخ لعدة أيام وفق العبوة.'],
    specialistEn: 'Primary care if signs of infection; allergist after any systemic reaction.',
    specialistAr: 'الرعاية الأولية عند علامات العدوى؛ أخصائي حساسية بعد أي تفاعل جهازي.',
    redFlagsEn: ['Swelling of face/throat, wheeze, dizziness (anaphylaxis)', 'Increasing pain, spreading redness, pus, or fever', 'Multiple stings or a bite on the eye/mouth'],
    redFlagsAr: ['تورم الوجه/الحلق، أزيز، دوار (حساسية مفرطة)', 'ألم متزايد واحمرار ممتد وصديد أو حمى', 'لسعات متعددة أو لدغة في العين/الفم'],
  },
  {
    id: 'sore-throat',
    nameEn: 'Sore throat (pharyngitis)',
    nameAr: 'التهاب الحلق',
    keywords: ['sore throat', 'painful swallowing', 'throat pain', 'tonsils'],
    keywordsAr: ['التهاب الحلق', 'ألم البلع', 'ألم الحلق', 'لوزتان'],
    triage: 'selfcare',
    summaryEn:
      'Mostly viral and self-limiting in about a week. Bacterial (strep) causes are less common and need a clinician’s test to confirm.',
    summaryAr:
      'غالباً فيروسي ويتحسن خلال أسبوع تقريباً. الأسباب البكتيرية (المكورات) أقل شيوعاً وتحتاج فحص الطبيب للتأكيد.',
    causesEn: ['Viruses (cold, flu)', 'Streptococcus bacteria (less common)', 'Dry air, smoking, shouting'],
    causesAr: ['فيروسات (زكام، إنفلونزا)', 'بكتيريا المكورات (أقل شيوعاً)', 'هواء جاف، تدخين، إجهاد الصوت'],
    firstAidEn: [
      'Warm or cold soothing drinks; salt-water gargle (adults/older children).',
      'Lozenges or soft food as tolerated.',
      'Rest the voice; avoid smoke exposure.',
    ],
    firstAidAr: [
      'مشروبات دافئة أو باردة ملطفة وغرغرة ماء ملحي (للبالغين والأطفال الأكبر).',
      'أقراص مص أو طعام لين حسب التحمل.',
      'إراحة الصوت وتجنب الدخان.',
    ],
    otcEn: ['Paracetamol or ibuprofen for pain per package instructions.', 'Anaesthetic lozenges for temporary relief.'],
    otcAr: ['باراسيتامول أو إيبوبروفين للألم وفق العبوة.', 'أقراص مص مخدرة لتخفيف مؤقت.'],
    specialistEn: 'Primary care if fever with white tonsillar spots and no cough (possible strep), or symptoms beyond a week.',
    specialistAr: 'الرعاية الأولية عند حمى مع نقاط بيضاء على اللوزتين دون سعال (عدوى محتملة) أو استمرار الأعراض أكثر من أسبوع.',
    redFlagsEn: ['Difficulty breathing or swallowing saliva / drooling', 'Neck swelling with high fever', 'Rash with sore throat', 'Symptoms beyond 7–10 days'],
    redFlagsAr: ['صعوبة تنفس أو بلع الريق/سيلان اللعاب', 'تورم رقبة مع حمى عالية', 'طفح مع التهاب الحلق', 'أعراض تتجاوز 7–10 أيام'],
  },
];

// ---------- Wound care ----------

export const KB_WOUND_CARE = [
  {
    id: 'minor-cut',
    nameEn: 'Minor cut / laceration',
    nameAr: 'جرح قطعي بسيط',
    keywords: ['cut', 'laceration', 'bleeding', 'knife cut', 'gash'],
    keywordsAr: ['جرح', 'جروح', 'قطع', 'نزيف', 'جرح سكين'],
    triage: 'selfcare',
    stepsEn: [
      'Wash your hands, then rinse the wound under clean running water.',
      'Apply firm direct pressure with a clean cloth for up to 10 minutes to stop bleeding.',
      'Cover with a sterile dressing; change daily or when wet/dirty.',
      'Check tetanus vaccination status for dirty or deep wounds.',
    ],
    stepsAr: [
      'اغسل يديك ثم اشطف الجرح بماء جارٍ نظيف.',
      'اضغط ضغطاً مباشراً بقطعة قماش نظيفة حتى 10 دقائق لإيقاف النزيف.',
      'غطِّ الجرح بضمادة معقمة وغيّرها يومياً أو عند البلل/الاتساخ.',
      'تحقق من حالة تطعيم الكزاز للجروح المتسخة أو العميقة.',
    ],
    avoidEn: ['Do not use hydrogen peroxide or alcohol inside the wound.', 'Do not pick scabs.', 'Do not apply cotton wool directly.'],
    avoidAr: ['لا تستخدم بيروكسيد الهيدروجين أو الكحول داخل الجرح.', 'لا تنزع القشور.', 'لا تضع قطناً مباشرة على الجرح.'],
    infectionSignsEn: ['Increasing pain, redness, warmth, swelling', 'Pus or foul smell', 'Fever or red streaks up the limb'],
    infectionSignsAr: ['ألم متزايد واحمرار وسخونة وتورم', 'صديد أو رائحة كريهة', 'حمى أو خطوط حمراء صاعدة على الطرف'],
    specialistEn: 'Primary care / urgent care if the gap is deep, edges gape, or it was caused by a dirty or rusty object.',
    specialistAr: 'الرعاية الأولية/العاجلة إذا كان الجرح عميقاً أو حوافه متباعدة أو بسبب جسم متسخ أو صدئ.',
  },
  {
    id: 'abrasion',
    nameEn: 'Graze / abrasion',
    nameAr: 'سحجة / خدش',
    keywords: ['graze', 'abrasion', 'scrape', 'road rash', 'scratched'],
    keywordsAr: ['سحجة', 'خدش', 'كشط', 'احتكاك'],
    triage: 'selfcare',
    stepsEn: [
      'Rinse gently with clean running water to remove grit.',
      'Pat dry and apply a plain petroleum jelly or sterile non-stick dressing.',
      'Keep moist and covered until healed; change dressing daily.',
    ],
    stepsAr: [
      'اشطف بلطف بماء جارٍ نظيف لإزالة الأتربة.',
      'جفف بالطبطبة وضع فازلين بسيطاً أو ضمادة غير لاصقة معقمة.',
      'أبقِ الجرح رطباً ومغطى حتى الالتئام مع تغيير الضمادة يومياً.',
    ],
    avoidEn: ['Do not scrub hard.', 'Do not apply antiseptic creams routinely unless advised.'],
    avoidAr: ['لا تفرك بقوة.', 'لا تضع مراهم مطهرة روتينياً إلا بمشورة.'],
    infectionSignsEn: ['Spreading redness', 'Pus', 'Increasing pain after day 2–3'],
    infectionSignsAr: ['احمرار ممتد', 'صديد', 'ألم متزايد بعد اليوم 2–3'],
    specialistEn: 'Primary care if large, deeply embedded grit remains, or infection signs appear.',
    specialistAr: 'الرعاية الأولية إذا كانت السحجة واسعة أو بقيت أتربة عميقة أو ظهرت علامات عدوى.',
  },
  {
    id: 'minor-burn',
    nameEn: 'Minor burn / scald',
    nameAr: 'حرق بسيط / سلق',
    keywords: ['burn', 'scald', 'hot water burn', 'blistered burn', 'sunburn pain'],
    keywordsAr: ['حرق', 'حروق', 'سلق', 'حرق ماء ساخن', 'حرق مع فقاعات'],
    triage: 'urgent',
    stepsEn: [
      'Cool under cool (not iced) running water for 20 minutes as soon as possible.',
      'Remove rings/watches and loose clothing near the burn (not anything stuck).',
      'Cover loosely with cling film or a clean non-fluffy cloth.',
      'Keep the person warm; give paracetamol/ibuprofen for pain per package instructions.',
    ],
    stepsAr: [
      'برّد بماء جارٍ بارد (مثلج ممنوع) لمدة 20 دقيقة في أقرب وقت.',
      'أزل الخواتم/الساعة والملابس الفضفاضة قرب الحرق (ما عدا الملتصق).',
      'غطِّ بغلاف بلاستيكي غذائي أو قماش نظيف غير وبري بشكل فضفاض.',
      'أبقِ الشخص دافئاً وأعطِ باراسيتامول/إيبوبروفين للألم وفق العبوة.',
    ],
    avoidEn: ['No ice, butter, toothpaste, or ointments on the burn.', 'Do not burst blisters.'],
    avoidAr: ['ممنوع الثلج أو الزبدة أو معجون الأسنان أو المراهم على الحرق.', 'لا تفقع الفقاعات.'],
    infectionSignsEn: ['Increasing pain and redness', 'Pus', 'Fever'],
    infectionSignsAr: ['ألم واحمرار متزايدان', 'صديد', 'حمى'],
    specialistEn:
      'Burns service / emergency department for: any burn larger than the palm, burns on face/hands/joints/genitals, deep (white/charred) burns, chemical or electrical burns, or any burn in a child or elderly person.',
    specialistAr:
      'وحدة الحروق/الطوارئ لأي حرق أكبر من كف اليد، أو في الوجه/اليدين/المفاصل/الأعضاء التناسلية، أو حرق عميق (أبيض/متفحم)، أو حرق كيميائي/كهربائي، أو أي حرق لدى طفل أو مسن.',
  },
  {
    id: 'bruise',
    nameEn: 'Bruise (contusion)',
    nameAr: 'كدمة (رضّة)',
    keywords: ['bruise', 'contusion', 'black and blue', 'bump'],
    keywordsAr: ['كدمة', 'رضة', 'ازرقاق', 'ورم بعد ضربة'],
    triage: 'selfcare',
    stepsEn: [
      'Cold pack (wrapped in cloth) for 15–20 minutes, several times in the first day.',
      'Elevate the injured area if possible.',
      'After 48 hours, gentle warmth can help clear the bruise.',
    ],
    stepsAr: [
      'كمادة باردة (ملفوفة بقماش) 15–20 دقيقة عدة مرات في اليوم الأول.',
      'ارفع المنطقة المصابة إن أمكن.',
      'بعد 48 ساعة يمكن استخدام دفء خفيف للمساعدة على زوال الكدمة.',
    ],
    avoidEn: ['Do not massage the bruise in the first days.', 'Do not apply heat in the first 48 hours.'],
    avoidAr: ['لا تدلك الكدمة في الأيام الأولى.', 'لا تضع حرارة في أول 48 ساعة.'],
    infectionSignsEn: ['Bruise enlarging rapidly', 'Bruising without injury or with unusual frequency', 'Severe pain or numbness'],
    infectionSignsAr: ['كدمة تتسع بسرعة', 'كدمات دون إصابة أو متكررة بشكل غير معتاد', 'ألم شديد أو خدر'],
    specialistEn: 'Primary care for unexplained or frequent bruising (review medicines, e.g. blood thinners).',
    specialistAr: 'الرعاية الأولية للكدمات غير المبررة أو المتكررة (مراجعة الأدوية مثل مميعات الدم).',
  },
  {
    id: 'sprain',
    nameEn: 'Sprain / strain',
    nameAr: 'التواء / شد عضلي',
    keywords: ['sprain', 'strain', 'twisted ankle', 'swollen joint', 'ligament'],
    keywordsAr: ['التواء', 'شد عضلي', 'التواء كاحل', 'تورم مفصل', 'أربطة'],
    triage: 'selfcare',
    stepsEn: [
      'Rest the joint; avoid painful activity for the first 48–72 hours.',
      'Ice wrapped in cloth 15–20 minutes every 2–3 hours for the first day.',
      'Compression bandage (snug, not tight) and elevation.',
      'Begin gentle range-of-motion exercises as pain allows after a few days.',
    ],
    stepsAr: [
      'أرح المفصل وتجنب النشاط المؤلم أول 48–72 ساعة.',
      'ثلج ملفوف بقماش 15–20 دقيقة كل 2–3 ساعات في اليوم الأول.',
      'رباط ضاغط (محكم لا خانق) مع رفع الطرف.',
      'ابدأ تمارين حركة لطيفة حسب تحمل الألم بعد عدة أيام.',
    ],
    avoidEn: ['No heat, alcohol, running, or massage in the first 72 hours.', 'Do not ignore inability to bear weight.'],
    avoidAr: ['ممنوع الحرارة والكحول والجري والتدليك أول 72 ساعة.', 'لا تتجاهل عدم القدرة على تحميل الوزن.'],
    infectionSignsEn: ['Inability to bear weight or use the joint', 'Deformity or a "pop" at injury time', 'Numbness or the limb turning cold/pale'],
    infectionSignsAr: ['عدم القدرة على تحميل الوزن أو استخدام المفصل', 'تشوه أو صوت "فرقعة" وقت الإصابة', 'خدر أو برودة/شحوب الطرف'],
    specialistEn: 'Orthopaedics / physiotherapy if unable to bear weight, suspected fracture, or no improvement in 5–7 days.',
    specialistAr: 'عظام/علاج طبيعي عند عدم القدرة على تحميل الوزن أو اشتباه كسر أو عدم تحسن خلال 5–7 أيام.',
  },
  {
    id: 'puncture',
    nameEn: 'Puncture wound (nail, needle, animal bite)',
    nameAr: 'جرح وخزي (مسمار، إبرة، عضة حيوان)',
    keywords: ['puncture', 'nail', 'needle stick', 'animal bite', 'dog bite', 'cat bite'],
    keywordsAr: ['جرح وخزي', 'مسمار', 'وخز إبرة', 'عضة حيوان', 'عضة كلب', 'عضة قطة'],
    triage: 'urgent',
    stepsEn: [
      'Let the wound bleed briefly, then rinse thoroughly with clean running water and soap.',
      'Cover with a sterile dressing.',
      'Seek same-day medical assessment: puncture and bite wounds carry infection and tetanus/rabies risk.',
    ],
    stepsAr: [
      'اترك الجرح ينزف قليلاً ثم اشطفه جيداً بماء جارٍ نظيف وصابون.',
      'غطِّ بضمادة معقمة.',
      'اطلب تقييماً طبياً في نفس اليوم: الجروح الوخزية والعضات تحمل خطر عدوى وكزاز/سعار.',
    ],
    avoidEn: ['Do not close or glue the wound yourself.', 'Do not delay care for animal or human bites.'],
    avoidAr: ['لا تغلق الجرح أو تلصقه بنفسك.', 'لا تؤخر الرعاية لعضات الحيوانات أو الإنسان.', ],
    infectionSignsEn: ['Redness spreading from the wound', 'Pus, increasing pain, fever', 'Red streaks up the limb'],
    infectionSignsAr: ['احمرار ممتد من الجرح', 'صديد وألم متزايد وحمى', 'خطوط حمراء صاعدة على الطرف'],
    specialistEn: 'Urgent care / emergency department same day; report animal bites for rabies risk assessment.',
    specialistAr: 'الرعاية العاجلة/الطوارئ في نفس اليوم؛ بلّغ عن عضات الحيوانات لتقييم خطر السعار.',
  },
];

// ---------- Symptoms ----------

export const KB_SYMPTOMS = [
  {
    id: 'fever',
    nameEn: 'Fever',
    nameAr: 'الحمى',
    keywords: ['fever', 'temperature', 'hot flashes', 'chills'],
    keywordsAr: ['حمى', 'حرارة', 'سخونة', 'قشعريرة'],
    triage: 'selfcare',
    causesEn: ['Viral or bacterial infection elsewhere in the body', 'Heat exposure, some medicines, inflammatory conditions'],
    causesAr: ['عدوى فيروسية أو بكتيرية في موضع آخر', 'تعرض للحرارة، بعض الأدوية، أمراض التهابية'],
    selfCareEn: [
      'Drink fluids; dress lightly; keep the room cool.',
      'Paracetamol or ibuprofen per package instructions if uncomfortable.',
      'Recheck temperature after 30–60 minutes.',
    ],
    selfCareAr: [
      'اشرب السوائل والبس ملابس خفيفة وأبقِ الغرفة باردة.',
      'باراسيتامول أو إيبوبروفين وفق العبوة عند الانزعاج.',
      'أعد قياس الحرارة بعد 30–60 دقيقة.',
    ],
    redFlagsEn: ['Any fever in a baby under 3 months', 'Fever above 39.4°C or lasting more than 3 days', 'Stiff neck, rash that does not fade, confusion, or breathing difficulty'],
    redFlagsAr: ['أي حمى لرضيع أقل من 3 أشهر', 'حمى فوق 39.4°م أو تستمر أكثر من 3 أيام', 'تيبس رقبة أو طفح لا يختفي بالضغط أو تشوش ذهني أو صعوبة تنفس'],
  },
  {
    id: 'cough',
    nameEn: 'Cough',
    nameAr: 'السعال',
    keywords: ['cough', 'coughing', 'dry cough', 'phlegm'],
    keywordsAr: ['سعال', 'كحة', 'سعال جاف', 'بلغم'],
    triage: 'selfcare',
    causesEn: ['Post-viral irritation (most common, up to 3 weeks)', 'Asthma, post-nasal drip, reflux', 'Smoking or dry air'],
    causesAr: ['تهيّج ما بعد العدوى (الأشيع، حتى 3 أسابيع)', 'ربو، إفرازات أنفية خلفية، ارتجاع', 'تدخين أو هواء جاف'],
    selfCareEn: [
      'Fluids and honey in warm drinks (not for babies under 1 year).',
      'Humidify the room; avoid smoke.',
      'Elevate the head of the bed for night cough.',
    ],
    selfCareAr: [
      'سوائل وعسل في مشروبات دافئة (يُمنع للرضع دون سنة).',
      'ترطيب الغرفة وتجنب الدخان.',
      'رفع رأس السرير لسعال الليل.',
    ],
    redFlagsEn: ['Coughing blood', 'Breathing difficulty or wheeze', 'Cough beyond 3 weeks, night sweats, or weight loss'],
    redFlagsAr: ['سعال مصحوب بدم', 'صعوبة تنفس أو أزيز', 'سعال أكثر من 3 أسابيع أو تعرق ليلي أو فقدان وزن'],
  },
  {
    id: 'shortness-breath',
    nameEn: 'Shortness of breath',
    nameAr: 'ضيق التنفس',
    keywords: ['breathless', 'short of breath', 'cannot breathe', 'wheeze', 'chest tight'],
    keywordsAr: ['ضيق تنفس', 'نهجان', 'لا أستطيع التنفس', 'أزيز', 'ضيق صدر'],
    triage: 'emergency',
    causesEn: ['Asthma/COPD flare, chest infection', 'Heart causes, anxiety, anaemia', 'Allergic reaction (with swelling/wheeze)'],
    causesAr: ['نوبة ربو/انسداد رئوي، عدوى صدرية', 'أسباب قلبية، قلق، فقر دم', 'تفاعل تحسسي (مع تورم/أزيز)'],
    selfCareEn: [
      'Sit upright, lean slightly forward, and take slow breaths.',
      'Use a prescribed reliever inhaler as directed in your action plan.',
      'If this is new, severe, or worsening — treat as an emergency.',
    ],
    selfCareAr: [
      'اجلس معتدلاً ومائلاً قليلاً للأمام وتنفس ببطء.',
      'استخدم بخاخ الموسع الموصوف حسب خطتك العلاجية.',
      'إذا كان العرض جديداً أو شديداً أو متفاقماً — تعامل معه كطارئ.',
    ],
    redFlagsEn: ['Blue lips, inability to speak in full sentences, confusion', 'Breathlessness at rest or lying flat', 'With chest pain or after an allergen exposure'],
    redFlagsAr: ['زرقة الشفاه أو عدم القدرة على الكلام بجمل كاملة أو تشوش ذهني', 'ضيق تنفس أثناء الراحة أو عند الاستلقاء', 'مع ألم صدر أو بعد تعرض لمحفز حساسية'],
  },
  {
    id: 'headache',
    nameEn: 'Headache',
    nameAr: 'الصداع',
    keywords: ['headache', 'head pain', 'tension headache'],
    keywordsAr: ['صداع', 'ألم رأس', 'صداع توتري'],
    triage: 'selfcare',
    causesEn: ['Tension/stress, dehydration, skipped meals, poor sleep', 'Migraine (see condition entry)', 'Eye strain, sinus congestion'],
    causesAr: ['توتر/إجهاد، جفاف، تخطي وجبات، قلة نوم', 'شقيقة (انظر مدخل الشقيقة)', 'إجهاد عين، احتقان جيوب'],
    selfCareEn: [
      'Water, a light meal, and a break from screens.',
      'Cool or warm compress; gentle neck/shoulder stretch.',
      'Paracetamol or ibuprofen per package instructions if needed.',
    ],
    selfCareAr: [
      'ماء ووجبة خفيفة واستراحة من الشاشات.',
      'كمادة باردة أو دافئة وتمدد لطيف للرقبة والكتف.',
      'باراسيتامول أو إيبوبروفين وفق العبوة عند الحاجة.',
    ],
    redFlagsEn: ['Thunderclap onset', 'With fever/stiff neck/rash', 'New weakness, vision or speech change', 'Worst-ever or progressively worsening headache'],
    redFlagsAr: ['بدء مفاجئ شديد جداً', 'مع حمى/تيبس رقبة/طفح', 'ضعف جديد أو تغير بصر أو كلام', 'أسوأ صداع في الحياة أو يتفاقم تدريجياً'],
  },
  {
    id: 'abdominal-pain',
    nameEn: 'Abdominal pain',
    nameAr: 'ألم البطن',
    keywords: ['stomach pain', 'abdominal pain', 'belly ache', 'cramps'],
    keywordsAr: ['ألم معدة', 'ألم بطن', 'مغص', 'تقلصات'],
    triage: 'clinic',
    causesEn: ['Gas, constipation, gastroenteritis', 'Menstrual cramps, urinary infection', 'Reflux, gallbladder or appendicitis (specific patterns)'],
    causesAr: ['غازات، إمساك، نزلة معوية', 'آلام دورة شهرية، عدوى مسالك بولية', 'ارتجاع، مرارة أو زائدة دودية (أنماط محددة)'],
    selfCareEn: [
      'Rest; small sips of clear fluids.',
      'Warm compress on the abdomen.',
      'Note location, character, and relation to meals for the clinician.',
    ],
    selfCareAr: [
      'راحة ورشفات صغيرة من سوائل صافية.',
      'كمادة دافئة على البطن.',
      'دوّن الموضع والطبيعة والعلاقة بالوجبات لعرضها على الطبيب.',
    ],
    redFlagsEn: ['Severe pain localised to the right lower side', 'Rigid/board-like abdomen or pain with vomiting blood', 'Pain in pregnancy', 'Pain with fever and no passing of gas/stool'],
    redFlagsAr: ['ألم شديد متمركز أسفل اليمين', 'بطن صلب أو ألم مع قيء دموي', 'ألم أثناء الحمل', 'ألم مع حمى وعدم خروج غازات/براز'],
  },
  {
    id: 'dizziness',
    nameEn: 'Dizziness / light-headedness',
    nameAr: 'دوار / دوخة',
    keywords: ['dizzy', 'dizziness', 'light-headed', 'vertigo', 'faint'],
    keywordsAr: ['دوار', 'دوخة', 'إغماء وشيك', 'دوار دوراني'],
    triage: 'clinic',
    causesEn: ['Dehydration, standing up fast, low blood sugar', 'Inner-ear (vertigo) causes', 'Anaemia, medicines, heart rhythm issues'],
    causesAr: ['جفاف، القيام بسرعة، انخفاض سكر', 'أسباب الأذن الداخلية (دوار دوراني)', 'فقر دم، أدوية، اضطرابات نظم القلب'],
    selfCareEn: [
      'Sit or lie down immediately; rise slowly afterwards.',
      'Drink water; eat something if a meal was missed.',
      'Avoid driving or ladders until resolved.',
    ],
    selfCareAr: [
      'اجلس أو استلقِ فوراً ثم انهض ببطء.',
      'اشرب ماء وتناول طعاماً إذا فُوتت وجبة.',
      'تجنب القيادة أو السلالم حتى زوال العرض.',
    ],
    redFlagsEn: ['Fainting, chest pain, or palpitations', 'Weakness on one side, speech or vision change', 'Head injury beforehand', 'Repeated episodes'],
    redFlagsAr: ['إغماء أو ألم صدر أو خفقان', 'ضعف في جانب واحد أو تغير كلام/بصر', 'إصابة رأس سابقة', 'نوبات متكررة'],
  },
  {
    id: 'nausea',
    nameEn: 'Nausea / vomiting',
    nameAr: 'غثيان / قيء',
    keywords: ['nausea', 'nauseous', 'vomit', 'throwing up', 'queasy'],
    keywordsAr: ['غثيان', 'قيء', 'استفراغ', 'ترجيع'],
    triage: 'selfcare',
    causesEn: ['Gastroenteritis, food intolerance', 'Motion sickness, migraine, pregnancy', 'Medicines, inner-ear causes'],
    causesAr: ['نزلة معوية، عدم تحمل طعام', 'دوار حركة، شقيقة، حمل', 'أدوية، أسباب الأذن الداخلية'],
    selfCareEn: [
      'Pause solid food; sip clear fluids or rehydration solution.',
      'Reintroduce plain food gradually after 6–8 hours without vomiting.',
      'Rest; avoid strong smells.',
    ],
    selfCareAr: [
      'أوقف الطعام الصلب واشرب رشفات سوائل صافية أو محلول معالجة الجفاف.',
      'أعد الطعام البسيط تدريجياً بعد 6–8 ساعات دون قيء.',
      'الراحة وتجنب الروائح القوية.',
    ],
    redFlagsEn: ['Blood or coffee-ground vomit', 'Signs of dehydration', 'Vomiting beyond 24 hours (or any vomiting in a young child)', 'With severe abdominal pain or head injury'],
    redFlagsAr: ['قيء دموي أو يشبه تفل القهوة', 'علامات جفاف', 'قيء أكثر من 24 ساعة (أو أي قيء لدى طفل صغير)', 'مع ألم بطن شديد أو إصابة رأس'],
  },
  {
    id: 'back-pain',
    nameEn: 'Low back pain',
    nameAr: 'ألم أسفل الظهر',
    keywords: ['back pain', 'lower back', 'lumbago', 'back ache'],
    keywordsAr: ['ألم ظهر', 'أسفل الظهر', 'لومباغو', 'وجع ظهر'],
    triage: 'selfcare',
    causesEn: ['Muscle/ligament strain, posture, lifting', 'Disc-related pain (with leg symptoms)', 'Kidney causes (with fever/urinary symptoms)'],
    causesAr: ['شد عضلي/أربطة، وضعية، حمل أثقال', 'ألم متعلق بالديسك (مع أعراض بالساق)', 'أسباب كلوية (مع حمى/أعراض بولية)'],
    selfCareEn: [
      'Keep gently active; avoid bed rest beyond 1–2 days.',
      'Heat pack 15–20 minutes; paracetamol/ibuprofen per package instructions.',
      'Gradual stretching and core work as pain settles.',
    ],
    selfCareAr: [
      'حافظ على نشاط خفيف وتجنب الرقاد أكثر من يوم أو يومين.',
      'كمادة حرارية 15–20 دقيقة وباراسيتامول/إيبوبروفين وفق العبوة.',
      'تمدد تدريجي وتمارين تقوية مع تحسن الألم.',
    ],
    redFlagsEn: ['Numbness in the saddle area or bladder/bowel change', 'Leg weakness', 'Fever with back pain', 'After significant trauma, or with unexplained weight loss'],
    redFlagsAr: ['خدر بمنطقة السرج أو تغير تحكم المثانة/الأمعاء', 'ضعف بالساق', 'حمى مع ألم الظهر', 'بعد إصابة قوية أو مع فقدان وزن غير مبرر'],
  },
];

// ---------- Retrieval helpers ----------

const ARABIC_RE = /[\u0600-\u06ff]/;

/** 'ar' when the text contains Arabic script, otherwise 'en'. */
export function detectLanguage(text) {
  return ARABIC_RE.test(String(text || '')) ? 'ar' : 'en';
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2);
}

function entryKeywords(entry) {
  return [...(entry.keywords ?? []), ...(entry.keywordsAr ?? [])].map((k) =>
    k.toLowerCase(),
  );
}

/**
 * Arabic attaches the definite article and short prepositions/conjunctions to
 * the front of a word, so a query like "للجرح" or "والحمى" would never match the
 * stored keyword "جرح" / "حمى". Both sides of every comparison are passed
 * through this normalizer, so matching stays symmetric and the stored data is
 * never modified. Longest prefixes are tried first, and a prefix is only
 * removed when at least two letters remain.
 */
const AR_PREFIXES = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال', 'و', 'ف', 'ل', 'ب', 'ك'];

function stripArabicPrefix(word) {
  for (const p of AR_PREFIXES) {
    if (word.startsWith(p) && word.length - p.length >= 2) return word.slice(p.length);
  }
  return word;
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .split(/(\s+)/u)
    .map((part) => (/^\s+$/.test(part) || part === '' ? part : stripArabicPrefix(part)))
    .join('');
}

/**
 * Whole-word keyword match. Plain substring matching produced false positives
 * — "sting" inside "fasting", "bee" inside longer words — which could pull a
 * data question onto the first-aid path. Every stored keyword is a full word
 * or phrase, so requiring a letter/number boundary on both sides is safe.
 */
function containsKeyword(haystack, keyword) {
  if (!keyword) return false;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
    'u',
  ).test(haystack);
}

/**
 * Score every KB entry against a free-text query. Returns the best matches
 * across all three collections as [{ type, entry, score }], highest first.
 * Deterministic keyword scoring — no model involved.
 */
export function searchKnowledgeBase(query, { limit = 2 } = {}) {
  const qNorm = normalizeText(query);
  const qTokens = tokenize(qNorm);
  const pools = [
    ['condition', KB_CONDITIONS],
    ['wound', KB_WOUND_CARE],
    ['symptom', KB_SYMPTOMS],
  ];
  const scored = [];
  for (const [type, list] of pools) {
    for (const entry of list) {
      let score = 0;
      const keywords = entryKeywords(entry);
      const normalized = keywords.map((kw) => normalizeText(kw));
      const kwTokens = normalized.flatMap((kw) => tokenize(kw));
      for (let i = 0; i < keywords.length; i += 1) {
        const kwNorm = normalized[i];
        if (kwNorm.length >= 3 && containsKeyword(qNorm, kwNorm)) {
          score += keywords[i].includes(' ') ? 3 : 2;
        }
      }
      for (const t of qTokens) {
        if (kwTokens.includes(t)) score += 1;
      }
      if (score > 0) scored.push({ type, entry, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function triageLabel(level, lang = 'en') {
  const t = KB_TRIAGE_LEVELS.find((x) => x.id === level) ?? KB_TRIAGE_LEVELS[3];
  return lang === 'ar' ? t.labelAr : t.labelEn;
}

/**
 * Plain-text digest of matched entries, used to ground the LLM provider's
 * system prompt so its advice stays consistent with the local references.
 */
export function kbReferenceText(matches, lang = 'en') {
  if (!matches?.length) return '(no matching reference entry)';
  return matches
    .map(({ type, entry }) => {
      const name = lang === 'ar' ? entry.nameAr : entry.nameEn;
      const causes = lang === 'ar' ? entry.causesAr : entry.causesEn;
      const care =
        lang === 'ar'
          ? (entry.firstAidAr ?? entry.stepsAr ?? entry.selfCareAr)
          : (entry.firstAidEn ?? entry.stepsEn ?? entry.selfCareEn);
      const otc = lang === 'ar' ? entry.otcAr : entry.otcEn;
      const redFlags = lang === 'ar' ? entry.redFlagsAr : entry.redFlagsEn;
      const summary = lang === 'ar' ? entry.summaryAr : entry.summaryEn;
      const lines = [
        `[${type}] ${name} — triage: ${triageLabel(entry.triage, lang)}`,
        summary,
        causes?.join('; '),
        care?.join('; '),
        otc?.join('; '),
        redFlags?.join('; '),
      ];
      return lines.filter(Boolean).join(' | ');
    })
    .join('\n');
}

export const KB_COUNTS = {
  conditions: KB_CONDITIONS.length,
  woundCare: KB_WOUND_CARE.length,
  symptoms: KB_SYMPTOMS.length,
  redFlags: KB_RED_FLAGS.length,
};
