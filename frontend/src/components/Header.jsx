import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" to="/products" aria-label="SmartStore home">
          <span className="brand-mark">S</span><span>martStore</span>
        </Link>

        <nav className="nav-links">
          <NavLink
            to="/products"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Products
          </NavLink>

          <div className="topbar-copy">
            <span className="secure-dot" /> Secure EMI checkout
          </div>
        </nav>
      </div>
    </header>
  );
}