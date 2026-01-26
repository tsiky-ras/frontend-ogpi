import React from "react";
import "./StepBar.css";

interface StepBarProps {
  steps: string[];
  currentStep: number; 
}

const StepBar: React.FC<StepBarProps> = ({ steps, currentStep }) => {
  const progress =
    steps.length > 1
      ? (currentStep / (steps.length - 1)) * 100
      : 0;

  return (
    <div
      className="stepbar"
      style={{ "--progress": progress } as React.CSSProperties}
    >
      {steps.map((label, index) => {
        const isActive = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div
            key={index}
            className={`step-item ${
              isActive ? "active" : ""
            } ${isCurrent ? "current" : ""}`}
          >
            <div className="step-circle">{index + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
};

export default StepBar;
