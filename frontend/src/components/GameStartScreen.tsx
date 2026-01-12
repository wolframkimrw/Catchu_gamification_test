import type { ReactNode } from "react";
import "./GameStartScreen.css";

type GameStartTag = {
  icon?: ReactNode;
  label: string;
};

type GameStartScreenProps = {
  title: string;
  description?: string;
  badge?: string;
  media?: ReactNode;
  tags?: GameStartTag[];
  buttonLabel: string;
  onStart: () => void;
  className?: string;
};

export function GameStartScreen({
  title,
  description,
  badge,
  media,
  tags,
  buttonLabel,
  onStart,
  className,
}: GameStartScreenProps) {
  const headerClassName = `game-start-header ${media ? "has-media" : "no-media"}`;

  return (
    <section className={`game-start ${className || ""}`.trim()}>
      <div className="game-start-content">
        <div className={headerClassName}>
          {media ? <div className="game-start-media">{media}</div> : null}
          <div className="game-start-meta">
            {badge ? <p className="game-start-badge">{badge}</p> : null}
            <h1 className="game-start-title">{title}</h1>
            {tags && tags.length ? (
              <div className="game-start-tags">
                {tags.map((tag, index) => (
                  <span key={`${tag.label}-${index}`} className="game-start-tag">
                    {tag.icon ? <span className="game-start-icon">{tag.icon}</span> : null}
                    {tag.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {description ? <p className="game-start-desc">{description}</p> : null}
      </div>
      <button className="btn btn-primary game-start-btn" type="button" onClick={onStart}>
        {buttonLabel}
      </button>
    </section>
  );
}
