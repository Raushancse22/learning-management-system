import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaDownload, FaRegCircle, FaUserLock } from "react-icons/fa";

import { classNames, formatDate, formatPercent, youtubeEmbedUrl } from "../lib/format";

function VideoPane({ lesson }) {
  if (!lesson) {
    return (
      <div className="section-card flex h-full min-h-[320px] items-center justify-center p-10 text-center text-sm text-slate-500">
        Select a lesson to start learning.
      </div>
    );
  }

  if (lesson.videoType === "upload" && lesson.videoUrl) {
    return (
      <div className="section-card overflow-hidden">
        <video className="aspect-video w-full bg-slate-950" controls src={lesson.videoUrl} />
      </div>
    );
  }

  if (lesson.videoType === "external" && lesson.videoUrl) {
    const embedUrl = youtubeEmbedUrl(lesson.videoUrl);
    if (embedUrl) {
      return (
        <div className="section-card overflow-hidden">
          <iframe
            className="aspect-video w-full"
            src={embedUrl}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
  }

  return (
    <div className="section-card flex min-h-[320px] items-center justify-center p-10 text-center">
      <div>
        <p className="text-lg font-semibold text-slate-900">{lesson.title}</p>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">{lesson.summary || "This lesson has no video attached yet."}</p>
        {lesson.videoUrl ? (
          <a className="button-secondary mt-6" href={lesson.videoUrl} target="_blank" rel="noreferrer">
            Open lesson resource
          </a>
        ) : null}
      </div>
    </div>
  );
}

function QuizPanel({ user, course, quiz, busyAction, onSubmitQuiz, mode, onOpenLearning }) {
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    setAnswers({});
  }, [quiz?.id]);

  if (!quiz) {
    return null;
  }

  if (mode === "preview") {
    return (
      <div className="section-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Assessment Preview</p>
        <h3 className="mt-2 text-2xl text-slate-900">{quiz.title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This course includes {quiz.questions.length} multiple-choice questions and instant scoring once the learner
          enters the dedicated learning workspace.
        </p>
        {user && course.isEnrolled ? (
          <button className="button-primary mt-6" type="button" onClick={onOpenLearning}>
            Open Learning Page
          </button>
        ) : null}
      </div>
    );
  }

  const canAttempt = Boolean(user && (course.canManage || user.role !== "student" || course.isEnrolled));

  return (
    <div className="section-card p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Assessment</p>
          <h3 className="mt-2 text-2xl text-slate-900">{quiz.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {quiz.instructions || "Answer every multiple-choice question and get instant scoring."}
          </p>
        </div>
        {quiz.latestAttempt ? (
          <div className="rounded-3xl bg-teal-50 px-4 py-3 text-sm text-teal-800">
            Latest score: {quiz.latestAttempt.score}/{quiz.latestAttempt.total} ({quiz.latestAttempt.percentage}%)
          </div>
        ) : null}
      </div>

      {!canAttempt ? (
        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Sign in and enroll in this course to attempt the quiz and save your result.
        </div>
      ) : (
        <form
          className="mt-8 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitQuiz?.(quiz.id, answers);
          }}
        >
          {quiz.questions.map((question, index) => (
            <fieldset key={question.id} className="rounded-3xl border border-slate-200 p-5">
              <legend className="px-2 text-base font-semibold text-slate-900">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(question.options).map(([optionKey, optionValue]) => (
                  <label
                    key={optionKey}
                    className={classNames(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                      answers[question.id] === optionKey
                        ? "border-teal-500 bg-teal-50 text-teal-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    <input
                      className="h-4 w-4 accent-teal-700"
                      type="radio"
                      name={`quiz-${question.id}`}
                      value={optionKey}
                      checked={answers[question.id] === optionKey}
                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionKey }))}
                    />
                    <span>{optionValue}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <button className="button-primary" type="submit" disabled={busyAction === "submit-quiz"}>
            {busyAction === "submit-quiz" ? "Submitting..." : "Submit Quiz"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CourseWorkspace({
  user,
  courseDetail,
  activeLessonId,
  busyAction,
  onSelectLesson,
  onCompleteLesson,
  onSubmitQuiz,
  onEnroll,
  onOpenLearning,
  loading,
  mode = "learn",
}) {
  const activeLesson = useMemo(() => {
    if (!courseDetail) {
      return null;
    }

    return courseDetail.lessons.find((lesson) => lesson.id === activeLessonId) || courseDetail.lessons[0] || null;
  }, [activeLessonId, courseDetail]);

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
        <div className="skeleton-surface p-5">
          <div className="skeleton-line h-6 w-28" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-white/60 bg-white/45 p-4">
                <div className="skeleton-line h-4 w-20" />
                <div className="mt-3 skeleton-line h-5 w-4/5" />
                <div className="mt-3 skeleton-line h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="skeleton-surface aspect-video w-full rounded-[24px]" />
          <div className="skeleton-surface p-6">
            <div className="skeleton-line h-5 w-24" />
            <div className="mt-4 skeleton-line h-8 w-2/3" />
            <div className="mt-4 skeleton-line h-4 w-full" />
            <div className="mt-2 skeleton-line h-4 w-10/12" />
            <div className="mt-8 flex gap-3">
              <div className="skeleton-line h-11 w-36 rounded-2xl" />
              <div className="skeleton-line h-11 w-40 rounded-2xl" />
            </div>
          </div>
          <div className="skeleton-surface p-6">
            <div className="skeleton-line h-5 w-28" />
            <div className="mt-4 skeleton-line h-7 w-1/2" />
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="skeleton-line h-16 w-full rounded-2xl" />
              <div className="skeleton-line h-16 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!courseDetail) {
    return (
      <div className="section-card p-10 text-center">
        <h2 className="text-3xl text-slate-900">Choose a course to open your workspace</h2>
        <p className="mt-3 text-sm text-slate-600">Open any course from the catalog, dashboard, or studio to view lessons and assessments.</p>
      </div>
    );
  }

  const { course, lessons, progress, quiz } = courseDetail;
  const completedLessonIds = new Set(progress.completedLessonIds);
  const needsEnrollment = Boolean(user && user.role === "student" && !course.canManage && !course.isEnrolled);
  const isPreview = mode === "preview";

  return (
    <section className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
              <span>{course.category}</span>
              <span>{course.status}</span>
            </div>
            <h2 className="mt-4 text-4xl text-slate-900">{course.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{course.description}</p>
            {course.introText ? <p className="mt-4 text-sm leading-7 text-slate-500">{course.introText}</p> : null}
          </div>

          <div className="grid min-w-[260px] gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[24px] bg-slate-950 px-5 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Progress</p>
              <p className="mt-3 text-4xl font-semibold">{formatPercent(progress.progressPercent)}</p>
            </div>
            <div className="rounded-[24px] bg-teal-50 px-5 py-4 text-teal-900">
              <p className="text-xs uppercase tracking-[0.25em] text-teal-700">Lessons</p>
              <p className="mt-3 text-2xl font-semibold">{progress.totalLessons}</p>
            </div>
            <div className="rounded-[24px] bg-amber-50 px-5 py-4 text-amber-900">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-700">Updated</p>
              <p className="mt-3 text-sm font-semibold">{formatDate(course.updatedAt)}</p>
            </div>
          </div>
        </div>

        {!user ? (
          <div className="mt-6 rounded-[28px] border border-slate-200 bg-white/90 p-5 text-sm text-slate-700">
            <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
              <FaUserLock className="text-teal-700" />
              Sign in to save progress, take quizzes, and resume learning later.
            </span>
          </div>
        ) : null}

        {needsEnrollment ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-amber-200 bg-amber-50 p-5">
            <div>
              <p className="text-sm font-semibold text-amber-900">Enroll to track lesson completion and quiz results.</p>
              <p className="mt-1 text-sm text-amber-800">Your progress percentage and resume point are saved after enrollment.</p>
            </div>
            <button
              className="button-warm"
              type="button"
              disabled={busyAction === `enroll:${course.id}`}
              onClick={() => onEnroll?.(course.id)}
            >
              {busyAction === `enroll:${course.id}` ? "Enrolling..." : "Enroll Now"}
            </button>
          </div>
        ) : null}

        {isPreview && user && course.isEnrolled ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-teal-200 bg-teal-50 p-5">
            <div>
              <p className="text-sm font-semibold text-teal-900">You’re already enrolled in this course.</p>
              <p className="mt-1 text-sm text-teal-800">Jump into the dedicated learning page to resume lessons and submit quizzes.</p>
            </div>
            <button className="button-primary" type="button" onClick={onOpenLearning}>
              Open Learning Page
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
        <aside className="space-y-4">
          <div className="section-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl text-slate-900">Modules</h3>
              <span className="text-sm text-slate-500">{lessons.length} total</span>
            </div>
            <div className="space-y-3">
              {lessons.map((lesson) => {
                const isActive = lesson.id === activeLesson?.id;
                const isComplete = completedLessonIds.has(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    className={classNames(
                      "interactive-soft w-full rounded-3xl border px-4 py-4 text-left",
                      isActive
                        ? "border-teal-500 bg-teal-50 shadow-md shadow-teal-100"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                    type="button"
                    onClick={() => onSelectLesson?.(lesson.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Lesson {lesson.position}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{lesson.title}</p>
                      </div>
                      <span className={classNames("mt-1 text-base", isComplete ? "text-emerald-600" : "text-slate-300")}>
                        {isComplete ? <FaCheckCircle /> : <FaRegCircle />}
                      </span>
                    </div>
                    {lesson.summary ? <p className="mt-3 text-xs leading-5 text-slate-500">{lesson.summary}</p> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <VideoPane lesson={activeLesson} />

          {activeLesson ? (
            <div className="section-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Now Learning</p>
                  <h3 className="mt-2 text-2xl text-slate-900">{activeLesson.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{activeLesson.summary || "Lesson notes will appear here once they are added."}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {activeLesson.materialPath ? (
                    <a className="button-secondary" href={activeLesson.materialPath} target="_blank" rel="noreferrer">
                      <FaDownload />
                      <span className="ml-2">Download PDF</span>
                    </a>
                  ) : null}
                  {!isPreview && user?.role === "student" && course.isEnrolled && !completedLessonIds.has(activeLesson.id) ? (
                    <button
                      className="button-primary"
                      type="button"
                      disabled={busyAction === `complete:${activeLesson.id}`}
                      onClick={() => onCompleteLesson?.(activeLesson.id)}
                    >
                      <FaCheckCircle />
                      <span className="ml-2">{busyAction === `complete:${activeLesson.id}` ? "Saving..." : "Mark Complete"}</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {!isPreview ? (
                <div className="mt-6 rounded-3xl bg-slate-100 p-4 text-sm text-slate-600">
                  Resume point: {progress.lastLessonId ? `Lesson ${progress.lastLessonId}` : "Not saved yet"} | Next lesson:{" "}
                  {progress.nextLessonId ? `Lesson ${progress.nextLessonId}` : "Course completed"}
                </div>
              ) : null}
            </div>
          ) : null}

          <QuizPanel
            user={user}
            course={course}
            quiz={quiz}
            busyAction={busyAction}
            onSubmitQuiz={onSubmitQuiz}
            mode={mode}
            onOpenLearning={onOpenLearning}
          />
        </div>
      </div>
    </section>
  );
}
