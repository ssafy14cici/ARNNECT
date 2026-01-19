import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from ?? "/";

  const { loginAsGeneral, loginAsArtist } = useAuthStore();

  return (
    <div>
      <h2>Login</h2>
      <p>로그인 후 돌아갈 경로: {from}</p>

      <button
        onClick={() => {
          loginAsGeneral();
          nav(from, { replace: true });
        }}
      >
        일반 로그인(데모)
      </button>

      <button
        onClick={() => {
          loginAsArtist();
          nav(from, { replace: true });
        }}
      >
        예술가 로그인(데모)
      </button>
    </div>
  );
}
