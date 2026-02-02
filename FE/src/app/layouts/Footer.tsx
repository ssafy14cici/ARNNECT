// FE/src/app/layouts/Footer.tsx
import { Link } from "react-router-dom";
import "../../styles/footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <nav className="footer-links">
          <Link to="/terms" className="footer-link">
            Terms of Use
          </Link>
          <Link to="/privacy" className="footer-link policy">
            Privacy Policy
          </Link>
          <Link to="/guide" className="footer-link">
            Guide
          </Link>
        </nav>
        
        <p className="footer-copyright">
          © 2026 <span className="footer-brand-text">ARNNECT</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}