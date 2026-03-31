import React, { useState, useEffect, useRef } from "react";
import { Table as BootstrapTable, Card } from "react-bootstrap";
import "./Table.css";
import Pagination from "../pagination/Pagination.tsx";
import { ChevronDown, Eye, EyeOff, RotateCcw } from "lucide-react";
import ReactDOM from "react-dom";

type Column = {
  key: string;
  label: string;
  parent?: string;
  render?: (row: any) => React.ReactNode;
};

type TableProps = {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  expandedRowId?: string | number | null;
  expandedRow?: (row: any) => React.ReactNode;
  multiHeaderParent?: boolean;
  storageKey?: string;
  defaultVisibleColumns?: string[]; // ← NOUVEAU : clés des colonnes visibles par défaut
};

const Table: React.FC<TableProps> = ({
  columns,
  data,
  onRowClick,
  expandedRowId,
  expandedRow,
  multiHeaderParent = false,
  storageKey = "table_columns_visibility",
  defaultVisibleColumns,
}) => {
  const [page, setPage] = useState(1);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const rowsPerPage = 5;

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return columns.map(col => col.key).filter(key => parsed.includes(key));
      }
    } catch {}
    // Si defaultVisibleColumns est fourni, on l'utilise — sinon toutes les colonnes
    return defaultVisibleColumns ?? columns.map(col => col.key);
  });

  const selectorRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [data]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns, storageKey]);

  const indexOfLastRow = page * rowsPerPage;
  const currentRows = data.slice(indexOfLastRow - rowsPerPage, indexOfLastRow);

  const toggleColumnVisibility = (key: string) => {
    setVisibleColumns(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    );
  };

  const toggleAllColumns = () => {
    setVisibleColumns(
      visibleColumns.length === columns.length
        ? []
        : columns.map(col => col.key)
    );
  };

  // Reset revient aux colonnes par défaut (defaultVisibleColumns si fourni, sinon toutes)
  const resetColumns = () =>
    setVisibleColumns(defaultVisibleColumns ?? columns.map(col => col.key));

  const filteredColumns = columns.filter(col => visibleColumns.includes(col.key));

  const renderHeader = () => {
    if (!multiHeaderParent) {
      return (
        <tr>
          {filteredColumns.map(col => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      );
    }

    const parentRow: JSX.Element[] = [];
    let lastParent: string | undefined;
    let colspan = 0;

    filteredColumns.forEach((col, idx) => {
      if (col.parent) {
        if (col.parent !== lastParent) {
          if (colspan > 0 && lastParent) {
            parentRow.push(
              <th key={lastParent} colSpan={colspan} style={{ textAlign: "center" }}>
                {lastParent}
              </th>
            );
          }
          lastParent = col.parent;
          colspan = 1;
        } else colspan++;
      } else {
        if (colspan > 0 && lastParent) {
          parentRow.push(
            <th key={lastParent} colSpan={colspan} style={{ textAlign: "center" }}>
              {lastParent}
            </th>
          );
          lastParent = undefined;
          colspan = 0;
        }
        parentRow.push(
          <th key={col.key} rowSpan={2}>
            {col.label}
          </th>
        );
      }

      if (idx === filteredColumns.length - 1 && lastParent && colspan > 0) {
        parentRow.push(
          <th key={lastParent} colSpan={colspan} style={{ textAlign: "center" }}>
            {lastParent}
          </th>
        );
      }
    });

    const childRow = (
      <tr>
        {filteredColumns
          .filter(col => col.parent)
          .map(col => (
            <th key={col.key}>{col.label}</th>
          ))}
      </tr>
    );

    return (
      <>
        <tr>{parentRow}</tr>
        {childRow}
      </>
    );
  };

  const handleToggleDropdown = () => {
    if (!showColumnSelector && selectorRef.current) {
      const rect = selectorRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        left: rect.left - 115,
      });
    }
    setShowColumnSelector(!showColumnSelector);
  };

  return (
    <Card className="table-card">
      <div className="table-header">
        <div className="table-title">
          <h5>Tableau</h5>
          <span className="col-count">
            {visibleColumns.length}/{columns.length}
          </span>
        </div>

        <div className="col-selector-container">
          <button ref={selectorRef} className="col-toggle-btn" onClick={handleToggleDropdown}>
            <Eye size={16} /> Colonnes
            <ChevronDown
              size={16}
              style={{
                transform: showColumnSelector ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {showColumnSelector &&
            dropdownPos &&
            ReactDOM.createPortal(
              <div className="col-selector-dropdown" style={dropdownPos}>
                <div className="col-selector-actions">
                  <button onClick={toggleAllColumns}>
                    {visibleColumns.length === columns.length
                      ? "Tout décocher"
                      : "Tout cocher"}
                  </button>
                  <button onClick={resetColumns} title="Réinitialiser">
                    <RotateCcw size={14} />
                  </button>
                </div>

                <div className="col-list-scroll">
                  {columns.map(col => {
                    const isVisible = visibleColumns.includes(col.key);
                    return (
                      <div
                        key={col.key}
                        className={`col-item ${isVisible ? "visible" : ""}`}
                        onClick={() => toggleColumnVisibility(col.key)}
                      >
                        <input type="checkbox" checked={isVisible} readOnly />
                        <span>{col.label}</span>
                        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </div>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>

      <div className="table-wrapper">
        <BootstrapTable bordered hover className="custom-table mb-0">
          <thead>{renderHeader()}</thead>
          <tbody>
            {currentRows.map((row, idx) => (
              <React.Fragment key={row.id || idx}>
                <tr
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ cursor: onRowClick ? "pointer" : "default" }}
                >
                  {filteredColumns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>

                {expandedRowId === row.id && expandedRow && (
                  <tr>
                    <td colSpan={filteredColumns.length}>
                      {expandedRow(row)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </BootstrapTable>

        <Pagination
          currentPage={page}
          totalPages={Math.ceil(data.length / rowsPerPage)}
          onPageChange={setPage}
        />
      </div>
    </Card>
  );
};

export default Table;