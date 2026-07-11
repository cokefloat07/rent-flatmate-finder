import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-neutral-300 bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
        {/* Brand */}
        <div>
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Home size={16} strokeWidth={2.5} />
            </div>
            <span className="font-display text-base font-bold text-neutral-900">
              Rent<span className="text-primary">&</span>Find
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-neutral-700">
            AI-powered matchmaking between room owners and tenants — find the right home, not just
            any home.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">Product</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to={ROUTES.HOME} className="text-neutral-700 hover:text-primary">
                Home
              </Link>
            </li>
            <li>
              <Link to={ROUTES.REGISTER} className="text-neutral-700 hover:text-primary">
                Sign up
              </Link>
            </li>
            <li>
              <Link to={ROUTES.LOGIN} className="text-neutral-700 hover:text-primary">
                Login
              </Link>
            </li>
          </ul>
        </div>

        {/* Meta */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-900">About</h4>
          <p className="text-sm text-neutral-700">
            Built with FastAPI, React, and open-source AI. 100% self-hostable.
          </p>
        </div>
      </div>

      <div className="border-t border-neutral-300 bg-neutral-100 px-4 py-4 text-center text-xs text-neutral-500 md:px-8">
        © {year} Rent & Find. All rights reserved.
      </div>
    </footer>
  );
}
