import React, {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
} from 'react';
import { useAuth } from './AuthContext.tsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'TACHE_ASSIGNEE'
  | 'TACHE_REATTRIBUEE'
  | 'TACHE_VALIDEE'
  | 'TACHE_REJETEE'
  | 'TACHE_A_VALIDER'       
  | 'DEADLINE_J7'
  | 'DEADLINE_J3'
  | 'DEADLINE_J1'
  | 'REUNION'
  | 'LEAD_CO'
  | 'LEAD_SOUMIS_PROJET';

export type LienType =
  | 'LEAD'
  | 'PROJET'
  | 'TACHE'
  | 'TACHE_PROJET'
  | 'CALENDRIER'
  | null;

export interface Notif {
  notificationId: number;
  userId: number;
  type: NotifType;
  titre: string;
  message: string | null;
  lu: boolean;
  dateCreation: string;        // ISO datetime
  lienType: LienType;
  lienId: number | null;
  affectedBy: string | null;   // nom de la personne ayant déclenché la notif
  dateEcheance: string | null; // date d'échéance réelle (deadlines)
  // Champs de navigation précis vers la tâche
  taskType: 'LEAD' | 'PROJET' | null;
  backlogLineProfilId: number | null; // FK tâche projet
  leadTaskUserId: number | null;      // FK tâche lead
  // Champs enrichis (peuplés via JOIN côté backend)
  epicNom: string | null;          // nom de l'épic (ligne backlog) — tâche PROJET
  projetNomEnrichi: string | null; // nom du projet — tâche PROJET
  leadNomEnrichi: string | null;   // nom du lead — tâche LEAD
}

interface NotificationContextType {
  nonLus: number;
  notifications: Notif[];
  loading: boolean;
  refresh: () => Promise<void>;
  marquerLu: (id: number) => Promise<void>;
  marquerTousLus: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { api, user } = useAuth();
  const [nonLus, setNonLus] = useState(0);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [resume, list] = await Promise.all([
        api.get('/notifications/resume'),
        api.get('/notifications'),
      ]);
      setNonLus(resume.data?.nonLus ?? 0);
      setNotifications(list.data ?? []);
    } catch {
      // silencieux : pas bloquant si le user n'est pas encore connecté
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Poll toutes les 30 secondes
  useEffect(() => {
    if (!user) return;
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh, user]);

  const marquerLu = async (id: number) => {
    await api.patch(`/notifications/${id}/lu`);
    setNotifications(prev =>
      prev.map(n => n.notificationId === id ? { ...n, lu: true } : n)
    );
    setNonLus(prev => Math.max(0, prev - 1));
  };

  const marquerTousLus = async () => {
    await api.patch('/notifications/lus');
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setNonLus(0);
  };

  return (
    <NotificationContext.Provider value={{ nonLus, notifications, loading, refresh, marquerLu, marquerTousLus }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications doit être utilisé dans un NotificationProvider');
  return ctx;
};