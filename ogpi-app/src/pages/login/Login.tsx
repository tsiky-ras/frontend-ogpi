import React, { useState } from 'react';
import './Login.css';
import logo from '../../assets/logo.jpeg';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/loader/Loader.tsx';
import Message from '../../components/message/Message.tsx';
import { FaEye, FaEyeSlash, FaLock, FaEnvelope } from 'react-icons/fa';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading,      setLoading]      = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/admin/gestion-user');
      } else {
        setErrorMessage(result.error || 'Identifiants incorrects');
      }
    } catch {
      setErrorMessage('Erreur inattendue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ── Panneau gauche ── */}
      <div className="login-left">
        <div className="login-left-deco deco-1" />
        <div className="login-left-deco deco-2" />
        <div className="login-left-deco deco-3" />

        <div className="login-brand">
          <div className="login-brand-logo">
            <img src={logo} alt="OGPI" />
          </div>
          <h1 className="login-brand-name">OGPI</h1>
          <p className="login-brand-tagline">
            Gestion de projets &amp; opportunités
          </p>
        </div>

        <div className="login-left-footer">
          <span>© {new Date().getFullYear()} OGPI — Tous droits réservés</span>
        </div>
      </div>

      {/* ── Panneau droit ── */}
      <div className="login-right">
        <div className="login-card">

          <div className="login-card-header">
            <h2>Bienvenue</h2>
            <p>Connectez-vous à votre espace</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>

            <div className="login-field">
              <label htmlFor="login-email">Adresse e-mail</label>
              <div className="login-input-wrap">
                <FaEnvelope className="login-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Mot de passe</label>
              <div className="login-input-wrap">
                <FaLock className="login-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <Message type="error" message={errorMessage} onClose={() => setErrorMessage('')} />
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <Loader size={18} text="Connexion…" /> : 'Se connecter'}
            </button>

          </form>
        </div>
      </div>

    </div>
  );
};

export default Login;
