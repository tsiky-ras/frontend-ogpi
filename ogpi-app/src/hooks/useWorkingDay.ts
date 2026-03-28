// src/hooks/useWorkingDay.ts
//
// Hook React pour valider et ajuster automatiquement les dates saisies dans les
// formulaires (calendrier paiement, livraison, deadlines…).
//
// Usage dans un formulaire :
//
//   const { ajuster, alerte, effacer } = useWorkingDay(api);
//
//   // Quand l'utilisateur change une date :
//   const handleDateChange = async (value: string) => {
//     setForm(f => ({ ...f, datePaiement: value }));
//     await ajuster(value, (dateAjustee) => {
//       setForm(f => ({ ...f, datePaiement: dateAjustee }));
//     });
//   };
//
//   // Dans le JSX :
//   {alerte && (
//     <div className="alerte-jour-ferie">
//       ⚠️ {alerte.libelleJourFerie} — Date reportée au {alerte.dateAjustee}
//     </div>
//   )}

import { useState, useCallback } from 'react';
import { AxiosInstance } from 'axios';
import { ProchainOuvrableResponse } from '../types/projet/calendrier/JourFerie.tsx';
import { JoursFeriesService } from '../services/projet/calendrier/JoursFeriesService.tsx';

interface AlerteJourFerie {
  dateOriginale: string;
  dateAjustee: string;
  libelleJourFerie: string;
}

interface UseWorkingDayReturn {
  /** Vérifie une date et appelle onAjustement si elle tombe un jour férié */
  ajuster: (
    date: string,
    onAjustement: (dateAjustee: string) => void
  ) => Promise<void>;
  /** Alerte à afficher dans le formulaire (null si pas de jour férié) */
  alerte: AlerteJourFerie | null;
  /** Efface l'alerte en cours */
  effacer: () => void;
  /** Indique si la vérification est en cours */
  loading: boolean;
}

export function useWorkingDay(api: AxiosInstance): UseWorkingDayReturn {
  const [alerte, setAlerte]   = useState<AlerteJourFerie | null>(null);
  const [loading, setLoading] = useState(false);

  const svc = new JoursFeriesService(api);

  const ajuster = useCallback(
    async (date: string, onAjustement: (dateAjustee: string) => void) => {
      if (!date || date.length < 10) return;

      setLoading(true);
      setAlerte(null);

      try {
        const res: ProchainOuvrableResponse = await svc.prochainOuvrable(date);

        if (res.estAjustee) {
          setAlerte({
            dateOriginale:    res.dateOriginale,
            dateAjustee:      res.dateAjustee,
            libelleJourFerie: res.libelleJourFerie || 'Jour férié',
          });
          onAjustement(res.dateAjustee);
        }
      } catch (err) {
        // En cas d'erreur réseau : on laisse la date telle quelle
        console.warn('useWorkingDay : vérification indisponible', err);
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const effacer = useCallback(() => setAlerte(null), []);

  return { ajuster, alerte, effacer, loading };
}
