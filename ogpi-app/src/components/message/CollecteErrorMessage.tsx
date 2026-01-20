import React from "react";
import "./CollecteMessages.css";

interface CollecteMessageProps {
  message?: string;
  visible?: boolean;
  onClose?: () => void;
}

const CollecteErrorMessage: React.FC<CollecteMessageProps> = ({
  message = "",
  visible = true,
  onClose,
}) => {
  if (!visible) return null;

  const handleBackdropClick = () => {
    if (onClose) onClose();
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className="collecte-message"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="collecte-card collecte-error" onClick={stopPropagation}>
        <i className="bi bi-x-circle collecte-icon" aria-hidden="true"></i>
        <p className="collecte-text">{message}</p>
      </div>
    </div>
  );
};

export default CollecteErrorMessage;
