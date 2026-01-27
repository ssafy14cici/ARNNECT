import { Link } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <nav className="footer-links">
          <Link to="/terms" className="footer-link">
            이용약관
          </Link>
          <Link to="/privacy" className="footer-link policy">
            개인정보 처리방침
          </Link>
        </nav>
        <p className="footer-copyright">
          © 2026 ARNNECT. All rights reserved.
        </p>
      </div>
    </footer>
  );
}