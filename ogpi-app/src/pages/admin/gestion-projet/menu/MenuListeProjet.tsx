import React, { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaInfoCircle, FaEdit, FaFolderOpen } from "react-icons/fa";
import "./MenuListeProjet.css";

interface MenuListeProjetProps {
  onDetails?: () => void;
  onEdit?: () => void;
  onViewBacklog?: () => void; // facultatif
}

const MenuListeProjet: React.FC<MenuListeProjetProps> = ({
  onDetails,
  onEdit,
  onViewBacklog,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = (callback?: () => void) => {
    setOpen(false);
    callback?.();
  };

  return (
    <div className="menu-listeprojet" ref={menuRef}>
      <button className="menu-toggle" onClick={toggleMenu}>
        <FaEllipsisV />
      </button>

      {open && (
        <div className="menu-dropdown">
          <button className="menu-item" onClick={() => handleClick(onDetails)}>
            <FaInfoCircle className="menu-icon" /> Détails
          </button>
          <button className="menu-item" onClick={() => handleClick(onEdit)}>
            <FaEdit className="menu-icon" /> Modifier
          </button>
          {onViewBacklog && (
            <button className="menu-item" onClick={() => handleClick(onViewBacklog)}>
              <FaFolderOpen className="menu-icon" /> Backlog(s)
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuListeProjet;