import React, { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import "./GenericForm.css";

type GenericFormProps<T> = {
  valueKey: keyof T;
  initialData?: T | null;
  onSubmit: (data: T) => void;
  onCancel: () => void;
  submitLabel: string;
  title?: string;
  extraInputs?: { name: keyof T; label: string; type?: string }[];
};

function GenericForm<T>({
  valueKey,
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  extraInputs = [],
}: GenericFormProps<T>) {
  // Initialisation avec tous les champs existants
  const [formData, setFormData] = useState<T>(() => {
    const baseData = initialData ? { ...initialData } : {} as T;
    // Initialiser les extraInputs si non présents
    extraInputs.forEach((input) => {
      if (!(input.name in baseData)) {
        (baseData as any)[input.name] = "";
      }
    });
    return baseData;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value } as T));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
    >
      {/* Champ principal */}
      <div className="mb-3">
        <label>{String(valueKey)}</label>
        <input
          type="text"
          className="form-control"
          name={valueKey as string}
          value={formData[valueKey] as any || ""}
          onChange={handleChange}
        />
      </div>

      {/* Champs supplémentaires */}
      {extraInputs.map((input) => (
        <div key={String(input.name)} className="mb-3">
          <label>{input.label}</label>
          <input
            type={input.type || "text"}
            className="form-control"
            name={input.name as string}
            value={formData[input.name] as any || ""}
            onChange={handleChange}
          />
        </div>
      ))}

      <div className="d-flex justify-content-end">
        <button type="button" className="btn btn-secondary me-2" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default GenericForm;
