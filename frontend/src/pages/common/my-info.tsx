import { Link } from "react-router-dom";
import { useAuthUser } from "../../hooks/useAuthUser";
import "./my-info.css";

export function MyInfoPage() {
  const { user } = useAuthUser();
  const providerLabel = user?.provider?.toLowerCase() === "local" ? "로컬" : user?.provider || "로컬";

  if (!user) {
    return (
      <div className="my-info-page">
        <div className="my-info-card">
          <h2>내정보</h2>
          <p>로그인이 필요합니다.</p>
          <Link className="my-info-link" to="/login">
            로그인하러 가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-info-page">
      <header className="my-info-header">
        <h1>내정보</h1>
        <p>계정 정보를 확인하세요.</p>
      </header>
      <section className="my-info-section">
        <div className="my-info-row">
          <span className="my-info-label">이름</span>
          <span className="my-info-value">{user.name}</span>
        </div>
        <div className="my-info-row">
          <span className="my-info-label">이메일</span>
          <span className="my-info-value">{user.email}</span>
        </div>
        <div className="my-info-row">
          <span className="my-info-label">관리자 여부</span>
          <span className="my-info-value">{user.is_staff ? "관리자" : "일반"}</span>
        </div>
        <div className="my-info-row">
          <span className="my-info-label">로그인 제공자</span>
          <span className="my-info-value">{providerLabel}</span>
        </div>
        <div className="my-info-row">
          <span className="my-info-label">비밀번호 변경</span>
          <Link className="my-info-action" to="/login?tab=reset">
            변경하기
          </Link>
        </div>
      </section>
    </div>
  );
}
