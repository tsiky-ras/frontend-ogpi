import React, { useState } from 'react';
import './Login.css';
import logo from '../../assets/logo.jpeg';
import { useAuth } from '../../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/loader/Loader.tsx';
import Message from '../../components/message/Message.tsx';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/admin/gestion-user');
      } else {
        setErrorMessage(result.error || 'Échec de la connexion');
      }
    } catch (err) {
      setErrorMessage('Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-panel">
        <h1>BU CONSULTING</h1>
      </div>
      <div className="right-panel">
        <img src={logo} alt="Logo" className="logo" />
        <h2>Connexion</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="form-options">
            <label>
            </label>
            <a href="#">Mot de passe oublié</a>
          </div>
            {errorMessage && (
            <div style={{ width: '100%', marginBottom: 5 }}>
              <Message type="error" message={errorMessage} onClose={() => setErrorMessage('')} />
            </div>
            )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader size={18} text="Connexion..." /> : 'Connexion'}
          </button>
          <button type="button" className="btn btn-secondary">S’inscrire</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
