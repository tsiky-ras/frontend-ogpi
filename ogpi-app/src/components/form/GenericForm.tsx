import React, { useEffect, useState } from "react";
import { Form } from "react-bootstrap";
import "./GenericForm.css";

interface GenericFormProps<T extends { id?: number }> {
  title: string;
  valueKey: "label" | "name";
  initialData?: T | null;
  onSubmit: (data: T) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

const GenericForm = <T extends { id?: number }>({
  title,
  valueKey,
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Enregistrer",
}: GenericFormProps<T>) => {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (initialData) {
      setValue((initialData as any)[valueKey] || "");
    }
  }, [initialData, valueKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      ...(initialData || {}),
      [valueKey]: value,
    });
  };

  return (
    <div className="generic-form-card">
      <h4>{title}</h4>

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Libellé</Form.Label>
          <Form.Control
            type="text"
            placeholder="Saisir le libellé"
            value={value}
            required
            onChange={(e) => setValue(e.target.value)}
          />
        </Form.Group>

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Annuler
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
        </div>
      </Form>
    </div>
  );
};

export default GenericForm;
