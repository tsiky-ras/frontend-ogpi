// src/components/jours-feries/AlerteJourFerie.tsx
//
// Composant réutilisable affiché dans n'importe quel formulaire
// quand une date saisie tombe un jour férié et a été décalée.
//
// Usage :
//   const { ajuster, alerte, effacer } = useWorkingDay(api);
//
//   <input
//     type="date"
//     value={form.datePaiement}
//     onChange={async e => {
//       setForm(f => ({ ...f, datePaiement: e.target.value }));
//       await ajuster(e.target.value, (adj) =>
//         setForm(f => ({ ...f, datePaiement: adj }))
//       );
//     }}
//   />
//   <AlerteJourFerie alerte={alerte} onClose={effacer} />

import React from 'react';
import { FaExclamationTriangle, FaTimes, FaCalendarCheck } from 'react-icons/fa';

interface Props {
  alerte: {
    dateOriginale:    string;
    dateAjustee:      string;
    libelleJourFerie: string;
  } | null;
  onClose?: () => void;
}

const AlerteJourFerie: React.FC<Props> = ({ alerte, onClose }) => {
  if (!alerte) return null;

  const fmt = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('fr-MG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '0.65rem',
        background:   '#fff8e1',
        border:       '1px solid #ffc107',
        borderLeft:   '4px solid #ff9800',
        borderRadius: '8px',
        padding:      '0.75rem 1rem',
        fontSize:     '0.83rem',
        color:        '#5a3e00',
        marginTop:    '0.5rem',
        lineHeight:   1.5,
      }}
    >
      <FaExclamationTriangle
        style={{ color: '#ff9800', flexShrink: 0, marginTop: '0.15rem', fontSize: '1rem' }}
      />
      <div style={{ flex: 1 }}>
        <strong>{alerte.libelleJourFerie}</strong> — la date du{' '}
        <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
          {fmt(alerte.dateOriginale)}
        </span>{' '}
        est un jour férié officiel à Madagascar.
        <br />
        <FaCalendarCheck style={{ marginRight: 4, color: '#28a745' }} />
        <strong>Date reportée au {fmt(alerte.dateAjustee)}</strong>{' '}
        (premier jour ouvrable suivant).
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9a7000', padding: '0.1rem', flexShrink: 0,
          }}
          title="Fermer"
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

export default AlerteJourFerie;
