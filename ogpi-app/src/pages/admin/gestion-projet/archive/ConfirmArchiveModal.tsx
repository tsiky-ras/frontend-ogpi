import React from 'react';
import { FaArchive, FaBoxOpen, FaTimes } from 'react-icons/fa';

interface ConfirmArchiveModalProps {
  show: boolean;
  mode: 'archiver' | 'desarchiver';
  nomProjet: string;
  onConfirm: () => void;
  onCancel: () => void;
  processing?: boolean;
}

const ConfirmArchiveModal: React.FC<ConfirmArchiveModalProps> = ({
  show, mode, nomProjet, onConfirm, onCancel, processing = false,
}) => {
  if (!show) return null;

  const isArchive = mode === 'archiver';

  const palette = isArchive
    ? { iconBg: '#fff7ed', iconBorder: '#fed7aa', iconColor: '#b98a3a', btnBg: '#b98a3a', btnHover: '#9a7530' }
    : { iconBg: '#ecfdf5', iconBorder: '#a7f3d0', iconColor: '#2d8f47', btnBg: '#2d8f47', btnHover: '#246b38' };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={!processing ? onCancel : undefined}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(22, 40, 52, 0.52)',
          backdropFilter: 'blur(3px)',
          cursor: processing ? 'default' : 'pointer',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: 16,
          padding: '36px 32px 28px',
          width: 420,
          maxWidth: '90vw',
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
          textAlign: 'center',
          animation: 'modalSlideIn 0.2s cubic-bezier(.4,0,.2,1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={processing}
          style={{
            position: 'absolute', top: 14, right: 14,
            background: 'none', border: 'none', cursor: processing ? 'default' : 'pointer',
            color: '#94a3b8', padding: 4, borderRadius: 6, lineHeight: 1,
            opacity: processing ? 0.4 : 1,
          }}
          aria-label="Fermer"
        >
          <FaTimes size={14} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: 60, height: 60, borderRadius: '50%',
            background: palette.iconBg,
            border: `2px solid ${palette.iconBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}
        >
          {isArchive
            ? <FaArchive size={24} color={palette.iconColor} />
            : <FaBoxOpen size={24} color={palette.iconColor} />}
        </div>

        {/* Title */}
        <h5 style={{ fontWeight: 800, color: '#223A46', marginBottom: 8, fontSize: '1.1rem', lineHeight: 1.3 }}>
          {isArchive ? 'Archiver ce projet ?' : 'Désarchiver ce projet ?'}
        </h5>

        {/* Description */}
        <p style={{ color: '#5F6F6E', fontSize: '0.87rem', marginBottom: 14, lineHeight: 1.55 }}>
          {isArchive
            ? 'Ce projet sera déplacé dans les archives et masqué de la liste active.'
            : 'Ce projet sera restauré et redeviendra actif dans la liste des projets.'}
        </p>

        {/* Project name chip */}
        <div
          style={{
            fontWeight: 700, color: '#223A46', fontSize: '0.88rem',
            background: '#f1f5f9', borderRadius: 8, padding: '7px 16px',
            display: 'inline-block', marginBottom: 24,
            border: '1px solid #e2e8f0', maxWidth: '100%',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          title={nomProjet}
        >
          « {nomProjet} »
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            disabled={processing}
            style={{
              padding: '9px 22px', borderRadius: 9,
              border: '1px solid #e2e8f0', background: '#f8fafc',
              color: '#374151', fontWeight: 600, fontSize: '0.88rem',
              cursor: processing ? 'default' : 'pointer',
              opacity: processing ? 0.5 : 1,
              transition: 'background 0.15s',
            }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={processing}
            style={{
              padding: '9px 26px', borderRadius: 9,
              border: 'none', background: palette.btnBg,
              color: '#fff', fontWeight: 700, fontSize: '0.88rem',
              cursor: processing ? 'not-allowed' : 'pointer',
              opacity: processing ? 0.7 : 1,
              transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {processing
              ? <><span className="archive-spinner-sm" /> En cours…</>
              : isArchive
                ? <><FaArchive size={12} /> Archiver</>
                : <><FaBoxOpen size={12} /> Désarchiver</>}
          </button>
        </div>

        <style>{`
          @keyframes modalSlideIn {
            from { opacity: 0; transform: scale(0.94) translateY(-8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .archive-spinner-sm {
            display: inline-block; width: 12px; height: 12px;
            border: 2px solid rgba(255,255,255,0.4);
            border-top-color: #fff; border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
};

export default ConfirmArchiveModal;