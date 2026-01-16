import "./MajorArcanaResultActions.css";

type Props = {
  onRetry: () => void;
  onExit: () => void;
  onHome?: () => void;
  className?: string;
};

// Usage:
// import { MajorArcanaResultActions } from "../../components/MajorArcanaResultActions";
// <MajorArcanaResultActions onRetry={handleRestart} onExit={() => setStarted(false)} />
export function MajorArcanaResultActions({ onRetry, onExit, onHome, className }: Props) {
  return (
    <div className={`arcana-actions ${className || ""}`.trim()}>
      <button
        type="button"
        className="arcana-btn arcana-btn-retry"
        aria-label="다시 하기"
        onClick={onRetry}
      >
        다시 하기
      </button>
      <button
        type="button"
        className="arcana-btn arcana-btn-exit"
        aria-label="나가기"
        onClick={onExit}
      >
        나가기
      </button>
      {onHome ? (
        <button
          type="button"
          className="arcana-btn arcana-btn-home"
          aria-label="홈으로 돌아가기"
          onClick={onHome}
        >
          홈으로
        </button>
      ) : null}
    </div>
  );
}
