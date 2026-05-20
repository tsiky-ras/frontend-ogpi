import React from "react";
import { FaTimesCircle, FaTimes } from "react-icons/fa";
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

  return (
    <div
      className="collecte-message"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="collecte-card collecte-error" onClick={e => e.stopPropagation()}>
        {onClose && (
          <button className="collecte-close" onClick={onClose} aria-label="Fermer">
            <FaTimes size={13} />
          </button>
        )}
        <FaTimesCircle className="collecte-icon collecte-icon-react" aria-hidden="true" />
        <p className="collecte-text">{message}</p>
      </div>
    </div>
  );
};

export default CollecteErrorMessage;
