import React from "react";
import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: string | string[]; 
}

const PALETTE: Record<string, string> = {
  tomato: '#C93C29',
  linen: '#E8E5D7',
  tuscan: '#EABF5B',
  dim: '#5F6F6E',
  charcoal: '#223A46',
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
  const r = parseInt(h.substring(0,2),16);
  const g = parseInt(h.substring(2,4),16);
  const b = parseInt(h.substring(4,6),16);
  return { r, g, b };
}

function rgba(hex: string, a: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, variant }) => {
  // determine styles based on variant
  let className = 'stat-card';
  const style: React.CSSProperties & Record<string,string> = {} as any;
  const statValueStyle: React.CSSProperties = {};

  if (Array.isArray(variant) && variant.length >= 1) {
    const primary = normalizeHex(variant[0]) || PALETTE.tomato;
    style.background = rgba(primary, 0.08);
    style['--accent-color'] = primary;
    style['--accent-light'] = rgba(primary, 0.1);
    statValueStyle.color = primary;
  } else if (typeof variant === 'string') {
    const normalized = normalizeHex(variant);
    if (normalized) {
      const key = variant.toLowerCase();
      if (PALETTE[key]) {
        className += ` stat-card--${key}`;
      } else {
        style.background = rgba(normalized, 0.08);
        style['--accent-color'] = normalized;
        style['--accent-light'] = rgba(normalized, 0.1);
        statValueStyle.color = normalized;
      }
    }
  }

  return (
    <div className={className} style={style}>
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value" style={statValueStyle}>{value}</p>
      {subtitle && <span className="stat-subtitle">{subtitle}</span>}
    </div>
  );
};

export default StatCard;
