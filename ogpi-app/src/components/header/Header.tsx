import React from 'react';
import logo from '../../assets/logo.jpeg';
import avatar from '../../assets/logo.jpeg';
import './Header.css';
import { useAuth } from '../../context/AuthContext.tsx';
import NotificationBell from '../notification/NotificationBell.tsx';

const Header: React.FC = () => {
  const { user } = useAuth();

  const displayName = user?.username || (user ? `${user.prenom || ''} ${user.nom || ''}`.trim() : 'Invité');

  return (
    <header className="app-header">
      <div className="header-center">
        <img src={logo} alt="Logo" className="header-logo" />
        <span className="header-title">BUConsulting</span>
      </div>

      <div className="header-actions">
        <NotificationBell />
        <div className="header-profile">
          <img src={avatar} alt="Profil" className="header-avatar" />
          <div className="header-name">{displayName}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;