import React from "react";
import "./Filter.css";

type Option = {
  value: string;
  label: string;
};

type FilterProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  width?: string | number;
};

const Filter: React.FC<FilterProps> = ({ options, value, onChange, width = "150px" }) => {
  return (
    <div className="filter-container">
      <select
        className="status-select"
        style={{ width }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Filter;
