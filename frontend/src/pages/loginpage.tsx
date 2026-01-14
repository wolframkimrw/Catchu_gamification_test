import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { fetchCsrfToken, loginAccount, resetPassword, signupAccount } from "../api/accounts";
import { ApiError } from "../api/http";
import { setStoredUser } from "../utils/auth";

type TabKey = "login" | "signup" | "reset";

type LoginFormState = {
  email: string;
  password: string;
};

type SignupFormState = {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
};

type ResetFormState = {
  email: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("login");
  const [loginState, setLoginState] = useState<LoginFormState>({
    email: "",
    password: "",
  });
  const [signupState, setSignupState] = useState<SignupFormState>({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [resetState, setResetState] = useState<ResetFormState>({
    email: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const tabTitle = useMemo(() => {
    if (activeTab === "signup") return "회원가입";
    if (activeTab === "reset") return "비밀번호 찾기";
    return "로그인";
  }, [activeTab]);

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      const csrfToken = await fetchCsrfToken();
      const data = await loginAccount({ ...loginState, csrfToken });
      if (data?.user) {
        setStoredUser(data.user);
      }
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.meta.message || "로그인에 실패했습니다.");
        return;
      }
      setFormError("로그인에 실패했습니다.");
    }
  };

  const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      const csrfToken = await fetchCsrfToken();
      await signupAccount({
        name: signupState.name,
        email: signupState.email,
        password: signupState.password,
        password_confirm: signupState.passwordConfirm,
        csrfToken,
      });
      window.alert("회원가입이 완료되었습니다. 로그인해 주세요.");
      setActiveTab("login");
    } catch (err) {
      if (err instanceof ApiError) {
        const hint = err.meta.message;
        setFormError(hint || "회원가입에 실패했습니다.");
        return;
      }
      setFormError("회원가입에 실패했습니다.");
    }
  };

  const handleResetSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      const csrfToken = await fetchCsrfToken();
      await resetPassword({ ...resetState, csrfToken });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.meta.message || "요청에 실패했습니다.");
        return;
      }
      setFormError("요청에 실패했습니다.");
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <header className="login-header">
          <p className="login-eyebrow">Catchu</p>
          <h1>{tabTitle}</h1>
          <p className="login-subtitle">
            오늘의 게임을 더 쉽게 즐길 수 있도록 계정을 준비해요.
          </p>
        </header>

        <div className="login-tabs" role="tablist" aria-label="로그인 전환">
          <button
            type="button"
            className={activeTab === "login" ? "active" : ""}
            onClick={() => setActiveTab("login")}
            role="tab"
            aria-selected={activeTab === "login"}
          >
            로그인
          </button>
          <button
            type="button"
            className={activeTab === "signup" ? "active" : ""}
            onClick={() => setActiveTab("signup")}
            role="tab"
            aria-selected={activeTab === "signup"}
          >
            회원가입
          </button>
        </div>

        <section className="login-card">
          {formError ? <p className="login-error">{formError}</p> : null}
          {activeTab === "login" ? (
            <form className="login-form" onSubmit={handleLoginSubmit}>
              <label className="login-field">
                <span>이메일</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={loginState.email}
                  onChange={(event) =>
                    setLoginState((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="login-field">
                <span>비밀번호</span>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={loginState.password}
                  onChange={(event) =>
                    setLoginState((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>
              <button className="login-submit" type="submit">
                로그인
              </button>
            </form>
          ) : null}

          {activeTab === "signup" ? (
            <form className="login-form" onSubmit={handleSignupSubmit}>
              <label className="login-field">
                <span>이름</span>
                <input
                  type="text"
                  placeholder="이름 입력"
                  value={signupState.name}
                  onChange={(event) =>
                    setSignupState((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="login-field">
                <span>이메일</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={signupState.email}
                  onChange={(event) =>
                    setSignupState((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="login-field">
                <span>비밀번호</span>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={signupState.password}
                  onChange={(event) =>
                    setSignupState((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="login-field">
                <span>비밀번호 확인</span>
                <input
                  type="password"
                  placeholder="비밀번호 다시 입력"
                  value={signupState.passwordConfirm}
                  onChange={(event) =>
                    setSignupState((prev) => ({
                      ...prev,
                      passwordConfirm: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <button className="login-submit" type="submit">
                회원가입
              </button>
            </form>
          ) : null}

          {activeTab === "reset" ? (
            <form className="login-form" onSubmit={handleResetSubmit}>
              <label className="login-field">
                <span>이메일</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={resetState.email}
                  onChange={(event) =>
                    setResetState({ email: event.target.value })
                  }
                  required
                />
              </label>
              <button className="login-submit" type="submit">
                재설정 링크 보내기
              </button>
            </form>
          ) : null}
        </section>

        {activeTab === "login" ? (
          <div className="login-links login-links-footer">
            <span className="login-links-text">비밀번호를 잊으셨나요?</span>
            <a
              className="login-links-action"
              href="/login"
              onClick={(event) => {
                event.preventDefault();
                setActiveTab("reset");
              }}
            >
              비밀번호 찾기
            </a>
          </div>
        ) : null}
        {activeTab === "signup" ? (
          <div className="login-links login-links-footer">
            <span className="login-links-text">이미 계정이 있나요?</span>
            <a
              className="login-links-action"
              href="/login"
              onClick={(event) => {
                event.preventDefault();
                setActiveTab("login");
              }}
            >
              로그인
            </a>
          </div>
        ) : null}
        {activeTab !== "reset" ? (
          <footer className="login-footer">
            <p>보안 연결을 통해 안전하게 처리됩니다.</p>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
