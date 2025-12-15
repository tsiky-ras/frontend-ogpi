import React from 'react';
import './Message.css';

type MessageType = 'error' | 'success' | 'info';

interface MessageProps {
  type?: MessageType;
  message: string;
  onClose?: () => void;
}

const Message: React.FC<MessageProps> = ({ type = 'info', message, onClose }) => {
  return (
    <div className={`message ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span className="message-text">{message}</span>
      {onClose && (
        <button className="message-close" onClick={onClose} aria-label="Close message">
          ×
        </button>
      )}
    </div>
  );
};

export default Message;
