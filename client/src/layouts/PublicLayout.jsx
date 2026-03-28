import React from "react";
import { Link, NavLink } from "react-router-dom";

import BrandLogo from "../components/BrandLogo";

const navLinkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${
    isActive ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function PublicLayout({ user, onLogout, children }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link to="/">
              <BrandLogo compact />
            </Link>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-700">
              Multi-page LMS
            </span>
          </div>

          <nav className="flex flex-wrap gap-2">
            <NavLink className={navLinkClass} end to="/">
              Home
            </NavLink>
            <NavLink className={navLinkClass} to="/courses">
              Courses
            </NavLink>
            <NavLink className={navLinkClass} to="/about-us">
              About
            </NavLink>
            <NavLink className={navLinkClass} to="/contact-us">
              Contact
            </NavLink>
            <NavLink className={navLinkClass} to="/careers">
              Careers
            </NavLink>
            <NavLink className={navLinkClass} to="/video-test">
              Video Test
            </NavLink>
          </nav>

          <div className="flex flex-wrap gap-3">
            {user ? (
              <>
                <Link className="button-secondary" to="/dashboard">
                  Dashboard
                </Link>
                <button className="button-primary" type="button" onClick={onLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="button-secondary" to="/login">
                  Login
                </Link>
                <Link className="button-primary" to="/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-white/70 bg-white/80">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-semibold text-slate-800">Gatemate Learning</p>
            <p className="mt-1">A page-based LMS experience for learners, instructors, and admins.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/contact-us">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
