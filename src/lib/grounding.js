/**
 * Grounding snapshot for the AI Health Assistant (#1, #8).
 *
 * The assistant is only ever allowed to read this snapshot, which is built
 * exclusively from application state. It records, per area, what data is
 * AVAILABLE and what is MISSING, so responses can state gaps honestly
 * ("Insufficient evidence" / "Insufficient data available.") instead of inventing values.
 */
import {
  distinctAnalytes,
  seriesFor,
  trendSummary,
  outOfRangeEntries,
  latestPerAnalyte,
  extractedFromRecords,
  dataCounts,
  completenessOf,
} from './appDataSelectors.js';
import { hubCounts } from './researchHub.js';
import { assessSignalQuality, summarizeQuality } from './signalQuality.js';
import { guardSnapshot, INSUFFICIENT_EVIDENCE } from './hallucinationGuard.js';

export { INSUFFICIENT_EVIDENCE };

export function buildSnapshot(appData) {
  const {
    patient,
    biomarkers,
    bloodTests,
    geneticRecords,
    medicalRecords,
    deviceData,
    longitudinalData,
    conversations,
    hubItems = [],
    bioSignals = [],
    researchRuns = [],
    datasetVersions = [],
  } = appData;

  const analytes = distinctAnalytes(bloodTests);
  const trends = {};
  for (const name of analytes) {
    trends[name] = trendSummary(seriesFor(bloodTests, name));
  }

  const counts = dataCounts({
    medicalRecords,
    bloodTests,
    geneticRecords,
    conversations,
    hubItems,
    bioSignals,
    researchRuns,
    datasetVersions,
  });

  const hub = hubCounts(hubItems);
  const qualities = bioSignals.map((s) => assessSignalQuality(s));
  const qualitySummary = summarizeQuality(qualities);

  const available = [];
  const missing = [];

  const push = (cond, label) => (cond ? available.push(label) : missing.push(label));
  push(bloodTests.length > 0, 'Blood & laboratory entries');
  push(medicalRecords.length > 0, 'Uploaded medical records');
  push(extractedFromRecords(medicalRecords).length > 0, 'Structured values extracted from uploads');
  push(geneticRecords.length > 0, 'Genetic variant records');
  push(bioSignals.length > 0, 'Bio-signal recordings');
  push(hubItems.length > 0, 'Research Data Hub items');
  push(researchRuns.length > 0, 'Research runs');
  push(Boolean(longitudinalData?.length), 'Longitudinal synthetic panel');
  push(Boolean(deviceData), 'Device profile');
  push(biomarkers.length > 0, 'Biomarker cards');

  const snapshot = {
    generatedAt: new Date().toISOString(),
    patient: { name: patient?.name, age: patient?.age, sex: patient?.sex },
    biomarkers: biomarkers ?? [],
    bloodTests: {
      count: bloodTests.length,
      analytes,
      latest: latestPerAnalyte(bloodTests),
      trends,
      outOfRange: outOfRangeEntries(bloodTests),
      completeness: completenessOf(bloodTests),
    },
    extracted: extractedFromRecords(medicalRecords),
    medicalRecords: {
      count: medicalRecords.length,
      processed: counts.processedRecords,
      errors: counts.errorRecords,
      items: medicalRecords.map((r) => ({
        id: r.id,
        name: r.displayName || r.originalName,
        type: r.fileType,
        category: r.category,
        status: r.status,
        uploadedAt: r.uploadedAt,
        extractionAvailable: r.extractionAvailable,
        extractedCount: r.extracted?.length ?? 0,
      })),
    },
    genetic: {
      count: geneticRecords.length,
      variants: geneticRecords.map((g) => ({
        id: g.id,
        gene: g.gene,
        variant: g.variant,
        zygosity: g.zygosity,
        researchLanguage: g.researchLanguage,
        source: g.source,
      })),
    },
    signals: {
      count: bioSignals.length,
      byKind: {
        raw: bioSignals.filter((s) => s.kind === 'raw').length,
        derived: bioSignals.filter((s) => s.kind === 'derived').length,
      },
      quality: qualitySummary.counts,
      items: bioSignals.slice(0, 40).map((s) => ({
        id: s.id,
        type: s.type,
        typeLabel: s.typeLabel,
        kind: s.kind,
        category: s.category,
        subjectId: s.subjectId,
        dataClass: s.dataClass,
        source: s.source,
      })),
    },
    hub: {
      count: hub.total,
      byStatus: hub.byStatus,
      byCat: hub.byCat,
      items: hubItems.slice(0, 40).map((h) => ({
        id: h.id,
        name: h.name,
        category: h.category,
        status: h.status,
        note: h.note,
      })),
    },
    researchRuns: {
      count: researchRuns.length,
      items: researchRuns.slice(0, 20).map((r) => ({
        id: r.id,
        title: r.title,
        algorithm: r.algorithm,
      })),
    },
    datasets: {
      count: datasetVersions.length,
    },
    device: deviceData ?? null,
    longitudinal: {
      points: longitudinalData?.length ?? 0,
      latest: longitudinalData?.length
        ? longitudinalData[longitudinalData.length - 1]
        : null,
    },
    conversations: conversations.length,
    available,
    missing,
  };

  return { ...snapshot, guard: guardSnapshot(snapshot) };
}
