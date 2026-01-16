import type { ReactNode } from "react";
import "./GameStartScreen.css";
import { TagIconGamepad, TagIconFortune, TagIconPsycho, TagIconCreator } from "./GameStartIcons";

type GameStartTag = {
  icon?: ReactNode;
  label: string;
};

type GameInfo = {
  title: string;
  type: string;
  thumbnail?: string;
  created_by?: { name: string } | null;
};

type GameStartScreenProps = {
  game: GameInfo;
  media?: ReactNode;
  onStart: () => void;
  className?: string;
};

const getTypeLabel = (value: string) => {
  const map: Record<string, string> = {
    WORLD_CUP: "월드컵",
    FORTUNE_TEST: "운세",
    PSYCHOLOGICAL: "심리테스트",
    PSYCHO_TEST: "심리테스트",
    QUIZ: "퀴즈",
  };
  return map[value] || value;
};

const getTypeIcon = (value: string) => {
  const typeUpper = value.toUpperCase();
  if (typeUpper === "WORLD_CUP") return TagIconGamepad;
  if (typeUpper === "FORTUNE_TEST") return TagIconFortune;
  if (typeUpper.includes("PSYCHO") || typeUpper.includes("PSYCHOLOGICAL")) return TagIconPsycho;
  return TagIconGamepad;
};

export function GameStartScreen({
  game,
  media,
  onStart,
  className,
}: GameStartScreenProps) {
  const tags: GameStartTag[] = [
    {
      label: getTypeLabel(game.type),
      icon: getTypeIcon(game.type),
    },
    ...(game.created_by
      ? [
          {
            label: game.created_by.name,
            icon: TagIconCreator,
          },
        ]
      : []),
  ];

  const mediaNode = media || (game.thumbnail ? <img src={game.thumbnail} alt={game.title} /> : null);

  return (
    <section className={`game-start detail-card play-card ${className || ""}`.trim()}>
      <div className="play-summary">
        <div className="play-header">
          {mediaNode ? <div className="play-media">{mediaNode}</div> : null}
          <div className="play-info">
            <h1 className="detail-title">{game.title}</h1>
            {tags && tags.length ? (
              <div className="play-tags">
                {tags.map((tag, index) => (
                  <span key={`${tag.label}-${index}`} className="play-tag">
                    {tag.icon ? <span className="play-tag-icon">{tag.icon}</span> : null}
                    {tag.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="play-start-section">
        <div className="play-start-area">
          <button className="btn btn-primary play-start-btn" type="button" onClick={onStart}>
            게임 시작
          </button>
        </div>
      </div>
    </section>
  );
}
