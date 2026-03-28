import React from "react";
import { FaBookOpen, FaCompass, FaPlayCircle, FaUserGraduate } from "react-icons/fa";

import { formatPercent } from "../lib/format";

function EmptyState({ user }) {
  return (
    <div className="section-card p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-2xl text-teal-700">
        <FaCompass />
      </div>
      <h3 className="text-2xl text-slate-900">No courses matched this filter</h3>
      <p className="mt-3 text-sm text-slate-600">
        Try a different search term or category to discover more {user ? "learning paths" : "demo courses"}.
      </p>
    </div>
  );
}

function CourseCard({ course, user, onOpenCourse, onEnroll, busyAction }) {
  const isStudent = user?.role === "student";
  const enrollBusy = busyAction === `enroll:${course.id}`;

  return (
    <article className="section-card interactive-card flex h-full flex-col p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            {course.category}
          </span>
          <h3 className="mt-4 text-2xl text-slate-900">{course.title}</h3>
        </div>
        <div className="rounded-2xl bg-teal-50 px-3 py-2 text-right text-sm font-semibold text-teal-700">
          {course.lessonCount} lessons
        </div>
      </div>

      <p className="flex-1 text-sm leading-6 text-slate-600">{course.description}</p>

      <div className="mt-6 space-y-3 text-sm text-slate-500">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <FaUserGraduate className="text-teal-700" />
            {course.instructorName}
          </span>
          <span>{course.enrollmentCount} learners</span>
        </div>

        {user ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <span>Progress</span>
              <span>{formatPercent(course.progressPercent)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-gradient-to-r from-teal-600 to-sky-500" style={{ width: formatPercent(course.progressPercent) }} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="button-secondary flex-1" type="button" onClick={() => onOpenCourse(course.id)}>
          <FaBookOpen />
          <span className="ml-2">Preview</span>
        </button>
        {isStudent && !course.isEnrolled ? (
          <button
            className="button-primary flex-1"
            type="button"
            disabled={enrollBusy}
            onClick={() => onEnroll(course.id)}
          >
            <FaPlayCircle />
            <span className="ml-2">{enrollBusy ? "Joining..." : "Enroll"}</span>
          </button>
        ) : (
          <button className="button-warm flex-1" type="button" onClick={() => onOpenCourse(course.id)}>
            <FaPlayCircle />
            <span className="ml-2">{course.isEnrolled ? "Continue" : "Open Course"}</span>
          </button>
        )}
      </div>
    </article>
  );
}

export default function CatalogPanel({
  catalog,
  categories,
  filters,
  loading,
  user,
  busyAction,
  onFilterChange,
  onOpenCourse,
  onEnroll,
}) {
  return (
    <section className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Course Catalog</p>
            <h2 className="mt-3 text-3xl text-slate-900">Explore structured learning paths</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Browse approved courses across AI, web development, APIs, and product skills. Each course includes
              modular lessons, downloadable study material, and auto-graded quizzes.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="field"
              placeholder="Search by title, topic, or keyword"
              value={filters.search}
              onChange={(event) => onFilterChange("search", event.target.value)}
            />
            <select
              className="field"
              value={filters.category}
              onChange={(event) => onFilterChange("category", event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton-surface p-6">
              <div className="skeleton-line h-6 w-24" />
              <div className="mt-5 skeleton-line h-8 w-4/5" />
              <div className="mt-3 skeleton-line h-4 w-full" />
              <div className="mt-2 skeleton-line h-4 w-11/12" />
              <div className="mt-10 flex items-center justify-between">
                <div className="skeleton-line h-4 w-32" />
                <div className="skeleton-line h-4 w-20" />
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="skeleton-line h-11 w-full rounded-2xl" />
                <div className="skeleton-line h-11 w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : catalog.length === 0 ? (
        <EmptyState user={user} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {catalog.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              user={user}
              busyAction={busyAction}
              onOpenCourse={onOpenCourse}
              onEnroll={onEnroll}
            />
          ))}
        </div>
      )}
    </section>
  );
}
