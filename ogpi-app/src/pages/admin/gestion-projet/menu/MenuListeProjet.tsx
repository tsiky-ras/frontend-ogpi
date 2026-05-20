import React, { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaInfoCircle, FaLayerGroup, FaBoxOpen, FaEdit } from "react-icons/fa";
import "./MenuListeProjet.css"; // Réutilise le même CSS

interface MenuListeProjetProps {
  onDetails?: () => void;
  onEdit?: () => void;
  onViewBacklog?: () => void;
  onArchiver?: () => void;
  onDesarchiver?: () => void;
}

const MenuListeProjet: React.FC<MenuListeProjetProps> = ({
  onDetails,
  onEdit,
  onViewBacklog,
  onArchiver,
  onDesarchiver,
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
          {onEdit && (
            <button className="menu-item" onClick={() => handleClick(onEdit)}>
              <FaEdit className="menu-icon" /> Modifier
            </button>
          )}
          {onViewBacklog && (
            <button className="menu-item" onClick={() => handleClick(onViewBacklog)}>
              <FaLayerGroup className="menu-icon" /> Workload
            </button>
          )}
          {onArchiver && (
            <button
              className="menu-item menu-item--archive"
              onClick={() => handleClick(onArchiver)}
            >
              <FaBoxOpen className="menu-icon" /> Archiver
            </button>
          )}

          {onDesarchiver && (
            <button
              className="menu-item menu-item--archive"
              onClick={() => handleClick(onDesarchiver)}
            >
              <FaBoxOpen className="menu-icon" /> Désarchiver
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MenuListeProjet;