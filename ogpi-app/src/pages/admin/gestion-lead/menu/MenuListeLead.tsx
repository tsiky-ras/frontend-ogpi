import React, { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaInfoCircle, FaEdit, FaFolderOpen } from "react-icons/fa";
import "./MenuListeLead.css";

interface MenuListeLeadProps {
  onDetails?: () => void;
  onEdit?: () => void;
  onViewBacklog?: () => void;
  hideDetails?: boolean; // ✅ ajouté
}

const MenuListeLead: React.FC<MenuListeLeadProps> = ({
  onDetails,
  onEdit,
  onViewBacklog,
  hideDetails = false, // ✅ valeur par défaut
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
    <div className="menu-listelead" ref={menuRef}>
      <button className="menu-toggle" onClick={toggleMenu}>
        <FaEllipsisV />
      </button>

      {open && (
        <div className="menu-dropdown">
          
          {/* ✅ Afficher Détails seulement si hideDetails = false */}
          {!hideDetails && (
            <button className="menu-item" onClick={() => handleClick(onDetails)}>
              <FaInfoCircle className="menu-icon" /> Détails
            </button>
          )}

          {/* ✅ Si hideDetails = true → "Voir" au lieu de "Modifier" */}
          <button className="menu-item" onClick={() => handleClick(onEdit)}>
            <FaEdit className="menu-icon" /> {hideDetails ? "Voir" : "Modifier"}
          </button>

          <button
            className="menu-item"
            onClick={() => handleClick(onViewBacklog)}
          >
            <FaFolderOpen className="menu-icon" /> Recap DAO
          </button>

        </div>
      )}
    </div>
  );
};

export default MenuListeLead;