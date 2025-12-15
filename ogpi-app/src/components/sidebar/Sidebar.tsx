import React from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import { routes } from "../../config/routes.tsx";
import { FaSignOutAlt } from "react-icons/fa";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="menu-wrapper">
        <nav className="menu">
            {routes.map(({ path, label, icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    "menu-link" + (isActive ? " active" : "")
                  }
                >
                  {icon} <span>{label}</span>
                </NavLink>
              </li>
            ))}
        </nav>
      </div>

      <div className="logout">
        <button>
          <FaSignOutAlt /> <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
