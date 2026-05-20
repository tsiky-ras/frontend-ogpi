import React, { useState } from 'react';
import {
  FaDownload, FaFilePdf, FaFileImage, FaCheck, FaSpinner,
} from 'react-icons/fa';

export interface ExportTabDef {
  key: string;
  label: string;
}

interface Props {
  tabs: ExportTabDef[];
  activeTab: string;
  onSwitchTab: (key: string) => void;
  captureRef: React.RefObject<HTMLElement | null>;
  fileName: string;
  contextName?: string;
}

const DELAY_MS = 700;

const ExportBacklogBtn: React.FC<Props> = ({
  tabs, activeTab, onSwitchTab, captureRef, fileName, contextName,
}) => {
  const [open,      setOpen]      = useState(false);
  const [format,    setFormat]    = useState<'pdf' | 'png'>('pdf');
  const [selected,  setSelected]  = useState<string[]>(tabs.map(t => t.key));
  const [exporting, setExporting] = useState(false);
  const [progress,  setProgress]  = useState('');

  const toggle = (key: string) =>
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const doExport = async () => {
    if (!captureRef.current || selected.length === 0) return;

    setOpen(false);
    setExporting(true);

    const origTab = activeTab;
    const orderedTabs = tabs.filter(t => selected.includes(t.key));
    const pages: { canvas: HTMLCanvasElement; label: string }[] = [];

    try {
      const html2canvas = (await import('html2canvas')).default;

      for (let i = 0; i < orderedTabs.length; i++) {
        const { key, label } = orderedTabs[i];
        setProgress(`${i + 1}/${orderedTabs.length}`);

        onSwitchTab(key);
        await new Promise(r => setTimeout(r, DELAY_MS));

        if (!captureRef.current) break;

        const el = captureRef.current;
        const canvas = await html2canvas(el, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#f8f9fa',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width:  el.scrollWidth,
          height: el.scrollHeight,
        });

        pages.push({ canvas, label });
      }

      if (format === 'pdf') {
        await buildPDF(pages, fileName, contextName);
      } else {
        buildPNG(pages, fileName);
      }
    } catch (err) {
      console.error('[ExportBacklog]', err);
    } finally {
      onSwitchTab(origTab);
      setExporting(false);
      setProgress('');
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* ── Bouton ── */}
      <button
        onClick={() => !exporting && setOpen(o => !o)}
        title="Exporter en PDF ou PNG"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8,
          border: '1.5px solid #d1d5db',
          background: exporting ? '#f3f4f6' : '#ffffff',
          cursor: exporting ? 'default' : 'pointer',
          fontSize: 12, fontWeight: 600,
          color: exporting ? '#6b7280' : '#1e40af',
          whiteSpace: 'nowrap',
        }}
      >
        {exporting
          ? <><FaSpinner className="fa-spin" size={11} /> Export {progress}</>
          : <><FaDownload size={11} /> Exporter</>
        }
      </button>

      {/* ── Panneau de config ── */}
      {open && !exporting && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 9999,
            width: 270, background: '#fff', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb',
            padding: 16, overflow: 'hidden',
          }}>

            {/* Format */}
            <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>
              Format
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['pdf', 'png'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, border: '1.5px solid',
                    borderColor: format === f ? (f === 'pdf' ? '#dc2626' : '#2563eb') : '#e5e7eb',
                    background:  format === f ? (f === 'pdf' ? '#fef2f2' : '#eff6ff') : '#f9fafb',
                    color:       format === f ? (f === 'pdf' ? '#dc2626' : '#2563eb') : '#6b7280',
                    fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  }}
                >
                  {f === 'pdf' ? <FaFilePdf size={12} /> : <FaFileImage size={12} />}
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Onglets à exporter
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setSelected(tabs.map(t => t.key))}
                  style={{ fontSize: 10, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                  Tout
                </button>
                <button onClick={() => setSelected([])}
                  style={{ fontSize: 10, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                  Aucun
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 16, maxHeight: 260, overflowY: 'auto' }}>
              {tabs.map((tab, i) => {
                const on = selected.includes(tab.key);
                return (
                  <div
                    key={tab.key}
                    onClick={() => toggle(tab.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 8px', borderRadius: 7, cursor: 'pointer',
                      background: on ? '#eff6ff' : 'transparent',
                      border: `1px solid ${on ? '#bfdbfe' : 'transparent'}`,
                      userSelect: 'none',
                    }}
                  >
                    <div style={{
                      width: 15, height: 15, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${on ? '#2563eb' : '#d1d5db'}`,
                      background: on ? '#2563eb' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {on && <FaCheck size={8} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: on ? 600 : 400, color: on ? '#1e40af' : '#374151' }}>
                      <span style={{ color: '#94a3b8', marginRight: 4 }}>{i + 1}.</span>
                      {tab.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#f9fafb',
                  fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={doExport}
                disabled={selected.length === 0}
                style={{
                  flex: 2, padding: '8px 0', borderRadius: 8, border: 'none',
                  background: selected.length === 0 ? '#e5e7eb' : '#1e40af',
                  fontSize: 12, fontWeight: 700,
                  color: selected.length === 0 ? '#9ca3af' : '#fff',
                  cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <FaDownload size={10} />
                Exporter ({selected.length})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── PDF ────────────────────────────────────────────────────────────────────

async function buildPDF(
  pages: { canvas: HTMLCanvasElement; label: string }[],
  fileName: string,
  contextName?: string,
) {
  const { jsPDF } = await import('jspdf');
  const PX_PER_MM = 3.7795; // at 96 dpi
  const SCALE = 1.5;
  const HEADER_MM = contextName ? 10 : 0;

  let pdf: InstanceType<typeof jsPDF> | null = null;

  for (const { canvas, label } of pages) {
    const imgWmm = (canvas.width  / SCALE) / PX_PER_MM;
    const imgHmm = (canvas.height / SCALE) / PX_PER_MM;
    const pW = imgWmm;
    const pH = imgHmm + HEADER_MM;
    const orientation = pW > pH ? 'l' : 'p';

    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'mm', format: [pW, pH] });
    } else {
      pdf.addPage([pW, pH], orientation);
    }

    if (contextName) {
      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 140);
      pdf.text(`${contextName}  ·  ${label}`, 8, 7);
      pdf.setTextColor(0, 0, 0);
    }

    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0, HEADER_MM,
      imgWmm, imgHmm,
    );
  }

  pdf!.save(`${sanitize(fileName)}.pdf`);
}

// ─── PNG ─────────────────────────────────────────────────────────────────────

function buildPNG(
  pages: { canvas: HTMLCanvasElement; label: string }[],
  fileName: string,
) {
  if (pages.length === 1) {
    dl(pages[0].canvas.toDataURL('image/png'), `${sanitize(fileName)}.png`);
    return;
  }
  // Stack all canvases vertically into one PNG
  const totalH = pages.reduce((h, p) => h + p.canvas.height, 0);
  const maxW   = Math.max(...pages.map(p => p.canvas.width));
  const out    = document.createElement('canvas');
  out.width  = maxW;
  out.height = totalH;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, maxW, totalH);
  let y = 0;
  for (const { canvas } of pages) {
    ctx.drawImage(canvas, 0, y);
    y += canvas.height;
  }
  dl(out.toDataURL('image/png'), `${sanitize(fileName)}.png`);
}

function dl(dataUrl: string, name: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = name;
  a.click();
}

function sanitize(s: string) {
  return s.replace(/[^a-z0-9-_\s]/gi, '').trim().replace(/\s+/g, '-');
}

export default ExportBacklogBtn;
