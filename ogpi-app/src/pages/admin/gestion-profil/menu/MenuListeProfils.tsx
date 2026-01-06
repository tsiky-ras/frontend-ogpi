import React, { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaEye, FaEdit } from "react-icons/fa";
import "./MenuListeProfils.css";

interface MenuListeProfilsProps {
  onView: () => void;
  onEdit: () => void;
}

const MenuListeProfils: React.FC<MenuListeProfilsProps> = ({
  onView,
  onEdit,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="menu-listeprofils" ref={menuRef}>
      <button
        className="menu-toggle"
        onClick={() => setOpen(!open)}
        aria-label="Actions"
      >
        <FaEllipsisV />
      </button>

      {open && (
        <div className="menu-dropdown">
          <button
            className="menu-item"
            onClick={() => {
              onView();
              setOpen(false);
            }}
          >
            <FaEye className="menu-icon" />
            Voir fiche
          </button>

          <button
            className="menu-item"
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
          >
            <FaEdit className="menu-icon" />
            Modifier
          </button>
        </div>
      )}
    </div>
  );
};

export default MenuListeProfils;
