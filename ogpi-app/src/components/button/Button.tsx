import React from "react";
import "./Button.css";

type ButtonProps = {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  icon?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  className?: string;
};

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = "primary",
  icon,
  type = "button",
  className = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`custom-btn ${variant} ${className}`}
    >
      {label}
      {icon && <span className="btn-icon">{icon}</span>}
    </button>
  );
};

export default Button;
