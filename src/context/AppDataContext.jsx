import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { patient as seedPatient, biomarkers as seedBiomarkers } from '../data/patientData.js';
import { DEVICE_PROFILE, MONTHLY } from '../data/syntheticData.js';
import {
  SEED_BLOOD_TESTS,
  SEED_GENETIC_RECORDS,
  SEED_MEDICAL_RECORDS,
} from '../data/appDataSeed.js';
import { DEMO_SIGNALS } from '../data/demoBioSignals.js';
import { SEED_PROFILES, emptyProfileRecords, PROFILE_RECORD_KINDS } from '../data/healthProfiles.js';
import { SEED_HUB_ITEMS, SEED_RESEARCH_RUNS } from '../data/researchSeeds.js';
import { normalizeSignal } from '../lib/signalModel.js';
import { normalizeVariant } from '../lib/geneticModel.js';
import { nextVersion, buildDatasetManifest, createResearchRun } from '../lib/researchOps.js';
import { runResearchImport } from '../lib/importPipeline.js';
import { makeId } from '../lib/provenance.js';

/**
 * Normalized application data model for the Human Health Research &
 * Bio-Signal Intelligence Platform.
 *
 * Research collections (hub, signals, runs, datasets, labels) are persisted
 * alongside user-owned medical/lab/genetic/conversation data. Synthetic
 * reference series remain read-only.
 */
const STORAGE_KEY = 'sha_appdata_v2';
const LEGACY_KEY = 'sha_appdata_v1';

function seedSignals() {
  return DEMO_SIGNALS.map((s) =>
    normalizeSignal({ ...s, valuesStorage: 'generated-on-demand' }),
  );
}

function loadPersisted() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

const AppDataContext = createContext(null);

let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${Date.now().toString(36)}-${uid}`;
}

export function AppDataProvider({ children }) {
  const [persisted] = useState(loadPersisted);

  const [medicalRecords, setMedicalRecords] = useState(
    () => persisted?.medicalRecords ?? SEED_MEDICAL_RECORDS,
  );
  const [bloodTests, setBloodTests] = useState(
    () => persisted?.bloodTests ?? SEED_BLOOD_TESTS,
  );
  const [geneticRecords, setGeneticRecords] = useState(() => {
    const seed = persisted?.geneticRecords ?? SEED_GENETIC_RECORDS;
    return seed.map((r) => ({ id: r.id || nextId('gn'), ...normalizeVariant(r) }));
  });
  const [conversations, setConversations] = useState(
    () => persisted?.conversations ?? [],
  );
  const [hubItems, setHubItems] = useState(() => persisted?.hubItems ?? SEED_HUB_ITEMS);
  const [bioSignals, setBioSignals] = useState(() => {
    if (persisted?.bioSignals?.length) {
      return persisted.bioSignals.map((s) => normalizeSignal(s));
    }
    return seedSignals();
  });
  const [researchRuns, setResearchRuns] = useState(
    () => persisted?.researchRuns ?? SEED_RESEARCH_RUNS,
  );
  const [datasetVersions, setDatasetVersions] = useState(() => persisted?.datasetVersions ?? []);
  const [groundTruthLabels, setGroundTruthLabels] = useState(
    () => persisted?.groundTruthLabels ?? [],
  );
  const [activeConversationId, setActiveConversationId] = useState(null);

  // ---------- Multi-profile (family) state ----------
  // One record set per profile. The primary profile's data continues to come
  // from the application-wide stores above; these collections hold whatever
  // has been entered for THIS profile on the unified dashboard.
  const [profiles, setProfiles] = useState(() => persisted?.profiles ?? SEED_PROFILES);
  const [activeProfileId, setActiveProfileIdState] = useState(
    () => persisted?.activeProfileId ?? (persisted?.profiles?.[0]?.id ?? SEED_PROFILES[0].id),
  );
  const [profileRecords, setProfileRecords] = useState(() => persisted?.profileRecords ?? {});

  useEffect(() => {
    try {
      const signalsToStore = bioSignals.map((s) => {
        const copy = { ...s };
        delete copy._inlineValues;
        delete copy._inlineTimes;
        delete copy._inlineLabels;
        if (copy.valuesStorage === 'inline') copy.valuesStorage = 'file-reference';
        return copy;
      });
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          medicalRecords,
          bloodTests,
          geneticRecords,
          conversations,
          hubItems,
          bioSignals: signalsToStore,
          researchRuns,
          datasetVersions,
          groundTruthLabels,
          profiles,
          activeProfileId,
          profileRecords,
        }),
      );
    } catch {
      /* storage unavailable — run in-memory only */
    }
  }, [
    medicalRecords,
    bloodTests,
    geneticRecords,
    conversations,
    hubItems,
    bioSignals,
    researchRuns,
    datasetVersions,
    groundTruthLabels,
    profiles,
    activeProfileId,
    profileRecords,
  ]);

  // ---------- Medical records ----------
  const addMedicalRecord = useCallback((record) => {
    const stored = {
      id: nextId('mr'),
      status: 'idle',
      extractionAvailable: false,
      extracted: [],
      imported: false,
      uploadedAt: new Date().toISOString(),
      ...record,
    };
    setMedicalRecords((prev) => [stored, ...prev]);
    return stored;
  }, []);

  const updateMedicalRecord = useCallback((id, patch) => {
    setMedicalRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }, []);

  const deleteMedicalRecord = useCallback((id) => {
    setMedicalRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ---------- Blood & laboratory ----------
  const addBloodTest = useCallback((entry) => {
    const stored = {
      id: nextId('bt'),
      referenceRange: null,
      referenceSource: null,
      notes: '',
      ...entry,
      date: entry.date || new Date().toISOString().slice(0, 10),
    };
    setBloodTests((prev) => [stored, ...prev]);
    return stored;
  }, []);

  const addBloodTests = useCallback((entries) => {
    const stored = entries.map((e) => ({
      id: nextId('bt'),
      referenceRange: null,
      referenceSource: null,
      notes: '',
      ...e,
    }));
    setBloodTests((prev) => [...stored, ...prev]);
    return stored;
  }, []);

  const deleteBloodTest = useCallback((id) => {
    setBloodTests((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ---------- Genetic ----------
  const addGeneticRecord = useCallback((record) => {
    const stored = { id: nextId('gn'), ...normalizeVariant(record) };
    setGeneticRecords((prev) => [stored, ...prev]);
    return stored;
  }, []);

  const addGeneticRecords = useCallback((records) => {
    const stored = records.map((r) => ({ id: nextId('gn'), ...normalizeVariant(r) }));
    setGeneticRecords((prev) => [...stored, ...prev]);
    return stored;
  }, []);

  const deleteGeneticRecord = useCallback((id) => {
    setGeneticRecords((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ---------- Hub ----------
  const addHubItem = useCallback((item) => {
    const stored = {
      id: nextId('hub'),
      status: 'Uploaded',
      linked: { medicalRecordIds: [], labIds: [], geneticIds: [], signalIds: [] },
      uploadedAt: new Date().toISOString(),
      ...item,
    };
    setHubItems((prev) => [stored, ...prev]);
    return stored;
  }, []);

  const updateHubItem = useCallback((id, patch) => {
    setHubItems((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const deleteHubItem = useCallback((id) => {
    setHubItems((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ---------- Bio-signals ----------
  const addBioSignal = useCallback((record, samples) => {
    const stored = normalizeSignal(
      { id: nextId('sig'), ...record },
      samples ? { values: samples.values, times: samples.times, labels: samples.labels } : undefined,
    );
    setBioSignals((prev) => [stored, ...prev]);
    return stored;
  }, []);

  const addBioSignals = useCallback((records) => {
    const stored = records.map((r) => {
      const inline = r._inlineValues ? { values: r._inlineValues, times: r._inlineTimes, labels: r._inlineLabels } : undefined;
      return normalizeSignal({ id: r.id || nextId('sig'), ...r }, inline);
    });
    setBioSignals((prev) => [...stored, ...prev]);
    return stored;
  }, []);

  const updateBioSignal = useCallback((id, patch) => {
    setBioSignals((prev) =>
      prev.map((s) => (s.id === id ? normalizeSignal({ ...s, ...patch }) : s)),
    );
  }, []);

  const deleteBioSignal = useCallback((id) => {
    setBioSignals((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ---------- Research runs & datasets ----------
  const addResearchRun = useCallback((partial) => {
    const run = createResearchRun(partial);
    setResearchRuns((prev) => [run, ...prev]);
    return run;
  }, []);

  const deleteResearchRun = useCallback((id) => {
    setResearchRuns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const freezeDataset = useCallback((opts) => {
    const version = opts.version || nextVersion(datasetVersions);
    const manifest = buildDatasetManifest({ ...opts, version });
    setDatasetVersions((prev) => [...prev, manifest]);
    return manifest;
  }, [datasetVersions]);

  const deleteDatasetVersion = useCallback((id) => {
    setDatasetVersions((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const setGroundTruth = useCallback((labels) => {
    setGroundTruthLabels(Array.isArray(labels) ? labels : []);
  }, []);

  const addGroundTruthLabel = useCallback((row) => {
    const stored = { id: makeId('gt'), ...row };
    setGroundTruthLabels((prev) => [...prev, stored]);
    return stored;
  }, []);

  /**
   * Full research import: updates hub status honestly and commits only what
   * parsers actually produced (labs / variants / signals).
   */
  const importResearchFile = useCallback(
    async (file, { declaredCategory = null, subjectId = null } = {}) => {
      const hubId = nextId('hub');
      const placeholder = {
        id: hubId,
        name: file.name,
        category: declaredCategory || 'research',
        status: 'Uploaded',
        format: null,
        filename: file.name,
        source: 'Uploaded file',
        dataClass: 'real-user',
        uploadedAt: new Date().toISOString(),
        note: null,
        linked: { medicalRecordIds: [], labIds: [], geneticIds: [], signalIds: [] },
        provenance: null,
      };
      setHubItems((prev) => [placeholder, ...prev]);

      const result = await runResearchImport(file, {
        declaredCategory,
        subjectId,
        onStatus: (status) => {
          setHubItems((prev) =>
            prev.map((h) => (h.id === hubId ? { ...h, status } : h)),
          );
        },
      });

      const labIds = [];
      const geneticIds = [];
      const signalIds = [];

      if (result.labs?.length) {
        const stored = result.labs.map((e) => ({
          id: nextId('bt'),
          referenceRange: e.referenceRange ?? null,
          referenceSource: e.referenceSource ?? (e.referenceRange ? 'dataset-provided' : null),
          notes: '',
          panel: e.panel || 'Custom',
          name: e.name,
          value: e.value,
          unit: e.unit,
          date: e.date || new Date().toISOString().slice(0, 10),
          source: `Uploaded: ${file.name}`,
        }));
        setBloodTests((prev) => [...stored, ...prev]);
        labIds.push(...stored.map((s) => s.id));
      }

      if (result.variants?.length) {
        const stored = result.variants.map((r) => ({
          id: nextId('gn'),
          ...normalizeVariant(r),
        }));
        setGeneticRecords((prev) => [...stored, ...prev]);
        geneticIds.push(...stored.map((s) => s.id));
      }

      if (result.signals?.length) {
        const stored = result.signals.map((s) => {
          const inline = s._inlineValues
            ? { values: s._inlineValues, times: s._inlineTimes, labels: s._inlineLabels }
            : undefined;
          return normalizeSignal({ ...s, id: s.id || nextId('sig') }, inline);
        });
        setBioSignals((prev) => [...stored, ...prev]);
        signalIds.push(...stored.map((s) => s.id));
      }

      setHubItems((prev) =>
        prev.map((h) =>
          h.id === hubId
            ? {
                ...h,
                name: result.filename || file.name,
                category: result.category,
                status: result.status,
                format: result.format,
                filename: result.filename,
                note: result.note,
                provenance: result.provenance,
                linked: { medicalRecordIds: [], labIds, geneticIds, signalIds },
              }
            : h,
        ),
      );

      return { hubId, result, labIds, geneticIds, signalIds };
    },
    [],
  );

  // ---------- Conversations ----------
  const startConversation = useCallback((title = 'New conversation') => {
    const conv = {
      id: nextId('conv'),
      title,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    return conv;
  }, []);

  const appendMessage = useCallback((conversationId, message) => {
    const stored = {
      id: nextId('msg'),
      at: new Date().toISOString(),
      ...message,
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, messages: [...c.messages, stored] } : c,
      ),
    );
    return stored;
  }, []);

  const renameConversation = useCallback((conversationId, title) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
    );
  }, []);

  const deleteConversation = useCallback((conversationId) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setActiveConversationId((cur) => (cur === conversationId ? null : cur));
  }, []);

  const clearConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  // ---------- Profiles (multi-profile / family) ----------
  const setActiveProfileId = useCallback((id) => {
    setActiveProfileIdState(id);
  }, []);

  const addProfile = useCallback((profile = {}) => {
    const stored = {
      name: 'Unnamed profile',
      relation: 'Other relative',
      age: null,
      sex: 'Other / not stated',
      isPrimary: false,
      heightCm: null,
      weightKg: null,
      flags: [],
      ...profile,
      id: profile.id || nextId('profile'),
      createdAt: new Date().toISOString(),
    };
    setProfiles((prev) => [...prev, stored]);
    setProfileRecords((prev) => ({ ...prev, [stored.id]: emptyProfileRecords() }));
    setActiveProfileIdState(stored.id);
    return stored;
  }, []);

  const updateProfile = useCallback((id, patch) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  /**
   * Removes a family profile and everything entered for it. The primary
   * profile and the last remaining profile can never be removed — the
   * dashboard must always have someone to display.
   */
  const removeProfile = useCallback(
    (id) => {
      const target = profiles.find((p) => p.id === id);
      if (!target || target.isPrimary || profiles.length <= 1) return false;
      const remaining = profiles.filter((p) => p.id !== id);
      setProfiles(remaining);
      setProfileRecords((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeProfileId === id) setActiveProfileIdState(remaining[0].id);
      return true;
    },
    [profiles, activeProfileId],
  );

  const setProfileFlags = useCallback((id, flags) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, flags } : p)));
  }, []);

  /** Append one entry to a profile collection (labs / vitals / genes / notes). */
  const addProfileRecord = useCallback((profileId, kind, entry) => {
    if (!PROFILE_RECORD_KINDS.some((k) => k.id === kind)) return null;
    const stored = { id: nextId(kind.slice(0, 2)), createdAt: new Date().toISOString(), ...entry };
    setProfileRecords((prev) => {
      const bucket = prev[profileId] ?? emptyProfileRecords();
      return { ...prev, [profileId]: { ...bucket, [kind]: [stored, ...bucket[kind]] } };
    });
    return stored;
  }, []);

  const deleteProfileRecord = useCallback((profileId, kind, id) => {
    setProfileRecords((prev) => {
      const bucket = prev[profileId];
      if (!bucket || !Array.isArray(bucket[kind])) return prev;
      return { ...prev, [profileId]: { ...bucket, [kind]: bucket[kind].filter((e) => e.id !== id) } };
    });
  }, []);

  const clearProfileRecords = useCallback((profileId) => {
    setProfileRecords((prev) => ({ ...prev, [profileId]: emptyProfileRecords() }));
  }, []);

  const value = useMemo(() => {
    const activeConversation =
      conversations.find((c) => c.id === activeConversationId) ?? null;

    // Fall back to the first profile when a stored id no longer exists (e.g.
    // after a family profile was removed in another tab).
    const activeProfile =
      profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
    const activeProfileRecords = activeProfile
      ? (profileRecords[activeProfile.id] ?? emptyProfileRecords())
      : emptyProfileRecords();

    return {
      patient: seedPatient,
      profile: {
        id: seedPatient.id,
        age: seedPatient.age,
        sex: seedPatient.sex,
        height: seedPatient.height,
        weight: seedPatient.weight,
        bmi: seedPatient.bmi,
        physician: seedPatient.physician,
        clinic: seedPatient.clinic,
        flags: seedPatient.flags,
      },
      biomarkers: seedBiomarkers,
      deviceData: DEVICE_PROFILE,
      longitudinalData: MONTHLY,

      medicalRecords,
      bloodTests,
      geneticRecords,
      conversations,
      activeConversation,
      activeConversationId,

      hubItems,
      bioSignals,
      researchRuns,
      datasetVersions,
      groundTruthLabels,

      profiles,
      activeProfileId,
      activeProfile,
      profileRecords,
      activeProfileRecords,
      getProfileRecords: (profileId) => profileRecords[profileId] ?? emptyProfileRecords(),

      addMedicalRecord,
      updateMedicalRecord,
      deleteMedicalRecord,
      addBloodTest,
      addBloodTests,
      deleteBloodTest,
      addGeneticRecord,
      addGeneticRecords,
      deleteGeneticRecord,
      addHubItem,
      updateHubItem,
      deleteHubItem,
      addBioSignal,
      addBioSignals,
      updateBioSignal,
      deleteBioSignal,
      addResearchRun,
      deleteResearchRun,
      freezeDataset,
      deleteDatasetVersion,
      setGroundTruth,
      addGroundTruthLabel,
      importResearchFile,
      startConversation,
      appendMessage,
      renameConversation,
      deleteConversation,
      clearConversations,
      setActiveConversationId,
      addProfile,
      updateProfile,
      removeProfile,
      setActiveProfileId,
      setProfileFlags,
      addProfileRecord,
      deleteProfileRecord,
      clearProfileRecords,
    };
  }, [
    medicalRecords,
    bloodTests,
    geneticRecords,
    conversations,
    activeConversationId,
    hubItems,
    bioSignals,
    researchRuns,
    datasetVersions,
    groundTruthLabels,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord,
    addBloodTest,
    addBloodTests,
    deleteBloodTest,
    addGeneticRecord,
    addGeneticRecords,
    deleteGeneticRecord,
    addHubItem,
    updateHubItem,
    deleteHubItem,
    addBioSignal,
    addBioSignals,
    updateBioSignal,
    deleteBioSignal,
    addResearchRun,
    deleteResearchRun,
    freezeDataset,
    deleteDatasetVersion,
    setGroundTruth,
    addGroundTruthLabel,
    importResearchFile,
    startConversation,
    appendMessage,
    renameConversation,
    deleteConversation,
    clearConversations,
    addProfile,
    updateProfile,
    removeProfile,
    setProfileFlags,
    addProfileRecord,
    deleteProfileRecord,
    clearProfileRecords,
    profiles,
    activeProfileId,
    profileRecords,
  ]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData must be used inside <AppDataProvider>');
  }
  return ctx;
}
