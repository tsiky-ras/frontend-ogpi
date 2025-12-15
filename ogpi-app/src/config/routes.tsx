import { 
  FaTachometerAlt, FaFileAlt, FaQuestionCircle, FaFolder, 
  FaCalendarAlt, FaUsers, FaBook, FaClock, FaTasks, FaFlag 
} from "react-icons/fa";
import React from "react";
export interface RouteType {
  path: string;
  label: string;
  icon: React.ReactNode;
  element?: React.ReactNode;
}

export const routes: RouteType[] = [
  {
    path: '/admin/users',
    label: 'Utilisateurs',
    icon: <FaUsers />,
  },
];
