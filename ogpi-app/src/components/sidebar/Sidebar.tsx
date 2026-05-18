import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { routes } from "../../config/routes.tsx";
import { FaSignOutAlt, FaChevronDown } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.tsx";

const Sidebar = () => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = (label: string) => {
    setOpenMenu(openMenu === label ? null : label);
    setOpenSubMenu(null);
  };

  const toggleSubMenu = (label: string) => {
    setOpenSubMenu(openSubMenu === label ? null : label);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Fonction pour filtrer les routes selon le rôle
  const filterRoutesByRole = (routesToFilter: any[]) => {
    if (!user) return [];

    const roleId = user?.role?.roleId;

    // Si rôle ID = 2 (Admin) - afficher tout
    if ( roleId === 2 || roleId === 1) {
      return routesToFilter;
    }

    return routesToFilter.filter(route => {
      // Filtrer "Utilisateurs" et "Collaborateurs" pour tous les non-admins (roleId !== 2)
      if (route.label === "Utilisateurs" || route.label === "Collaborateurs") {
        return false;
      }

      // Filtrer "Référentiels" pour roleId === 4
      if (route.label === "Référentiels" && roleId === 4) {
        return false;
      }

      // Si la route a des enfants, les filtrer aussi
      if (route.children) {
        const filteredChildren = filterRoutesByRole(route.children);
        // Garder la route parent si elle a au moins un enfant après filtrage
        return filteredChildren.length > 0;
      }

      return true;
    });
  };

  // Fonction pour filtrer récursivement avec copie pour éviter de modifier l'original
  const filterRoutes = (routesToFilter: any[]): any[] => {
    if (!user) return [];

    const roleId = user?.role?.roleId;

    // Si rôle ID = 2 (Admin) - retourner toutes les routes
    if ( roleId === 2 || roleId === 1) {
      return routesToFilter;
    }

    return routesToFilter.reduce((acc: any[], route) => {
      // Vérifier si la route doit être exclue
      let shouldExclude = false;

      // Exclure "Utilisateurs" et "Collaborateurs" pour tous les non-admins
      if (route.label === "Utilisateurs" || route.label === "Collaborateurs") {
        shouldExclude = true;
      }

      // Exclure "Référentiels" pour roleId === 4
      if (route.label === "Référentiels" && roleId === 4) {
        shouldExclude = true;
      }

      if (shouldExclude) {
        return acc;
      }

      // Si la route a des enfants, les filtrer récursivement
      if (route.children) {
        const filteredChildren = filterRoutes(route.children);
        if (filteredChildren.length > 0) {
          // Créer une nouvelle route avec les enfants filtrés
          acc.push({
            ...route,
            children: filteredChildren
          });
        }
      } else {
        // Route sans enfants, l'ajouter directement
        acc.push(route);
      }

      return acc;
    }, []);
  };

  const filteredRoutes = filterRoutes(routes);

  return (
    <div className="sidebar">
      <div className="menu-wrapper">
        <nav className="menu">
          <ul>
            {filteredRoutes.map((route) => (
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