import React from "react";
import "./CollecteMessages.css";

interface CollecteLoadingMessageProps {
  message?: string;
  visible?: boolean;
}

const CollecteLoadingMessage: React.FC<CollecteLoadingMessageProps> = ({
  message = "Chargement en cours...",
  visible = true,
}) => {
  if (!visible) return null;

  return (
    <div className="collecte-message" role="status" aria-live="polite">
      <div className="collecte-card collecte-loading">
        <div className="collecte-spinner"></div>
        <p className="collecte-text">{message}</p>
      </div>
    </div>
  );
};

export default CollecteLoadingMessage;
