import { Link } from "react-router-dom";
import "./ListBackButton.css";

type ListBackButtonProps = {
  to: string;
  label?: string;
  className?: string;
};

export function ListBackButton({
  to,
  label = "목록으로",
  className,
}: ListBackButtonProps) {
  return (
    <Link className={`list-back-button ${className || ""}`.trim()} to={to}>
      <span className="list-back-icon" aria-hidden="true" />
      {label}
    </Link>
  );
}
