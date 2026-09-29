import { useMemo, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge, StatCard } from '../components/ui/index.js';
import FileDropzone from '../components/FileDropzone.jsx';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import PrivacyNotice from '../components/PrivacyNotice.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { variantDisplayLine } from '../lib/geneticModel.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';

/**
 * Genetic Research Explorer — research language only.
 * "Variant detected" / "Association reported" — never diagnoses.
 */
export default function GeneticExplorer() {
  const { geneticRecords, importResearchFile, deleteGeneticRecord } = useAppData();
  const [query, setQuery] = useState('');
  const [geneFilter, setGeneFilter] = useState('all');
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const genes = useMemo(() => {
    const set = new Set(geneticRecords.map((g) => g.gene));
    return [...set].sort();
  }, [geneticRecords]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return geneticRecords.filter((g) => {
      if (geneFilter !== 'all' && g.gene !== geneFilter) return false;
      if (!q) return true;
      return (
        g.gene.toLowerCase().includes(q) ||
        g.variant.toLowerCase().includes(q) ||
        String(g.chromosome).includes(q)
      );
    });
  }, [geneticRecords, query, geneFilter]);

  const handleFiles = async (files) => {
    setBusy(true);
    try {
      for (const file of files) {
        const { result } = await importResearchFile(file, {
          declaredCategory: 'genetic',
          subjectId: DEMO_SUBJECTS[0]?.id,
        });
        if (result.status === 'Error') {
          setNote({ tone: 'bad', text: `${file.name}: ${result.note}` });
        } else if (!result.variants?.length) {
          setNote({
            tone: 'warn',
            text: `${file.name}: ${result.note || 'Insufficient data — no variants extracted.'}`,
          });
        } else {
          setNote({
            tone: 'good',
            text: `${file.name}: ${result.variants.length} variant(s) — Variant detected (research language only).`,
          });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PrivacyNotice />
      <MedicalDisclaimer />

      <div className="stat-grid">
        <StatCard
          label="Variants on record"
          value={geneticRecords.length}
          note="Research catalogue"
          tone="info"
          icon={<Icon name="dna" size={16} />}
        />
        <StatCard
          label="Distinct genes"
          value={genes.length}
          note="From loaded records only"
          tone="neutral"
          icon={<Icon name="search" size={16} />}
        />
        <StatCard
          label="With association note"
          value={geneticRecords.filter((g) => g.associationReported).length}
          note={'Association reported — not causal'}
          tone="neutral"
          icon={<Icon name="file" size={16} />}
        />
      </div>

      <Panel
        title="Genetic data pipeline"
        subtitle="CSV / TXT / VCF — PDF shows Parser not configured for this format"
        aside={<Badge tone="proto">research language</Badge>}
      >
        <FileDropzone onFiles={handleFiles} disabled={busy} />
        {note && (
          <p className={`record-note ${note.tone === 'bad' ? 'error' : ''}`}>{note.text}</p>
        )}
      </Panel>

      <Panel
        title="Genetic Research Explorer"
        subtitle="Gene · Variant · Chromosome · Position · Zygosity · Evidence"
        aside={
          <div className="hub-filters">
            <input
              type="search"
              placeholder="Filter gene / variant…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select value={geneFilter} onChange={(e) => setGeneFilter(e.target.value)}>
              <option value="all">All genes</option>
              {genes.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="table-scroll">
          <table className="data-table wide">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Zygosity</th>
                <th>Evidence</th>
                <th>Research language</th>
                <th>Source</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((g) => (
                <tr key={g.id}>
                  <td>
                    <strong>{variantDisplayLine(g)}</strong>
                    <div className="muted-small">{g.classification}</div>
                  </td>
                  <td>{g.zygosity}</td>
                  <td className="muted-small">
                    {g.evidenceLevel || g.evidence}
                    {g.quality != null && ` · Q=${g.quality}`}
                  </td>
                  <td>
                    <Badge tone="info">{g.researchLanguage?.detected || 'Variant detected'}</Badge>
                    <div className="muted-small">
                      {g.researchLanguage?.association || 'No association reported in this record'}
                    </div>
                  </td>
                  <td className="muted-small">{g.source}</td>
                  <td>
                    {!String(g.id).startsWith('gn-seed') && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => deleteGeneticRecord(g.id)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={6} className="muted-small">
                    Insufficient evidence — no matching genetic records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted-small research-obs">
          Research observation. Requires professional interpretation. Not a diagnosis.
        </p>
      </Panel>
    </>
  );
}
