import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const demoAccounts = [
  {
    label: "Student",
    email: "student@gatematelearning.dev",
    password: "Student@123",
  },
  {
    label: "Instructor",
    email: "instructor@gatematelearning.dev",
    password: "Instructor@123",
  },
  {
    label: "Admin",
    email: "admin@gatematelearning.dev",
    password: "Admin@123",
  },
];

export default function AuthPage({ mode, busyAction, onLogin, onRegister }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });

  const title = useMemo(() => (isLogin ? "Sign in to your learning portal" : "Create a new Gatemate Learning account"), [isLogin]);

  return (
    <main className="page-shell mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-7 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="glass-panel p-8 lg:p-12">
          <p className="type-eyebrow text-teal-700">{isLogin ? "Login" : "Register"}</p>
          <h1 className="type-page-title mt-4 text-slate-900">{title}</h1>
          <p className="type-lead mt-6 max-w-xl">
            Authentication now has its own page instead of being embedded on the home screen, so the LMS behaves like
            a full production site with dedicated routes for sign-in and account creation.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className={isLogin ? "button-primary" : "button-secondary"} to="/login">
              Login
            </Link>
            <Link className={!isLogin ? "button-primary" : "button-secondary"} to="/register">
              Register
            </Link>
          </div>
        </section>

        <section className="section-card p-8 lg:p-10">
          <form
            className="grid gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (isLogin) {
                onLogin({ email: form.email, password: form.password });
                return;
              }

              onRegister(form);
            }}
          >
            {!isLogin ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                <input className="field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input
                className="field"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                className="field"
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            {!isLogin ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                <select className="field" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ) : null}

            <button className="button-primary mt-2" type="submit" disabled={busyAction === (isLogin ? "login" : "register")}>
              {busyAction === (isLogin ? "login" : "register")
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-10">
            <p className="type-eyebrow text-slate-400">Demo Credentials</p>
            <div className="mt-4 space-y-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  className="interactive-soft flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-stone-50 px-4 py-4 text-left hover:border-teal-300"
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, email: account.email, password: account.password }))}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{account.label}</p>
                    <p className="text-sm text-slate-500">{account.email}</p>
                  </div>
                  <span className="text-sm font-semibold text-teal-700">Use</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
