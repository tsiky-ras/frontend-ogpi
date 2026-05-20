import React from "react";
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: string | string[];
  icon?: React.ReactNode;
}

const PALETTE: Record<string, string> = {
  tomato:  '#C93C29',
  linen:   '#E8E5D7',
  tuscan:  '#EABF5B',
  dim:     '#5F6F6E',
  charcoal: '#08143d',
};

function normalizeHex(input?: string) {
  if (!input) return undefined;
  const key = input.toLowerCase();
  if (PALETTE[key]) return PALETTE[key];
  if (/^#?[0-9a-f]{6}$/i.test(input)) return input.startsWith('#') ? input : `#${input}`;
  return undefined;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, variant, icon }) => {
  let className = 'stat-card';
  const style: React.CSSProperties & Record<string, string> = {} as any;

  const applyColor = (color: string) => {
    style['--accent-color'] = color;
    style['--accent-light'] = rgba(color, 0.1);
    style['--accent-dark']  = rgba(color, 0.2);
  };

  if (Array.isArray(variant) && variant.length >= 1) {
    const primary = normalizeHex(variant[0]) || PALETTE.tomato;
    applyColor(primary);
  } else if (typeof variant === 'string') {
    const normalized = normalizeHex(variant);
    if (normalized) {
      const key = variant.toLowerCase();
      if (PALETTE[key]) {
        className += ` stat-card--${key}`;
      } else {
        applyColor(normalized);
      }
    }
  }

  return (
    <div className={className} style={style}>
      <div className="stat-card-header">
        <h4 className="stat-title">{title}</h4>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      <p className="stat-value">{value}</p>
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      <div className="stat-card-decoration" />
    </div>
  );
};

export default StatCard;
