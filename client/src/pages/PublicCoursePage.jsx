import React from "react";
import { Link } from "react-router-dom";

import CourseWorkspace from "../components/CourseWorkspace";

export default function PublicCoursePage({
  user,
  courseDetail,
  activeLessonId,
  busyAction,
  loading,
  onSelectLesson,
  onEnroll,
  onOpenLearning,
}) {
  return (
    <main className="page-shell mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="type-eyebrow text-teal-700">Course Detail</p>
          <h1 className="type-section-title mt-3 text-slate-900">Preview the full course page before learning starts</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="button-secondary" to="/courses">
            Back to Catalog
          </Link>
          {!user ? (
            <Link className="button-primary" to="/login">
              Sign In to Learn
            </Link>
          ) : null}
        </div>
      </div>

      <CourseWorkspace
        user={user}
        courseDetail={courseDetail}
        activeLessonId={activeLessonId}
        busyAction={busyAction}
        onSelectLesson={onSelectLesson}
        onEnroll={onEnroll}
        onOpenLearning={onOpenLearning}
        loading={loading}
        mode="preview"
      />
    </main>
  );
}
