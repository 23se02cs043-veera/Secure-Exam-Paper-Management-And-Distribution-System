import React from 'react';
import { FaTimes } from 'react-icons/fa';

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizeStyle = size === 'sm' ? '400px' : size === 'lg' ? '700px' : '520px';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: sizeStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="text-primary font-bold" style={{ margin: 0, fontSize: '18px' }}>
            {title}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body" style={{ marginTop: '15px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
