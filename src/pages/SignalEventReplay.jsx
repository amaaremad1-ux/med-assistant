import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/icons.jsx';
import { Panel, Badge } from '../components/ui/index.js';
import MedicalDisclaimer from '../components/MedicalDisclaimer.jsx';
import { useAppData } from '../context/AppDataContext.jsx';
import { resolveSignalValues } from '../lib/signalModel.js';
import { detectEvents } from '../lib/signalProcessing.js';
import { DEMO_SUBJECTS } from '../data/researchSeeds.js';
import LineChart from '../components/charts/LineChart.jsx';

/**
 * Multi-channel synchronized timeline replay with playback controls,
 * plus signal event candidates with confidence / algorithm provenance.
 */
export default function SignalEventReplay() {
  const { bioSignals } = useAppData();
  const [subjectId, setSubjectId] = useState(DEMO_SUBJECTS[0]?.id || '');
  const [selectedIds, setSelectedIds] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [speed, setSpeed] = useState(1);
  const raf = useRef(null);

  const pool = useMemo(
    () => bioSignals.filter((s) => s.subjectId === subjectId).slice(0, 12),
    [bioSignals, subjectId],
  );

  useEffect(() => {
    setSelectedIds(pool.slice(0, 3).map((s) => s.id));
    setCursor(0);
    setPlaying(false);
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const channels = useMemo(() => {
    return selectedIds
      .map((id) => bioSignals.find((s) => s.id === id))
      .filter(Boolean)
      .map((rec) => {
        const win = resolveSignalValues(rec, { maxPoints: 600 });
        return { rec, win };
      });
  }, [selectedIds, bioSignals]);

  const maxLen = Math.max(1, ...channels.map((c) => c.win.values?.length || 0));

  useEffect(() => {
    if (!playing) {
      if (raf.current) cancelAnimationFrame(raf.current);
      return undefined;
    }
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setCursor((c) => {
        const next = c + dt * 40 * speed;
        if (next >= maxLen) {
          setPlaying(false);
          return maxLen - 1;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, speed, maxLen]);

  const series = useMemo(() => {
    const colors = ['var(--primary)', 'var(--accent)', 'var(--good)', 'var(--warn)'];
    return channels.map((ch, i) => {
      const pts = (ch.win.values || [])
        .map((y, x) => ({ x, y: Number.isFinite(y) ? y : null }))
        .filter((p) => p.y != null);
      return {
        id: ch.rec.id,
        label: ch.rec.typeLabel,
        color: colors[i % colors.length],
        points: pts,
      };
    });
  }, [channels]);

  const events = useMemo(() => {
    if (!channels[0]) return null;
    return detectEvents(channels[0].rec, { maxPoints: 1500 });
  }, [channels]);

  const toggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4),
    );
  };

  return (
    <>
      <MedicalDisclaimer />

      <Panel
        title="Signal event replay"
        subtitle="Multi-channel synchronized timeline · opaque subject codes only (no health values in URLs)"
        aside={
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {DEMO_SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        }
      >
        <div className="channel-picker">
          {pool.map((s) => (
            <label key={s.id} className="channel-chip">
              <input
                type="checkbox"
                checked={selectedIds.includes(s.id)}
                onChange={() => toggle(s.id)}
              />
              {s.typeLabel}
              <Badge tone="neutral">{s.kind}</Badge>
            </label>
          ))}
          {!pool.length && <p className="muted-small">No signals for this subject.</p>}
        </div>

        <div className="replay-controls">
          <button type="button" className="btn primary" onClick={() => setPlaying((p) => !p)}>
            <Icon name={playing ? 'x' : 'pulse'} size={14} />
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" className="btn ghost" onClick={() => { setCursor(0); setPlaying(false); }}>
            Reset
          </button>
          <label>
            Speed
            <input
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
            {speed}×
          </label>
          <label className="replay-scrub">
            Cursor
            <input
              type="range"
              min={0}
              max={maxLen - 1}
              value={Math.min(cursor, maxLen - 1)}
              onChange={(e) => {
                setPlaying(false);
                setCursor(Number(e.target.value));
              }}
            />
            {Math.round(cursor)} / {maxLen}
          </label>
        </div>

        {series.length > 0 ? (
          <div className="replay-chart">
            <LineChart
              series={series}
              height={260}
              formatX={(i) => String(Math.round(i))}
              formatY={(v) => (Math.abs(v) >= 100 ? Math.round(v) : Number(v).toFixed(2))}
            />
            <div
              className="replay-cursor-hint muted-small"
              style={{ marginTop: 8 }}
            >
              Playback cursor at sample index {Math.round(cursor)} (research visualization only).
            </div>
          </div>
        ) : (
          <p className="muted-small">Select at least one channel with resolvable samples.</p>
        )}
      </Panel>

      <Panel
        title="Signal event detection"
        subtitle="Candidates with confidence and algorithm provenance — not clinical events"
      >
        {!events && <p className="muted-small">Select a channel to detect events.</p>}
        {events?.status === 'insufficient-data' && (
          <p className="record-note error">{events.reason}</p>
        )}
        {events?.events?.length > 0 && (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>t</th>
                  <th>Confidence</th>
                  <th>Algorithm</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {events.events.slice(0, 40).map((ev, i) => (
                  <tr key={ev.id || `${ev.eventType}-${ev.offsetSec ?? i}-${i}`}>
                    <td>{ev.eventTypeLabel || ev.eventType || ev.type || ev.label}</td>
                    <td className="num">{ev.offsetSec ?? ev.t ?? ev.index ?? '—'}</td>
                    <td className="num">
                      {typeof ev.confidence === 'object'
                        ? ev.confidence?.value ?? '—'
                        : ev.confidence ?? '—'}
                    </td>
                    <td className="muted-small">{ev.algorithm || '—'}</td>
                    <td className="muted-small">
                      {typeof ev.confidence === 'object'
                        ? ev.confidence?.basis
                        : ev.note || ev.reason || 'Research candidate'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {events && !events.events?.length && events.status !== 'insufficient-data' && (
          <p className="muted-small">No event candidates in this window.</p>
        )}
        <p className="muted-small research-obs">
          Research event candidates. Not clinical events and not diagnoses.
        </p>
      </Panel>
    </>
  );
}
