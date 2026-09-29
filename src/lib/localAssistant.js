/**
 * Local grounded assistant — the DEFAULT AI provider.
 *
 * This is a deterministic retrieval-and-summary engine over the grounding
 * snapshot. It is NOT a large language model and makes no clinical inference:
 * every sentence it produces is assembled from values that already exist in
 * application state. When a value does not exist it says
 * "Insufficient data available." rather than guessing.
 *
 * A real model/API can be swapped in later via aiService.registerAIProvider
 * without touching any UI code.
 */

import {
  detectLanguage,
  searchKnowledgeBase,
  triageLabel,
  KB_META,
  KB_RED_FLAGS,
  KB_COUNTS,
} from '../data/medicalKnowledgeBase.js';
import { INSUFFICIENT_EVIDENCE } from './hallucinationGuard.js';

const INSUFFICIENT = INSUFFICIENT_EVIDENCE;

const DISCLAIMER =
  'Prototype / Research System — Data shown in this application may be synthetic. AI-generated results are informational estimates and are not medical diagnoses. Research observation. Requires professional interpretation.';

const DISCLAIMER_AR =
  'نموذج أولي / نظام بحثي — البيانات المعروضة في هذا التطبيق قد تكون اصطناعية. النتائج التي يولدها الذكاء الاصطناعي تقديرات معلوماتية وليست تشخيصات طبية. ملاحظة بحثية وتتطلب تفسيراً مهنياً.';

/**
 * Medical-symptom detector for routing a question to the knowledge-base
 * action-plan intent. Deliberately excludes data-domain phrases such as
 * "blood test" or "biomarker" so those keep their grounded data answers.
 */
const MEDICAL_RE =
  /first aid|triage|emergency|red flag|symptom|pain|ache|hurt|fever|cough|rash|wound|\bcut\b|bleed|burn|scald|sprain|blister|bruise|headache|migraine|nausea|vomit|diarrh|sore throat|dizzi|swell|infect|\bbite\b|bitten|\bsting\b|stung|allerg|breath|flu\b|ألم|حمى|حرارة|سعال|كحة|طفح|جرح|جروح|حرق|حروق|نزيف|التواء|كدم|صداع|آلام|الام|شقيقة|غثيان|قيء|استفراغ|إسهال|دوار|دوخة|تورم|عدوى|أعراض|إسعاف|اسعاف|طوارئ|طارئ|طارئة|ضيق|تنفس|نهجان|إغماء|رعاف|اختلاج|لسعة|لدغة|حساسية|زكام|انفلونزا|إنفلونزا|حلق/;

/**
 * A question also counts as medical when the knowledge base itself recognises
 * it. Requiring a score of 2+ (one real keyword hit, not a stray shared word)
 * keeps data questions such as "explain my latest blood test" on their grounded
 * data path instead of being swallowed by the first-aid intent.
 */
const KB_MEDICAL_SCORE = 2;

function hasKnowledgeBaseMatch(question) {
  const top = searchKnowledgeBase(question, { limit: 1 })[0];
  return Boolean(top) && top.score >= KB_MEDICAL_SCORE;
}

const block = (kind, text) => ({ kind, text });

function fmt(value, unit) {
  return unit ? `${value} ${unit}` : String(value);
}

function rangeNote(entry) {
  if (!entry.referenceRange) return 'no reference range supplied';
  return `reference ${entry.referenceRange}${
    entry.referenceSource === 'laboratory' ? ' (supplied by the laboratory)' : ''
  }`;
}

export const SUGGESTED_QUESTIONS = [
  'Summarize my uploaded health data.',
  'Explain my latest blood test.',
  'Compare my latest result with my previous result.',
  'What changed between my reports?',
  'Which values are outside the laboratory reference range?',
  'Explain this biomarker: Glucose (fasting).',
  'What genetic records do you have?',
  'Summarize my bio-signals.',
  'What is in the research data hub?',
  'Show my trends over time.',
  'First aid for a minor burn on my hand?',
  'When should a headache be treated as an emergency?',
  'ما الإسعافات الأولية لجرح قطعي بسيط؟',
  'متى يكون ضيق التنفس حالة طارئة؟',
];

/**
 * Produce a grounded answer for a free-text question.
 * Returns { blocks: [{ kind, text }] }.
 */
export function answerQuestion(question, snapshot, opts = {}) {
  const q = String(question || '').toLowerCase();

  // Medical / first-aid questions (or any question carrying an image) are
  // answered from the local medical knowledge base as a structured action
  // plan. This runs before the data intents so symptom words are not
  // swallowed by them, and the data intents below never see them.
  if (opts.imageBase64 || MEDICAL_RE.test(q) || hasKnowledgeBaseMatch(q)) {
    return medicalAnswer(question, opts);
  }

  if (/bio-?signal|ecg|eeg|ppg|signal quality|fingerprint|fusion/.test(q))
    return signalsAnswer(snapshot);
  if (/research (data )?hub|hub item|dataset version|research run/.test(q))
    return hubAnswer(snapshot);
  if (/genetic|dna|variant|gene/.test(q)) return geneticAnswer(snapshot);
  if (/device|sensor|patch|wearable/.test(q)) return deviceAnswer(snapshot);
  if (/reference|range|outside|out of range|too high|too low|abnormal/.test(q))
    return outOfRangeAnswer(snapshot);
  if (/compare|previous|difference|what changed|between my reports/.test(q))
    return compareAnswer(snapshot);
  if (/trend|over time|longitudinal|history|month/.test(q)) return trendAnswer(snapshot);
  if (/upload|file|record|report|document/.test(q)) return uploadsAnswer(snapshot);
  if (/explain|what is|biomarker/.test(q)) return biomarkerAnswer(question, snapshot);
  if (/latest|recent|blood test|blood/.test(q)) return latestAnswer(snapshot);
  if (/summar|overview|all my|my (health )?data/.test(q)) return summarizeAnswer(snapshot);

  return defaultAnswer(snapshot);
}

// ---------- intents ----------

function summarizeAnswer(s) {
  const blocks = [];
  blocks.push(
    block(
      'answer',
      `Here is what is currently available in the application for ${s.patient?.name ?? 'the demo subject'} (${s.patient?.age ?? '?'} y, ${s.patient?.sex ?? '?'}).`,
    ),
  );
  blocks.push(
    block('available', `Available data: ${s.available.join('; ') || 'none'}.`),
  );
  if (s.missing.length) {
    blocks.push(block('missing', `Missing data: ${s.missing.join('; ')}.`));
  }
  blocks.push(
    block(
      'available',
      `Counts — ${s.bloodTests.count} laboratory entr${s.bloodTests.count === 1 ? 'y' : 'ies'} across ${s.bloodTests.analytes.length} analyte(s); ${s.medicalRecords.count} uploaded record(s) (${s.medicalRecords.processed} processed); ${s.genetic.count} genetic variant row(s); ${s.signals?.count ?? 0} bio-signal recording(s); ${s.hub?.count ?? 0} hub item(s); ${s.longitudinal.points} longitudinal panel point(s).`,
    ),
  );
  if (!s.bloodTests.count && !s.medicalRecords.count && !(s.signals?.count) && !(s.hub?.count)) {
    blocks.push(block('missing', INSUFFICIENT));
  }
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function latestAnswer(s) {
  const blocks = [];
  if (!s.bloodTests.latest.length) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('missing', 'No blood or laboratory entries exist in the application yet.'));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('answer', 'Most recent value on record for each analyte:'));
  for (const entry of s.bloodTests.latest) {
    blocks.push(
      block(
        'available',
        `${entry.name}: ${fmt(entry.value, entry.unit)} on ${entry.date} — ${rangeNote(entry)}; source: ${entry.source ?? 'unspecified'}.`,
      ),
    );
  }
  if (s.extracted.length) {
    blocks.push(
      block(
        'available',
        `Additionally, ${s.extracted.length} structured value(s) were extracted from uploaded file(s): ${s.extracted
          .map((e) => `${e.name} ${fmt(e.value, e.unit)} (${e.fromRecord})`)
          .join('; ')}.`,
      ),
    );
  }
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function compareAnswer(s) {
  const blocks = [];
  const comparable = s.bloodTests.analytes.filter(
    (name) => (s.bloodTests.trends[name]?.count ?? 0) >= 2,
  );
  if (!comparable.length) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(
      block('missing', 'At least two dated measurements of the same analyte are required to compare; the application currently holds fewer.'),
    );
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('answer', 'Latest vs previous measurement, per analyte:'));
  for (const name of comparable) {
    const t = s.bloodTests.trends[name];
    blocks.push(
      block(
        'available',
        `${name}: ${fmt(t.previous.value, t.previous.unit)} (${t.previous.date}) → ${fmt(t.current.value, t.current.unit)} (${t.current.date}); change ${t.change > 0 ? '+' : ''}${t.change} ${t.current.unit ?? ''}; direction: ${t.direction}.`,
      ),
    );
  }
  blocks.push(
    block('observation', 'Direction labels are neutral descriptors (increasing / decreasing / stable / insufficient data), not clinical judgments.'),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function biomarkerAnswer(question, s) {
  const blocks = [];
  const target = findAnalyte(question, s);
  if (!target) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(
      block(
        'missing',
        `I could not find a biomarker matching "${question.trim()}". Known analytes in the application: ${s.bloodTests.analytes.join(', ') || 'none'}; biomarker cards: ${s.biomarkers.map((b) => b.name).join(', ') || 'none'}.`,
      ),
    );
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }

  const card = s.biomarkers.find((b) => b.name.toLowerCase() === target.key);
  const trend = s.bloodTests.trends[target.key];

  blocks.push(block('answer', `${target.label} — what the application holds:`));
  if (card) {
    blocks.push(
      block('available', `Biomarker card: ${card.value} ${card.unit}; reference ${card.reference}; status flag "${card.status}"; ${card.trendNote ?? ''} (synthetic demo card).`),
    );
  }
  if (trend && trend.count) {
    blocks.push(
      block('available', `Laboratory entries: ${trend.count} measurement(s); latest ${fmt(trend.current.value, trend.current.unit)} on ${trend.current.date}; direction ${trend.direction}.`),
    );
  } else {
    blocks.push(block('missing', 'No dated laboratory entries exist for this analyte.'));
  }
  blocks.push(
    block('association', 'Any link between this biomarker and a condition in this prototype is a possible association from demo data only, not an established clinical finding.'),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function findAnalyte(question, s) {
  const q = question.toLowerCase();
  const candidates = [
    ...s.bloodTests.analytes.map((n) => ({ key: n, label: n })),
    ...s.biomarkers.map((b) => ({ key: b.name, label: b.name })),
  ];
  for (const c of candidates) {
    if (q.includes(c.key.toLowerCase())) return c;
  }
  // Loose aliases
  const aliases = [
    { match: /glucose|sugar/, key: 'Glucose (fasting)' },
    { match: /a1c|hemoglobin a|glycated/, key: 'HbA1c' },
    { match: /ldl|bad cholesterol/, key: 'LDL cholesterol' },
    { match: /hdl|good cholesterol/, key: 'HDL cholesterol' },
    { match: /triglyceride/, key: 'Triglycerides' },
  ];
  for (const a of aliases) {
    if (a.match.test(q)) {
      const hit = candidates.find((c) => c.key.toLowerCase() === a.key.toLowerCase());
      if (hit) return hit;
    }
  }
  return null;
}

function outOfRangeAnswer(s) {
  const blocks = [];
  const withRange = s.bloodTests.latest.filter((b) => b.referenceRange);
  if (!withRange.length) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(
      block('missing', 'No laboratory-supplied reference ranges are on record, so out-of-range status cannot be determined. This prototype never assumes universal reference ranges.'),
    );
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  if (!s.bloodTests.outOfRange.length) {
    blocks.push(block('available', 'All values that carry a laboratory-supplied reference range are currently within that range.'));
  } else {
    blocks.push(block('answer', 'Values outside their laboratory-supplied reference range:'));
    for (const e of s.bloodTests.outOfRange) {
      blocks.push(
        block('available', `${e.name}: ${fmt(e.value, e.unit)} on ${e.date} is ${e.verdict} the supplied range ${e.referenceRange}.`),
      );
    }
  }
  blocks.push(
    block('observation', 'Reference ranges shown were supplied with the value (laboratory or uploaded report); where none was supplied, no range is assumed.'),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function uploadsAnswer(s) {
  const blocks = [];
  if (!s.medicalRecords.count) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('missing', 'No files have been uploaded to the Medical Records centre yet.'));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('answer', `Uploaded records (${s.medicalRecords.count}):`));
  for (const r of s.medicalRecords.items) {
    blocks.push(
      block(
        'available',
        `${r.name} — ${r.category}, .${r.type}, status ${r.status}${r.extractionAvailable ? `, ${r.extractedCount} structured value(s) extracted` : ', automatic structured extraction not available in this prototype'}.`,
      ),
    );
  }
  blocks.push(
    block('observation', 'PDF and image uploads are stored and viewable, but no OCR/PDF parser is configured in this prototype, so no values are extracted from them.'),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function signalsAnswer(s) {
  const blocks = [];
  if (!s.signals?.count) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('missing', 'No bio-signal recordings exist in application state.'));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  const q = s.signals.quality || {};
  blocks.push(
    block(
      'answer',
      `${s.signals.count} bio-signal recording(s) on record (${s.signals.byKind?.raw ?? 0} raw · ${s.signals.byKind?.derived ?? 0} derived).`,
    ),
  );
  blocks.push(
    block(
      'available',
      `Quality grades — GOOD ${q.GOOD ?? 0}, FAIR ${q.FAIR ?? 0}, POOR ${q.POOR ?? 0}, INSUFFICIENT DATA ${q['INSUFFICIENT DATA'] ?? 0}.`,
    ),
  );
  for (const item of (s.signals.items || []).slice(0, 8)) {
    blocks.push(
      block(
        'available',
        `${item.typeLabel} (${item.kind}, ${item.category}) · subject ${item.subjectId || 'unspecified'} · ${item.dataClass} · source ${item.source}.`,
      ),
    );
  }
  blocks.push(
    block(
      'observation',
      'Research observation only. Raw signals and derived measurements are kept distinct. Requires professional interpretation.',
    ),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function hubAnswer(s) {
  const blocks = [];
  if (!s.hub?.count) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('missing', 'The Research Data Hub has no items in application state.'));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('answer', `Research Data Hub contains ${s.hub.count} item(s).`));
  const st = s.hub.byStatus || {};
  blocks.push(
    block(
      'available',
      `Statuses — Processed ${st.Processed ?? 0}, Error ${st.Error ?? 0}, Insufficient data ${st['Insufficient data'] ?? 0}, Uploaded ${st.Uploaded ?? 0}.`,
    ),
  );
  for (const item of (s.hub.items || []).slice(0, 8)) {
    blocks.push(
      block('available', `${item.name} · ${item.category} · ${item.status}${item.note ? ` — ${item.note}` : ''}.`),
    );
  }
  if (s.researchRuns?.count) {
    blocks.push(block('available', `${s.researchRuns.count} research run(s) recorded.`));
  }
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function geneticAnswer(s) {
  const blocks = [];
  if (!s.genetic.count) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('missing', 'No genetic or DNA records exist in the application.'));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('answer', `Genetic variant rows on record (${s.genetic.count}):`));
  for (const v of s.genetic.variants) {
    const lang = v.researchLanguage?.detected || 'Variant detected';
    const assoc = v.researchLanguage?.association || 'No association reported in this record';
    blocks.push(
      block(
        'available',
        `${v.gene} ${v.variant} — ${v.zygosity}; ${lang}; ${assoc}; source: ${v.source}.`,
      ),
    );
  }
  blocks.push(
    block(
      'observation',
      'Research language only ("Variant detected", "Association reported"). A variant record never proves that a person has or will develop a disease.',
    ),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function deviceAnswer(s) {
  const blocks = [];
  if (!s.device) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('available', `Device: ${s.device.name}, firmware ${s.device.firmware}, sync ${s.device.syncInterval}.`));
  blocks.push(block('available', `Sensors: ${s.device.sensors.join('; ')}.`));
  blocks.push(
    block('observation', 'Device readings in this prototype are simulated; they are research observations, not clinical measurements.'),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function trendAnswer(s) {
  const blocks = [];
  const withData = s.bloodTests.analytes.filter((n) => (s.bloodTests.trends[n]?.count ?? 0) > 0);
  if (!withData.length) {
    blocks.push(block('missing', INSUFFICIENT));
    blocks.push(block('disclaimer', DISCLAIMER));
    return { blocks };
  }
  blocks.push(block('answer', 'Trend per analyte (neutral descriptors only):'));
  for (const name of withData) {
    const t = s.bloodTests.trends[name];
    blocks.push(
      block(
        'available',
        `${name}: ${t.count} measurement(s); latest ${fmt(t.current.value, t.current.unit)}; direction ${t.direction}; data completeness ${Math.round(t.completeness * 100)}%.`,
      ),
    );
  }
  blocks.push(
    block('available', `The synthetic longitudinal panel contributes ${s.longitudinal.points} monthly point(s) as a reference series.`),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

function defaultAnswer(s) {
  const blocks = [];
  blocks.push(
    block('answer', 'I can only report on data that exists inside this application. Here is the current picture:'),
  );
  blocks.push(block('available', `Available: ${s.available.join('; ') || 'none'}.`));
  blocks.push(block('missing', s.missing.length ? `Missing: ${s.missing.join('; ')}.` : 'Missing: nothing — all tracked areas have data.'));
  blocks.push(
    block('answer', `Try one of these: ${SUGGESTED_QUESTIONS.slice(0, 4).join(' / ')}`),
  );
  blocks.push(block('disclaimer', DISCLAIMER));
  return { blocks };
}

// ---------- Medical knowledge-base action plan (bilingual) ----------

/**
 * Structured general first-aid guidance assembled ONLY from the local
 * medical knowledge base. Deterministic retrieval, no clinical inference:
 * when nothing matches, it says so and falls back to the universal red-flag
 * list. Never produces a diagnosis.
 */
function medicalAnswer(question, opts = {}) {
  const lang = detectLanguage(question);
  const ar = lang === 'ar';
  const T = (en, arText) => (ar ? arText : en);
  const blocks = [];
  const plan = (chipEn, chipAr, text, tone = 'info', kind = 'plan') =>
    blocks.push({ kind, chip: T(chipEn, chipAr), tone, text, lang });

  blocks.push({
    kind: 'answer',
    lang,
    text: T(
      `General first-aid guidance from the ${KB_META.title} (${KB_COUNTS.conditions} conditions, ${KB_COUNTS.woundCare} wound-care topics, ${KB_COUNTS.symptoms} symptoms, ${KB_COUNTS.redFlags} universal red flags). ${KB_META.scopeNote} This is health education, not a diagnosis of you.`,
      `إرشادات إسعافية عامة من ${KB_META.titleAr} (${KB_COUNTS.conditions} حالات، ${KB_COUNTS.woundCare} مواضيع للعناية بالجروح، ${KB_COUNTS.symptoms} أعراض، ${KB_COUNTS.redFlags} علامات إنذار عامة). ${KB_META.scopeNoteAr} هذه تثقيف صحي وليست تشخيصاً لحالتك.`,
    ),
  });

  if (opts.imageBase64) {
    blocks.push({
      kind: 'observation',
      chip: T('Image attached', 'صورة مرفقة'),
      tone: 'info',
      lang,
      text: T(
        'An image was attached to this question. The offline local assistant cannot inspect images, so no visual description is given here and none is invented. For a visual description and severity assessment, switch the provider to “GPT-4o Medical AI (Vision)” (requires an API key). The guidance below is based on your text only.',
        'أُرفقت صورة مع هذا السؤال. المساعد المحلي دون اتصال لا يستطيع فحص الصور، لذا لا يُقدَّم هنا أي وصف بصري ولا يُختلق وصف. للحصول على وصف بصري وتقييم شدة، بدّل المزوّد إلى “GPT-4o Medical AI (Vision)” (يتطلب مفتاح API). الإرشادات أدناه تستند إلى نصك فقط.',
      ),
    });
  }

  const matches = searchKnowledgeBase(question, { limit: 1 });
  const top = matches[0];

  if (!top) {
    blocks.push({
      kind: 'missing',
      lang,
      text: T(
        'No entry in the local knowledge base matches this question closely enough, so no condition-specific guidance is given rather than guessing. The universal red flags below always apply.',
        'لا يوجد مدخل في قاعدة المعرفة المحلية يطابق هذا السؤال بما يكفي، لذا لا تُقدَّم إرشادات خاصة بحالة معينة بدل التخمين. تنطبق علامات الإنذار العامة أدناه دائماً.',
      ),
    });
  } else {
    const e = top.entry;
    const name = ar ? e.nameAr : e.nameEn;
    const summary = ar ? e.summaryAr : e.summaryEn;
    const causes = ar ? e.causesAr : e.causesEn;
    const care = ar
      ? (e.firstAidAr ?? e.stepsAr ?? e.selfCareAr)
      : (e.firstAidEn ?? e.stepsEn ?? e.selfCareEn);
    const avoid = ar ? e.avoidAr : e.avoidEn;
    const otc = ar ? e.otcAr : e.otcEn;
    const specialist = ar ? e.specialistAr : e.specialistEn;
    const redFlags = ar ? e.redFlagsAr : e.redFlagsEn;
    const infection = ar ? e.infectionSignsAr : e.infectionSignsEn;

    plan(
      'Matched reference entry',
      'المدخل المرجعي المطابق',
      summary ? `${name} — ${summary}` : name,
    );
    plan(
      'Triage level (general guidance)',
      'مستوى الفرز (إرشاد عام)',
      triageLabel(e.triage, lang),
      e.triage === 'emergency' || e.triage === 'urgent' ? 'warn' : 'info',
    );
    if (causes?.length) plan('Possible causes', 'الأسباب المحتملة', causes.join(' · '));
    if (care?.length) {
      plan(
        'Immediate first-aid steps',
        'خطوات الإسعاف الفوري',
        care.map((s, i) => `${i + 1}) ${s}`).join('  '),
        'good',
      );
    }
    if (avoid?.length) plan('Avoid', 'تجنّب', avoid.join(' · '), 'warn');
    if (infection?.length) {
      plan('Signs of infection — seek care', 'علامات العدوى — اطلب الرعاية', infection.join(' · '), 'warn');
    }
    if (otc?.length) {
      plan(
        'OTC information — not a recommendation',
        'معلومات عن أدوية بدون وصفة — ليست توصية',
        `${otc.join(' · ')} — ${ar ? KB_META.otcCautionAr : KB_META.otcCautionEn}`,
        'warn',
      );
    }
    if (specialist) plan('Suggested specialist', 'التخصص الطبي المقترح', specialist);
    if (redFlags?.length) {
      plan(
        'Red flags — seek urgent care',
        'علامات إنذار — اطلب رعاية عاجلة',
        redFlags.join(' · '),
        'bad',
        'redflag',
      );
    }
  }

  plan(
    'Universal emergency red flags',
    'علامات الإنذار الطارئة العامة',
    KB_RED_FLAGS.slice(0, 6)
      .map((r, i) => `${i + 1}) ${ar ? r.textAr : r.textEn} → ${ar ? r.actionAr : r.actionEn}`)
      .join('  '),
    'bad',
    'redflag',
  );

  blocks.push(
    ar
      ? { kind: 'disclaimer', text: DISCLAIMER_AR, lang: 'ar' }
      : block('disclaimer', DISCLAIMER),
  );
  return { blocks };
}
