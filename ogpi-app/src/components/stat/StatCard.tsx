import React from "react";
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle }) => {
  return (
    <div className="stat-card">
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value">{value}</p>
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  );
};

export default StatCard;
