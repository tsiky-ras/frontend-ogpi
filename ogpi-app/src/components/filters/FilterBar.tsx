import React from "react";
import "./FilterBar.css";
import Filter from "./Filter.tsx"; 

type FilterOption = {
  type: "text" | "select" | "button" | "submit";
  placeholder?: string;
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
  label?: string;
  value?: string;
};

interface FilterBarProps {
  filters: FilterOption[];
}

const FilterBar: React.FC<FilterBarProps> = ({ filters }) => {
  return (
    <div className="filters-container">
      {filters.map((filter, index) => {
        if (filter.type === "text") {
          return (
            <input
              key={index}
              type="text"
              placeholder={filter.placeholder}
              className="search-input"
              onChange={(e) => filter.onChange?.(e.target.value)}
            />
          );
        }

        if (filter.type === "select") {
          return (
            <Filter
              key={index}
              options={filter.options || []}
              value={filter.value || ""}
              onChange={(val) => filter.onChange?.(val)}
              width="150px"
            />
          );
        }

        if (filter.type === "button") {
          return (
            <button
              key={index}
              className="filter-button"
              onClick={() => filter.onChange?.("")}
            >
              {filter.label}
            </button>
          );
        }

        if (filter.type === "submit") {
          return (
            <button
              key={index}
              className="submit-button"
              onClick={() => filter.onChange?.("submit")}
            >
              {filter.label || "Soumettre"}
            </button>
          );
        }

        return null;
      })}
    </div>
  );
};

export default FilterBar;
