import React, { useState, useRef, useEffect } from "react";
import { FaEllipsisV, FaInfoCircle, FaEdit } from "react-icons/fa";
import "./MenuListeUser.css";

interface MenuListeUserProps {
  onDetails?: () => void;
  onEdit?: () => void;
}

const MenuListeUser: React.FC<MenuListeUserProps> = ({ onDetails, onEdit }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  // Ferme le menu si clic extérieur
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
    <div className="menu-listeuser" ref={menuRef}>
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
        </div>
      )}
    </div>
  );
};

export default MenuListeUser;
