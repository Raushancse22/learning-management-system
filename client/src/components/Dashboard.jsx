import React, { useMemo } from "react";
import {
  FaArrowRight,
  FaBook,
  FaBolt,
  FaBrain,
  FaBullseye,
  FaChartLine,
  FaClock,
  FaLayerGroup,
  FaLightbulb,
  FaMedal,
  FaPlayCircle,
  FaCompass,
  FaShieldAlt,
  FaSignOutAlt,
  FaUser,
  FaUsersCog,
  FaVideo,
} from "react-icons/fa";

import AdminPanel from "./AdminPanel";
import BrandLogo from "./BrandLogo";
import CatalogPanel from "./CatalogPanel";
import CourseWorkspace from "./CourseWorkspace";
import InstructorStudio from "./InstructorStudio";
import LiveClassesPanel from "./LiveClassesPanel";
import { formatDate, formatPercent } from "../lib/format";

const curatedRecommendationLibrary = [
  {
    id: "demo-ai-agents",
    title: "AI Agents and Workflow Automation",
    category: "Generative AI",
    description: "Practice tool-using agents, workflow chaining, and evaluation loops after LLM fundamentals.",
    reason: "Strong next step after introductory generative AI study.",
    badgeTone: "bg-teal-100 text-teal-700",
    glowTone: "from-teal-500/15 via-sky-500/10 to-transparent",
  },
  {
    id: "demo-cpp-stl",
    title: "C++ STL Interview Drills",
    category: "C++",
    description: "Sharpen vectors, maps, sets, and speed-oriented problem solving for coding rounds and practice.",
    reason: "Pairs well with structured programming and algorithm revision.",
    badgeTone: "bg-amber-100 text-amber-700",
    glowTone: "from-amber-500/15 via-orange-500/10 to-transparent",
  },
  {
    id: "demo-systems-thinking",
    title: "Systems Thinking for Engineers",
    category: "Career Skills",
    description: "Build debugging habits, architectural clarity, and decision-making skills for technical growth.",
    reason: "Balances hands-on coding with clearer engineering judgment.",
    badgeTone: "bg-sky-100 text-sky-700",
    glowTone: "from-sky-500/15 via-indigo-500/10 to-transparent",
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getRecommendationTone(category = "") {
  const normalized = category.toLowerCase();

  if (normalized.includes("ai")) {
    return {
      badgeTone: "bg-teal-100 text-teal-700",
      glowTone: "from-teal-500/15 via-sky-500/10 to-transparent",
    };
  }

  if (normalized.includes("c++") || normalized.includes("program")) {
    return {
      badgeTone: "bg-amber-100 text-amber-700",
      glowTone: "from-amber-500/15 via-orange-500/10 to-transparent",
    };
  }

  return {
    badgeTone: "bg-sky-100 text-sky-700",
    glowTone: "from-sky-500/15 via-indigo-500/10 to-transparent",
  };
}

function buildMomentumSeries({ overallProgress, averageScore, streak, completedLessons, recentAttempts }) {
  const target = Math.max(overallProgress, averageScore, completedLessons > 0 ? 18 : 8);
  const baseSeries = [0.26, 0.38, 0.52, 0.66, 0.82, 1].map((factor, index) =>
    clamp(Math.round(target * factor + streak * index * 1.2), index === 0 ? 8 : 12, 100),
  );

  const recentScores = recentAttempts.slice(0, 3).reverse().map((attempt) => attempt.percentage);
  recentScores.forEach((score, index) => {
    const targetIndex = baseSeries.length - recentScores.length + index;
    baseSeries[targetIndex] = clamp(Math.max(baseSeries[targetIndex], score), 12, 100);
  });

  return baseSeries;
}

function MetricCard({ label, value, accent, meta, icon, iconTone = "bg-slate-100 text-slate-700" }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <p className={`mt-4 text-4xl font-semibold ${accent}`}>{value}</p>
          {meta ? <p className="mt-3 text-sm leading-6 text-slate-500">{meta}</p> : null}
        </div>
        {icon ? <div className={`rounded-2xl p-3 ${iconTone}`}>{icon}</div> : null}
      </div>
    </div>
  );
}

function ProgressTrendChart({ values, labels }) {
  const width = 440;
  const height = 190;
  const padding = 18;
  const maxValue = Math.max(...values, 10);
  const minY = height - padding;
  const points = values.map((value, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
    const y = minY - ((value / maxValue) * (height - padding * 2 - 8));
    return { x, y, value, label: labels[index] };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = `M ${points[0].x} ${minY} ${points.map((point) => `L ${point.x} ${point.y}`).join(" ")} L ${
    points[points.length - 1].x
  } ${minY} Z`;

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5">
      <svg className="h-[190px] w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="student-progress-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(13, 148, 136, 0.28)" />
            <stop offset="100%" stopColor="rgba(13, 148, 136, 0)" />
          </linearGradient>
          <linearGradient id="student-progress-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((step) => {
          const y = minY - step * (height - padding * 2 - 8);
          return <line key={step} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
        })}

        <path d={areaPath} fill="url(#student-progress-fill)" />
        <polyline fill="none" points={polyline} stroke="url(#student-progress-stroke)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke="#0f766e" strokeWidth="3" />
          </g>
        ))}
      </svg>

      <div className="mt-4 grid grid-cols-6 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {labels.map((label, index) => (
          <div key={label}>
            <p>{label}</p>
            <p className="mt-2 text-sm tracking-normal text-slate-700">{values[index]}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressDistribution({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = total ? Math.round((item.value / total) * 100) : 0;

        return (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-200">
              <div className={`h-3 rounded-full ${item.barTone}`} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecommendationCard({ recommendation, busyAction, onEnroll, onOpenCourse, onNavigateCatalog }) {
  const isCatalogCourse = recommendation.kind === "catalog";
  const enrollBusy = isCatalogCourse && busyAction === `enroll:${recommendation.id}`;

  return (
    <article className="interactive-card relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-5">
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-r ${recommendation.glowTone}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${recommendation.badgeTone}`}>
            {recommendation.category}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {isCatalogCourse ? "Live course" : "Curated demo"}
          </span>
        </div>

        <h3 className="mt-4 text-[1.35rem] leading-8 text-slate-900">{recommendation.title}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">{recommendation.description}</p>
        <p className="mt-4 rounded-2xl bg-stone-100 px-4 py-3 text-sm text-slate-700">{recommendation.reason}</p>

        {isCatalogCourse ? (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>{recommendation.lessonCount} lessons</span>
            <span>{recommendation.enrollmentCount} learners</span>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {isCatalogCourse ? (
            <>
              <button className="button-secondary" type="button" onClick={() => onOpenCourse(recommendation.id)}>
                Open Course
              </button>
              <button className="button-primary" type="button" disabled={enrollBusy} onClick={() => onEnroll(recommendation.id)}>
                <FaPlayCircle />
                <span>{enrollBusy ? "Joining..." : "Enroll"}</span>
              </button>
            </>
          ) : (
            <button className="button-secondary" type="button" onClick={onNavigateCatalog}>
              Browse Catalog
              <FaArrowRight />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function NotificationList({ notifications }) {
  if (!notifications?.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
        Notifications will appear here when new courses, lessons, or approvals are posted.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <div key={notification.id} className="interactive-soft rounded-3xl bg-stone-100 p-4">
          <p className="font-semibold text-slate-900">{notification.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{formatDate(notification.createdAt)}</p>
        </div>
      ))}
    </div>
  );
}

function StudentOverview({ dashboard, catalog, busyAction, onOpenCourse, onEnroll, onNavigateCatalog }) {
  const courses = dashboard?.courses || [];
  const completedCourses = courses.filter((course) => course.progressPercent === 100).length;
  const pendingCourses = Math.max(courses.length - completedCourses, 0);
  const inProgressCourses = courses.filter((course) => course.progressPercent > 0 && course.progressPercent < 100).length;
  const overallProgress = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + Number(course.progressPercent || 0), 0) / courses.length)
    : 0;
  const continueCourse = useMemo(
    () =>
      [...courses]
        .filter((course) => course.progressPercent < 100)
        .sort((left, right) => {
          const leftResumeScore = left.lastLessonId ? 1 : 0;
          const rightResumeScore = right.lastLessonId ? 1 : 0;

          if (leftResumeScore !== rightResumeScore) {
            return rightResumeScore - leftResumeScore;
          }

          return Number(right.progressPercent || 0) - Number(left.progressPercent || 0);
        })[0] || null,
    [courses],
  );
  const completedLessons = dashboard?.stats?.completedLessons || 0;
  const averageScore = dashboard?.stats?.averageScore || 0;
  const streak = dashboard?.stats?.streak || 0;
  const recentAttempts = dashboard?.recentAttempts || [];
  const momentumSeries = useMemo(
    () =>
      buildMomentumSeries({
        overallProgress,
        averageScore,
        streak,
        completedLessons,
        recentAttempts,
      }),
    [averageScore, completedLessons, overallProgress, recentAttempts, streak],
  );
  const momentumLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Now"];
  const recommendationList = useMemo(() => {
    const enrolledIds = new Set(courses.map((course) => course.id));
    const categoryWeights = courses.reduce((map, course) => {
      map.set(course.category, (map.get(course.category) || 0) + 1);
      return map;
    }, new Map());

    const liveRecommendations = (catalog || [])
      .filter((course) => !enrolledIds.has(course.id))
      .map((course) => {
        const tone = getRecommendationTone(course.category);
        const sameCategory = categoryWeights.has(course.category);
        const reason = sameCategory
          ? `Matches the momentum you already have in ${course.category}.`
          : continueCourse
            ? `Complements ${continueCourse.title} with a fresh skill direction.`
            : "Recommended as a high-value next track for your dashboard demo.";

        return {
          ...course,
          ...tone,
          kind: "catalog",
          score: (sameCategory ? 20 : 6) + Number(course.lessonCount || 0) + Number(course.enrollmentCount || 0),
          reason,
        };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 3);

    if (liveRecommendations.length >= 3) {
      return liveRecommendations;
    }

    const needed = 3 - liveRecommendations.length;
    const fallback = curatedRecommendationLibrary
      .filter((item) => !liveRecommendations.some((course) => course.category === item.category))
      .slice(0, needed)
      .map((item) => ({ ...item, kind: "demo" }));

    return [...liveRecommendations, ...fallback];
  }, [catalog, continueCourse, courses]);
  const distributionItems = [
    {
      label: "Completed",
      value: completedCourses,
      barTone: "bg-gradient-to-r from-emerald-500 to-teal-500",
    },
    {
      label: "In Progress",
      value: inProgressCourses,
      barTone: "bg-gradient-to-r from-sky-500 to-cyan-500",
    },
    {
      label: "Ready to Start",
      value: pendingCourses,
      barTone: "bg-gradient-to-r from-amber-400 to-orange-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-4">
        <MetricCard
          label="Courses Enrolled"
          value={dashboard?.stats?.enrolledCourses || 0}
          accent="text-slate-900"
          meta="Active tracks currently attached to your learning path."
          icon={<FaLayerGroup />}
          iconTone="bg-slate-100 text-slate-700"
        />
        <MetricCard
          label="Average Progress"
          value={formatPercent(overallProgress)}
          accent="text-teal-700"
          meta="A quick read on how far you’ve moved across enrolled courses."
          icon={<FaChartLine />}
          iconTone="bg-teal-100 text-teal-700"
        />
        <MetricCard
          label="Quiz Confidence"
          value={`${averageScore}%`}
          accent="text-amber-600"
          meta="Based on your latest auto-evaluated quiz attempts."
          icon={<FaMedal />}
          iconTone="bg-amber-100 text-amber-700"
        />
        <MetricCard
          label="Current Streak"
          value={`${streak} days`}
          accent="text-sky-600"
          meta="Keep momentum alive by resuming one lesson today."
          icon={<FaBolt />}
          iconTone="bg-sky-100 text-sky-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="glass-panel overflow-hidden p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Continue Learning</p>
              <h2 className="mt-3 text-3xl text-slate-900">
                {continueCourse ? continueCourse.title : "Your next focused session starts here"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {continueCourse
                  ? `You’re ${formatPercent(continueCourse.progressPercent)} through this course. Pick up from ${
                      continueCourse.lastLessonId ? `lesson ${continueCourse.lastLessonId}` : "your next module"
                    } and keep the streak moving.`
                  : "Once you enroll in a course, your dashboard will surface the exact track to resume, along with progress and recommendations."}
              </p>
            </div>

            <div className="rounded-[26px] bg-slate-950 px-5 py-4 text-white shadow-xl shadow-slate-900/15">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Today’s target</p>
              <p className="mt-3 text-3xl font-semibold">
                {continueCourse ? formatPercent(continueCourse.progressPercent) : "Start"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="interactive-soft rounded-[26px] bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-teal-700">
                <FaBullseye />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Focus</p>
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-900">
                {continueCourse ? continueCourse.category : "Choose your first learning track"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {continueCourse ? "Keep building momentum inside the same subject area." : "Browse approved courses and start your dashboard journey."}
              </p>
            </div>
            <div className="interactive-soft rounded-[26px] bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-amber-700">
                <FaClock />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Saved Resume</p>
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-900">
                {continueCourse?.lastLessonId ? `Lesson ${continueCourse.lastLessonId}` : "Not saved yet"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {continueCourse ? "The backend remembers where you last stopped learning." : "Your last visited lesson appears here after you begin a course."}
              </p>
            </div>
            <div className="interactive-soft rounded-[26px] bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3 text-sky-700">
                <FaBook />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Lessons Left</p>
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-900">
                {continueCourse ? Math.max(continueCourse.lessonCount - continueCourse.completedLessons, 0) : 0}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {continueCourse ? "A clear count of the modules still between you and completion." : "This fills in automatically as you work through modules."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {continueCourse ? (
              <>
                <button className="button-primary" type="button" onClick={() => onOpenCourse(continueCourse.id)}>
                  <FaPlayCircle />
                  <span>Resume Course</span>
                </button>
                <button className="button-secondary" type="button" onClick={onNavigateCatalog}>
                  Find another track
                </button>
              </>
            ) : (
              <button className="button-primary" type="button" onClick={onNavigateCatalog}>
                Explore Catalog
                <FaArrowRight />
              </button>
            )}
          </div>
        </section>

        <section className="section-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Progress Tracking</p>
              <h2 className="mt-3 text-2xl text-slate-900">Learning momentum</h2>
            </div>
            <div className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
              {overallProgress}% pace
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            A visual pulse of your dashboard based on current progress, completed lessons, streak, and quiz performance.
          </p>

          <div className="mt-6">
            <ProgressTrendChart values={momentumSeries} labels={momentumLabels} />
          </div>

          <div className="mt-6 rounded-[28px] bg-stone-100 p-5">
            <div className="mb-4 flex items-center gap-3">
              <FaBrain className="text-teal-700" />
              <h3 className="text-lg font-semibold text-slate-900">Course state breakdown</h3>
            </div>
            <ProgressDistribution items={distributionItems} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className="glass-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">My Courses</p>
              <h2 className="mt-3 text-2xl text-slate-900">Track every enrolled course at a glance</h2>
            </div>
            <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{courses.length} active</div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {courses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                Enroll in a course from the catalog to start tracking your learning journey.
              </div>
            ) : (
              courses.map((course) => (
                <button
                  key={course.id}
                  className="interactive-card rounded-[24px] border border-slate-200 bg-white p-5 text-left shadow-sm"
                  type="button"
                  onClick={() => onOpenCourse(course.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                        {course.category}
                      </span>
                      <h3 className="mt-4 text-xl font-semibold text-slate-900">{course.title}</h3>
                    </div>
                    <FaArrowRight className="mt-1 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{course.description}</p>
                  <div className="mt-5 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-teal-600 to-sky-500"
                      style={{ width: formatPercent(course.progressPercent) }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                    <span>Progress: {formatPercent(course.progressPercent)}</span>
                    <span>{course.lessonCount} lessons</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="section-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Recommendations</p>
              <h2 className="mt-3 text-2xl text-slate-900">Personalized next picks</h2>
            </div>
            <FaLightbulb className="mt-1 text-xl text-amber-500" />
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            Suggestions are ranked from your current enrollments first, then padded with curated demo tracks so the dashboard always feels alive.
          </p>

          <div className="mt-6 space-y-4">
            {recommendationList.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                busyAction={busyAction}
                onEnroll={onEnroll}
                onOpenCourse={onOpenCourse}
                onNavigateCatalog={onNavigateCatalog}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="section-card p-6">
          <h2 className="text-2xl text-slate-900">Recent Quiz Attempts</h2>
          <div className="mt-6 space-y-4">
            {recentAttempts.length ? (
              recentAttempts.map((attempt, index) => (
                <div key={`${attempt.quizTitle}-${index}`} className="interactive-soft rounded-3xl bg-stone-100 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{attempt.quizTitle}</p>
                      <p className="mt-1 text-sm text-slate-500">{attempt.courseTitle}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                      {attempt.percentage}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    Score: {attempt.score}/{attempt.total}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{formatDate(attempt.submittedAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Your quiz submissions will show up here after you attempt a course assessment.
              </div>
            )}
          </div>
        </div>

        <div className="section-card p-6">
          <h2 className="text-2xl text-slate-900">Notifications</h2>
          <div className="mt-6">
            <NotificationList notifications={dashboard?.notifications || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InstructorOverview({ dashboard, onOpenCourse }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-5">
        <MetricCard label="Courses" value={dashboard?.stats?.totalCourses || 0} accent="text-slate-900" />
        <MetricCard label="Approved" value={dashboard?.stats?.approvedCourses || 0} accent="text-emerald-600" />
        <MetricCard label="Pending" value={dashboard?.stats?.pendingCourses || 0} accent="text-amber-600" />
        <MetricCard label="Learners" value={dashboard?.stats?.learners || 0} accent="text-sky-600" />
        <MetricCard label="Lessons" value={dashboard?.stats?.lessons || 0} accent="text-teal-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="glass-panel p-6">
          <h2 className="text-2xl text-slate-900">My Courses</h2>
          <div className="mt-6 grid gap-4">
            {(dashboard?.courses || []).map((course) => (
              <button
                key={course.id}
                className="interactive-card rounded-3xl border border-slate-200 bg-white p-5 text-left hover:border-teal-300"
                type="button"
                onClick={() => onOpenCourse(course.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{course.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{course.category}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {course.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="section-card p-6">
          <h2 className="text-2xl text-slate-900">Recent Enrollments</h2>
          <div className="mt-6 space-y-4">
            {dashboard?.recentEnrollments?.length ? (
              dashboard.recentEnrollments.map((entry, index) => (
                <div key={`${entry.studentName}-${index}`} className="interactive-soft rounded-3xl bg-stone-100 p-4">
                  <p className="font-semibold text-slate-900">{entry.studentName}</p>
                  <p className="mt-1 text-sm text-slate-500">Joined {entry.courseTitle}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{formatDate(entry.enrolledAt)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                New learner enrollments will appear here once students join your courses.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-card p-6">
        <h2 className="text-2xl text-slate-900">Notifications</h2>
        <div className="mt-6">
          <NotificationList notifications={dashboard?.notifications || []} />
        </div>
      </div>
    </div>
  );
}

function AdminOverview({ dashboard, onOpenCourse }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
        <MetricCard label="Users" value={dashboard?.stats?.totalUsers || 0} accent="text-slate-900" />
        <MetricCard label="Courses" value={dashboard?.stats?.totalCourses || 0} accent="text-sky-600" />
        <MetricCard label="Pending" value={dashboard?.stats?.pendingCourses || 0} accent="text-amber-600" />
        <MetricCard label="Enrollments" value={dashboard?.stats?.enrollments || 0} accent="text-emerald-600" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr,1fr]">
        <div className="glass-panel p-6">
          <h2 className="text-2xl text-slate-900">Recent Users</h2>
          <div className="mt-6 space-y-4">
            {(dashboard?.recentUsers || []).map((entry) => (
              <div key={entry.id} className="interactive-soft rounded-3xl bg-stone-100 p-4">
                <p className="font-semibold text-slate-900">{entry.name}</p>
                <p className="mt-1 text-sm text-slate-500">{entry.email}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {entry.role} | {formatDate(entry.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card p-6">
          <h2 className="text-2xl text-slate-900">Pending Courses</h2>
          <div className="mt-6 space-y-4">
            {(dashboard?.pendingCourses || []).length ? (
              dashboard.pendingCourses.map((course) => (
                <button
                  key={course.id}
                  className="interactive-soft w-full rounded-3xl bg-amber-50 p-4 text-left hover:bg-amber-100"
                  type="button"
                  onClick={() => onOpenCourse(course.id)}
                >
                  <p className="font-semibold text-amber-900">{course.title}</p>
                  <p className="mt-2 text-sm text-amber-800">{course.description}</p>
                </button>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                The moderation queue is empty right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="section-card p-6">
        <h2 className="text-2xl text-slate-900">Notifications</h2>
        <div className="mt-6">
          <NotificationList notifications={dashboard?.notifications || []} />
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ user, dashboard }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
      <div className="glass-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Profile</p>
        <h2 className="mt-3 text-3xl text-slate-900">{user.name}</h2>
        <p className="mt-2 text-sm text-slate-500">{user.email}</p>
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <div className="interactive-soft rounded-3xl bg-stone-100 p-4">Role: {user.role}</div>
          <div className="interactive-soft rounded-3xl bg-stone-100 p-4">Member since {formatDate(user.createdAt)}</div>
          <div className="interactive-soft rounded-3xl bg-stone-100 p-4">Authentication uses JWT cookies with hashed passwords on the backend.</div>
        </div>
      </div>

      <div className="section-card p-6">
        <h2 className="text-2xl text-slate-900">Notifications</h2>
        <div className="mt-6">
          <NotificationList notifications={dashboard?.notifications || []} />
        </div>
      </div>
    </div>
  );
}

function CoursesPanel({ courses, role, onOpenCourse }) {
  const title = role === "student" ? "My Courses" : "Course Portfolio";
  const description =
    role === "student"
      ? "Continue where you left off and jump back into any enrolled learning path."
      : "Open any course you own or oversee to review lessons, learner progress, and assessments.";

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <h2 className="text-3xl text-slate-900">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {courses?.length ? (
          courses.map((course) => (
            <button
              key={course.id}
              className="section-card interactive-card p-6 text-left"
              type="button"
              onClick={() => onOpenCourse(course.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-2xl text-slate-900">{course.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{course.category}</p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
                  {course.lessonCount} lessons
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">{course.description}</p>
              <div className="mt-5 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-gradient-to-r from-teal-600 to-sky-500" style={{ width: formatPercent(course.progressPercent) }} />
              </div>
              <p className="mt-3 text-sm text-slate-500">Progress: {formatPercent(course.progressPercent)}</p>
            </button>
          ))
        ) : (
          <div className="section-card p-8 text-sm text-slate-500">No courses are attached to this account yet.</div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({
  user,
  activeView,
  dashboard,
  catalog,
  categories,
  filters,
  catalogLoading,
  courseLoading,
  studioLoading,
  liveClassesLoading,
  adminLoading,
  busyAction,
  selectedCourse,
  activeLessonId,
  manageCourses,
  liveClasses,
  adminAnalytics,
  adminUsers,
  onNavigate,
  onLogout,
  onFilterChange,
  onOpenCourse,
  onEnroll,
  onSelectLesson,
  onCompleteLesson,
  onSubmitQuiz,
  onStudioSelectCourse,
  onNewCourse,
  onSaveCourse,
  onDeleteCourse,
  onAddLesson,
  onDeleteLesson,
  onSaveQuiz,
  onRegisterLiveClass,
  onSaveLiveClass,
  onDeleteLiveClass,
  onReviewCourse,
  onChangeUserRole,
}) {
  const navItems = useMemo(() => {
    const items = [{ key: "dashboard", label: "Dashboard", icon: FaChartLine }];

    if (user.role === "student") {
      items.push({ key: "courses", label: "My Courses", icon: FaBook });
    }

    items.push({ key: "catalog", label: "Catalog", icon: FaCompass });
    items.push({ key: "liveClasses", label: "Live Classes", icon: FaVideo });

    if (user.role === "instructor") {
      items.push({ key: "studio", label: "Studio", icon: FaUsersCog });
    }

    if (user.role === "admin") {
      items.push({ key: "studio", label: "Studio", icon: FaUsersCog });
      items.push({ key: "admin", label: "Admin", icon: FaShieldAlt });
    }

    items.push({ key: "profile", label: "Profile", icon: FaUser });
    return items;
  }, [user.role]);

  const headerTitle = {
    dashboard: "Dashboard",
    courses: "My Courses",
    catalog: "Catalog",
    liveClasses: "Live Classes",
    workspace: selectedCourse?.course?.title || "Workspace",
    studio: "Studio",
    admin: "Admin Panel",
    profile: "Profile",
  }[activeView];

  let mainContent = null;
  if (activeView === "dashboard") {
    if (user.role === "student") {
      mainContent = (
        <StudentOverview
          dashboard={dashboard}
          catalog={catalog}
          busyAction={busyAction}
          onOpenCourse={onOpenCourse}
          onEnroll={onEnroll}
          onNavigateCatalog={() => onNavigate("catalog")}
        />
      );
    } else if (user.role === "instructor") {
      mainContent = <InstructorOverview dashboard={dashboard} onOpenCourse={onOpenCourse} />;
    } else {
      mainContent = <AdminOverview dashboard={dashboard} onOpenCourse={onOpenCourse} />;
    }
  } else if (activeView === "courses") {
    mainContent = <CoursesPanel courses={dashboard?.courses || []} role={user.role} onOpenCourse={onOpenCourse} />;
  } else if (activeView === "catalog") {
    mainContent = (
      <CatalogPanel
        catalog={catalog}
        categories={categories}
        filters={filters}
        loading={catalogLoading}
        user={user}
        busyAction={busyAction}
        onFilterChange={onFilterChange}
        onOpenCourse={onOpenCourse}
        onEnroll={onEnroll}
      />
    );
  } else if (activeView === "liveClasses") {
    mainContent = (
      <LiveClassesPanel
        user={user}
        liveClasses={liveClasses}
        loading={liveClassesLoading}
        busyAction={busyAction}
        onRegisterLiveClass={onRegisterLiveClass}
        onSaveLiveClass={onSaveLiveClass}
        onDeleteLiveClass={onDeleteLiveClass}
      />
    );
  } else if (activeView === "workspace") {
    mainContent = (
      <CourseWorkspace
        user={user}
        courseDetail={selectedCourse}
        activeLessonId={activeLessonId}
        busyAction={busyAction}
        onSelectLesson={onSelectLesson}
        onCompleteLesson={onCompleteLesson}
        onSubmitQuiz={onSubmitQuiz}
        onEnroll={onEnroll}
        loading={courseLoading}
      />
    );
  } else if (activeView === "studio") {
    mainContent = (
      <InstructorStudio
        courses={manageCourses}
        selectedCourse={selectedCourse}
        loading={studioLoading}
        busyAction={busyAction}
        onSelectCourse={onStudioSelectCourse}
        onNewCourse={onNewCourse}
        onSaveCourse={onSaveCourse}
        onDeleteCourse={onDeleteCourse}
        onAddLesson={onAddLesson}
        onDeleteLesson={onDeleteLesson}
        onSaveQuiz={onSaveQuiz}
      />
    );
  } else if (activeView === "admin") {
    mainContent = (
      <AdminPanel
        analytics={adminAnalytics}
        users={adminUsers}
        loading={adminLoading}
        busyAction={busyAction}
        onReviewCourse={onReviewCourse}
        onChangeUserRole={onChangeUserRole}
        onOpenCourse={onOpenCourse}
      />
    );
  } else {
    mainContent = <ProfilePanel user={user} dashboard={dashboard} />;
  }

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1540px] flex-col overflow-hidden rounded-[34px] border border-white/70 bg-white/70 shadow-[0_30px_80px_-35px_rgba(15,41,66,0.35)] backdrop-blur md:flex-row">
        <aside className="w-full border-b border-slate-200 bg-slate-950 px-5 py-6 text-white md:w-72 md:border-b-0 md:border-r">
          <div className="mb-8">
            <BrandLogo compact dark />
            <p className="mt-3 text-sm text-slate-300">{user.role} workspace</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.key;

              return (
                <button
                  key={item.key}
                  className={`interactive-soft flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ${
                    active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                  type="button"
                  onClick={() => onNavigate(item.key)}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            className="interactive-soft mt-8 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-red-300 hover:bg-red-500/10 hover:text-red-200"
            type="button"
            onClick={onLogout}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </aside>

        <div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Dashboard</p>
              <h1 className="mt-3 text-4xl text-slate-900">{headerTitle}</h1>
            </div>
            <div className="rounded-[24px] bg-white px-5 py-4 shadow-sm">
              <p className="text-sm text-slate-500">Welcome back</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{user.name}</p>
            </div>
          </div>

          <div key={`${activeView}-${selectedCourse?.course?.id || "root"}`} className="page-shell">
            {mainContent}
          </div>
        </div>
      </div>
    </div>
  );
}
