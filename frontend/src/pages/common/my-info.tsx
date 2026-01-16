import { Link } from "react-router-dom";
import { useAuthUser } from "../../hooks/useAuthUser";
import "./my-info.css";

export function MyInfoPage() {
  const { user } = useAuthUser();

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
      </section>
    </div>
  );
}
