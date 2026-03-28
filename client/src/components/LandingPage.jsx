import React, { useState } from "react";
import { FaArrowRight, FaBook, FaShieldAlt, FaUsers } from "react-icons/fa";

import CatalogPanel from "./CatalogPanel";
import CourseWorkspace from "./CourseWorkspace";

const initialLogin = {
  email: "",
  password: "",
};

const initialRegister = {
  name: "",
  email: "",
  password: "",
  role: "student",
};

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

export default function LandingPage({
  catalog,
  categories,
  filters,
  catalogLoading,
  busyAction,
  selectedCourse,
  activeLessonId,
  onFilterChange,
  onOpenCourse,
  onSelectLesson,
  onLogin,
  onRegister,
}) {
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="glass-panel overflow-hidden p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-teal-700">Gatemate Learning</p>
            <h1 className="mt-5 text-5xl leading-tight text-slate-900 lg:text-6xl">
              Learn, teach, approve, and track progress from one full working website.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
              This React-powered LMS keeps the original backend features intact: secure auth, role-based dashboards,
              course publishing, video and PDF delivery, quizzes, progress tracking, notifications, and admin controls.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="metric-card bg-white/70">
              <div className="rounded-2xl bg-teal-100 p-3 text-teal-700">
                <FaUsers />
              </div>
              <p className="mt-5 text-2xl text-slate-900">3 roles</p>
              <p className="mt-2 text-sm text-slate-600">Student, instructor, and admin access with protected actions.</p>
            </div>
            <div className="metric-card bg-white/70">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <FaBook />
              </div>
              <p className="mt-5 text-2xl text-slate-900">Structured courses</p>
              <p className="mt-2 text-sm text-slate-600">Lesson-wise modules, downloads, progress, and resume learning.</p>
            </div>
            <div className="metric-card bg-white/70">
              <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                <FaShieldAlt />
              </div>
              <p className="mt-5 text-2xl text-slate-900">Moderated publishing</p>
              <p className="mt-2 text-sm text-slate-600">Admins can approve courses and monitor usage analytics.</p>
            </div>
          </div>
        </div>

        <aside className="section-card p-6 lg:p-8">
          <div className="flex rounded-full bg-stone-100 p-1">
            <button
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                authMode === "login" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                authMode === "register" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
          </div>

          {authMode === "login" ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                onLogin(loginForm);
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  className="field"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  className="field"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>
              <button className="button-primary w-full" type="submit" disabled={busyAction === "login"}>
                {busyAction === "login" ? "Signing in..." : "Open Dashboard"}
              </button>
            </form>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                onRegister(registerForm);
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
                <input
                  className="field"
                  value={registerForm.name}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  className="field"
                  type="email"
                  value={registerForm.email}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  className="field"
                  type="password"
                  value={registerForm.password}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                <select
                  className="field"
                  value={registerForm.role}
                  onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button className="button-primary w-full" type="submit" disabled={busyAction === "register"}>
                {busyAction === "register" ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Demo Access</p>
            <div className="mt-4 space-y-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-stone-50 px-4 py-4 text-left transition hover:border-teal-300"
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setLoginForm({ email: account.email, password: account.password });
                  }}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{account.label}</p>
                    <p className="text-sm text-slate-500">{account.email}</p>
                  </div>
                  <FaArrowRight className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <div className="mt-10">
        <CatalogPanel
          catalog={catalog}
          categories={categories}
          filters={filters}
          loading={catalogLoading}
          busyAction={busyAction}
          onFilterChange={onFilterChange}
          onOpenCourse={onOpenCourse}
          onEnroll={() => {}}
        />
      </div>

      {selectedCourse ? (
        <div className="mt-10">
          <CourseWorkspace
            user={null}
            courseDetail={selectedCourse}
            activeLessonId={activeLessonId}
            busyAction={busyAction}
            onSelectLesson={onSelectLesson}
          />
        </div>
      ) : null}
    </main>
  );
}
