import React, { useState, useCallback } from 'react';
import logo from '../../assets/logo.jpeg';
import avatar from '../../assets/logo.jpeg';
import './Header.css';
import { useAuth } from '../../context/AuthContext.tsx';
import NotificationBell from '../notification/NotificationBell.tsx';
import { useUserService } from '../../services/user/UserService.tsx';
import FicheProfil from '../../pages/admin/gestion-profil/fiche/FicheProfil.tsx';
import { Profil } from '../../types/profil/Profil.tsx';

const Header: React.FC = () => {
  const { user } = useAuth();
  const { getById } = useUserService();

  const [profilData, setProfilData] = useState<Profil | null>(null);
  const [showProfil, setShowProfil]   = useState(false);
  const [loadingProfil, setLoadingProfil] = useState(false);

  const displayName = user?.username || (user ? `${(user as any).prenom || ''} ${(user as any).nom || ''}`.trim() : 'Invité');

  const handleProfileClick = useCallback(async () => {
    if (!user?.userId || loadingProfil) return;
    if (profilData) { setShowProfil(true); return; }
    setLoadingProfil(true);
    try {
      const fullUser = await getById(user.userId);
      if (fullUser.profil) {
        setProfilData(fullUser.profil);
        setShowProfil(true);
      }
    } catch (e) {
      console.error('Erreur chargement profil', e);
    } finally {
      setLoadingProfil(false);
    }
  }, [user?.userId, getById, loadingProfil, profilData]);

  return (
    <>
      <header className="app-header">
        <div className="header-center">
          <img src={logo} alt="Logo" className="header-logo" />
          <span className="header-title">OGPI</span>
        </div>

        <div className="header-actions">
          <NotificationBell />
          <button
            className={`header-profile${loadingProfil ? ' header-profile--loading' : ''}`}
            onClick={handleProfileClick}
            title="Voir mon profil"
          >
            <img src={avatar} alt="Profil" className="header-avatar" />
            <div className="header-name">{displayName}</div>
          </button>
        </div>
      </header>

      {showProfil && profilData && (
        <FicheProfil
          profil={profilData}
          onClose={() => setShowProfil(false)}
        />
      )}
    </>
  );
};

export default Header;
