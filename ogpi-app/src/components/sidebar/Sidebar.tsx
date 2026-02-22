import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { routes } from "../../config/routes.tsx";
import { FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.tsx"; // <-- import du hook

const Sidebar = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const { logout } = useAuth(); // <-- récupère logout
  const navigate = useNavigate(); // <-- pour rediriger après logout

  const toggleMenu = (label: string) => {
    setOpenMenu(openMenu === label ? null : label);
    setOpenSubMenu(null);
  };

  const toggleSubMenu = (label: string) => {
    setOpenSubMenu(openSubMenu === label ? null : label);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login"); // redirection vers la page de login
  };

  return (
    <div className="sidebar">
      <div className="menu-wrapper">
        <nav className="menu">
          <ul>
            {routes.map((route) => (
              <li key={route.label}>
                {route.path && !route.children && (
                  <NavLink
                    to={route.path}
                    className={({ isActive }) =>
                      "menu-link" + (isActive ? " active" : "")
                    }
                  >
                    {route.icon}
                    <span>{route.label}</span>
                  </NavLink>
                )}

                {route.children && (
                  <>
                    <div
                      className="menu-link menu-link-parent"
                      onClick={() => toggleMenu(route.label)}
                    >
                      <div className="menu-label">
                        {route.icon}
                        <span>{route.label}</span>
                      </div>
                      <FaChevronDown
                        className={
                          "chevron" +
                          (openMenu === route.label ? " open" : "")
                        }
                      />
                    </div>

                    {openMenu === route.label && (
                      <ul className="submenu">
                        {route.children.map((child) => (
                          <li key={child.label}>
                            {child.children ? (
                              <>
                                <div
                                  className="submenu-link submenu-parent"
                                  onClick={() => toggleSubMenu(child.label)}
                                >
                                  {child.icon}
                                  <span>{child.label}</span>
                                  <FaChevronDown
                                    className={
                                      "chevron" +
                                      (openSubMenu === child.label
                                        ? " open"
                                        : "")
                                    }
                                  />
                                </div>

                                {openSubMenu === child.label && (
                                  <ul className="submenu-level-2">
                                    {child.children.map((sub) => (
                                      <li key={sub.path}>
                                        <NavLink
                                          to={sub.path}
                                          className={({ isActive }) =>
                                            "submenu-link" +
                                            (isActive ? " active" : "")
                                          }
                                        >
                                          {sub.icon}
                                          <span>{sub.label}</span>
                                        </NavLink>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </>
                            ) : (
                              <NavLink
                                to={child.path}
                                className={({ isActive }) =>
                                  "submenu-link" + (isActive ? " active" : "")
                                }
                              >
                                {child.icon}
                                <span>{child.label}</span>
                              </NavLink>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="logout">
        <button onClick={handleLogout}>
          <FaSignOutAlt />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
