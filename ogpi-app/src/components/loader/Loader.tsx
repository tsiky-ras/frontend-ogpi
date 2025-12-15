import React from 'react';
import './Loader.css';

interface LoaderProps {
  size?: number;
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ size = 24, text }) => {
  return (
    <div className="loader-container">
      <div className="spinner" style={{ width: size, height: size }} />
      {text && <span className="loader-text">{text}</span>}
    </div>
  );
};

export default Loader;
