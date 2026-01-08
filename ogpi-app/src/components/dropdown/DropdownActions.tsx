import React, { useState } from "react";
import { FaEllipsisV, FaPen, FaTrash } from "react-icons/fa";
import "./DropdownActions.css";

interface DropdownActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

const DropdownActions: React.FC<DropdownActionsProps> = ({ onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="dropdown-actions">
      <button
        className="btn btn-sm"
        onClick={() => setOpen(!open)}
      >
        <FaEllipsisV />
      </button>

      {open && (
        <div className="dropdown-menu show">
          <button className="dropdown-item" onClick={() => { setOpen(false); onEdit(); }}>
            <FaPen className="me-1" /> Modifier
          </button>
          <button className="dropdown-item text-danger" onClick={() => { setOpen(false); onDelete(); }}>
            <FaTrash className="me-1" /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
};

export default DropdownActions;
