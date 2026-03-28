import React from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaBookOpen,
  FaCertificate,
  FaChartLine,
  FaCheckCircle,
  FaLaptopCode,
  FaPlayCircle,
  FaStar,
  FaUsers,
} from "react-icons/fa";

const trustSignals = [
  { label: "Active learners", value: "12k+" },
  { label: "Structured modules", value: "250+" },
  { label: "Completion boost", value: "84%" },
  { label: "Learner rating", value: "4.8/5" },
];

const featureHighlights = [
  {
    icon: FaPlayCircle,
    title: "Learn in focused modules",
    body: "Videos, PDFs, quizzes, and resume learning all stay tied to one clear lesson flow.",
    accent: "text-teal-700",
    panel: "bg-teal-50",
  },
  {
    icon: FaChartLine,
    title: "Track visible progress",
    body: "Students see completion percentage, next lesson, and quiz outcomes without guessing what comes next.",
    accent: "text-sky-700",
    panel: "bg-sky-50",
  },
  {
    icon: FaLaptopCode,
    title: "Publish without friction",
    body: "Instructors can create courses, upload lesson assets, and manage content from a separate studio area.",
    accent: "text-amber-700",
    panel: "bg-amber-50",
  },
  {
    icon: FaCertificate,
    title: "Manage quality centrally",
    body: "Admins get approval workflows, analytics, and user control without cluttering the learner experience.",
    accent: "text-rose-700",
    panel: "bg-rose-50",
  },
];

const testimonials = [
  {
    quote: "The lesson flow feels guided instead of chaotic. I always know what to watch next and how much is left.",
    name: "Riya S.",
    role: "GATE aspirant",
    highlight: "Progress clarity",
  },
  {
    quote: "The separate studio pages make course publishing much easier than editing everything inside one crowded dashboard.",
    name: "Arjun M.",
    role: "Instructor",
    highlight: "Cleaner publishing",
  },
  {
    quote: "It feels premium from the first screen. The catalog, dashboard, and course pages finally look like one real product.",
    name: "Neha K.",
    role: "Independent learner",
    highlight: "Better first impression",
  },
];

function ProgressRail({ label, percent, tone }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DashboardPreview({ featuredCourses }) {
  const previewCourses = featuredCourses.length
    ? featuredCourses
    : [
        { id: 1, title: "Generative AI Mastery", category: "Generative AI" },
        { id: 2, title: "C++ Programming and Problem Solving", category: "C++" },
        { id: 3, title: "DSA and STL Accelerator", category: "Programming" },
      ];

  return (
    <div className="relative">
      <div className="absolute inset-x-10 top-5 h-28 rounded-full bg-teal-300/30 blur-3xl" />
      <div className="absolute -left-4 top-20 h-24 w-24 rounded-full bg-amber-300/30 blur-2xl" />
      <div className="glass-panel relative overflow-hidden p-5 shadow-2xl shadow-teal-900/10 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Learner Dashboard</p>
            <h2 className="mt-3 text-3xl text-slate-900">A front page that looks like a product</h2>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Live Preview</div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.15fr,0.85fr]">
          <div className="rounded-[28px] bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Today&apos;s focus</p>
                <p className="mt-2 text-2xl font-semibold">Resume your strongest streak</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-teal-300">
                <FaChartLine />
              </div>
            </div>

            <div className="mt-5 space-y-4 rounded-[24px] bg-white/8 p-4">
              <ProgressRail label="Weekly progress" percent={78} tone="bg-gradient-to-r from-teal-400 to-sky-400" />
              <ProgressRail label="Quiz readiness" percent={92} tone="bg-gradient-to-r from-amber-400 to-orange-400" />
              <div className="flex items-center justify-between rounded-[22px] border border-white/10 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">Upcoming checkpoint</p>
                  <p className="mt-1 text-slate-300">Prompt Engineering Quiz</p>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  Ready
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="section-card border-0 bg-white/90 p-5 shadow-none">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Trusted by students</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {trustSignals.map((signal) => (
                  <div key={signal.label} className="rounded-3xl bg-stone-100 px-4 py-4">
                    <p className="text-2xl font-semibold text-slate-900">{signal.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card border-0 bg-gradient-to-br from-white to-teal-50 p-5 shadow-none">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Top tracks</p>
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">Updated</span>
              </div>
              <div className="mt-4 space-y-3">
                {previewCourses.slice(0, 3).map((course, index) => (
                  <div key={course.id ?? course.title} className="interactive-soft flex items-center justify-between rounded-3xl bg-white/95 px-4 py-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Track {index + 1}</p>
                      <p className="mt-1 font-semibold text-slate-900">{course.title}</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                      {course.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedTrackSkeleton() {
  return (
    <div className="skeleton-surface p-6">
      <div className="skeleton-line h-6 w-24" />
      <div className="mt-5 skeleton-line h-9 w-4/5" />
      <div className="mt-3 skeleton-line h-4 w-full" />
      <div className="mt-2 skeleton-line h-4 w-11/12" />
      <div className="mt-8 flex items-center justify-between">
        <div className="skeleton-line h-4 w-28" />
        <div className="skeleton-line h-4 w-8" />
      </div>
    </div>
  );
}

export default function HomePage({ catalog, user, loading }) {
  const featuredCourses = catalog.slice(0, 3);

  return (
    <main className="page-shell mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-8 xl:grid-cols-[1.02fr,0.98fr] xl:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-700 shadow-sm">
            <FaStar className="text-amber-500" />
            Gatemate Learning
          </div>

          <div>
            <h1 className="type-hero max-w-3xl text-slate-900">
              Learn faster with a cleaner LMS built for serious students.
            </h1>
            <p className="type-lead mt-6 max-w-2xl">
              Gatemate Learning brings together guided lessons, structured progress, instructor publishing, and admin
              control in one polished platform that feels like a real learning product, not a documentation page.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link className="button-primary px-6 py-4 text-base" to={user ? "/dashboard" : "/register"}>
              {user ? "Open Dashboard" : "Start Learning"}
            </Link>
            <Link className="button-secondary px-6 py-4 text-base" to="/courses">
              Explore Courses
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="interactive-card rounded-[28px] bg-white/92 px-5 py-5 shadow-lg shadow-slate-200/40">
              <div className="flex items-center gap-3 text-teal-700">
                <FaUsers />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Students first</span>
              </div>
              <p className="mt-4 text-[1.05rem] font-semibold leading-7 text-slate-900">Dedicated flows for discovery, learning, and progress.</p>
            </div>
            <div className="interactive-card rounded-[28px] bg-white/92 px-5 py-5 shadow-lg shadow-slate-200/40">
              <div className="flex items-center gap-3 text-amber-600">
                <FaBookOpen />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Structured content</span>
              </div>
              <p className="mt-4 text-[1.05rem] font-semibold leading-7 text-slate-900">Videos, PDFs, quizzes, and lesson-wise modules stay organized.</p>
            </div>
            <div className="interactive-card rounded-[28px] bg-white/92 px-5 py-5 shadow-lg shadow-slate-200/40">
              <div className="flex items-center gap-3 text-sky-700">
                <FaCheckCircle />
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Always trackable</span>
              </div>
              <p className="mt-4 text-[1.05rem] font-semibold leading-7 text-slate-900">Resume learning, measure progress, and keep momentum visible.</p>
            </div>
          </div>
        </div>

        <DashboardPreview featuredCourses={featuredCourses} />
      </section>

      <section className="mt-12">
        <div className="glass-panel p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="type-eyebrow text-teal-700">Trusted By Students</p>
              <h2 className="type-section-title mt-3 text-slate-900">Built to feel motivating from the first click</h2>
            </div>
            <p className="type-copy max-w-2xl">
              Designed for self-paced learners, exam-focused communities, and instructor-led cohorts who want clarity,
              momentum, and a stronger first impression than a text-heavy LMS landing page.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[ 
              "GATE prep cohorts",
              "Independent learners",
              "Coding communities",
              "Instructor-led batches",
            ].map((label, index) => (
              <div key={label} className="interactive-card rounded-[28px] border border-white/70 bg-white/85 px-5 py-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Community {index + 1}</p>
                <p className="mt-3 text-[1.2rem] font-semibold leading-7 text-slate-900">{label}</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Learners trust clear modules, visible milestones, and course pages that make the platform feel credible.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="type-eyebrow text-teal-700">Feature Highlights</p>
            <h2 className="type-section-title mt-3 text-slate-900">Everything important stays easy to scan</h2>
          </div>
          <p className="type-copy max-w-2xl">
            Short, clear, high-impact blocks make it obvious what the LMS does and why students, instructors, and admins
            can all use it without friction.
          </p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-4">
          {featureHighlights.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="section-card interactive-card h-full p-6">
                <div className={`inline-flex rounded-2xl p-4 ${feature.panel} ${feature.accent}`}>
                  <Icon className="text-2xl" />
                </div>
                <h3 className="mt-5 text-[1.45rem] leading-8 text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="type-eyebrow text-teal-700">Testimonials</p>
            <h2 className="type-section-title mt-3 text-slate-900">What users notice immediately</h2>
          </div>
          <Link className="button-secondary" to={user ? "/dashboard" : "/register"}>
            {user ? "Go to workspace" : "Create account"}
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="section-card interactive-card flex h-full flex-col p-6">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, index) => (
                  <FaStar key={index} />
                ))}
              </div>
              <p className="mt-5 flex-1 text-[1.02rem] leading-8 text-slate-700">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="text-[1.05rem] font-semibold text-slate-900">{testimonial.name}</p>
                <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>
                <p className="mt-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                  {testimonial.highlight}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="type-eyebrow text-teal-700">Featured Tracks</p>
            <h2 className="type-section-title mt-3 text-slate-900">Start with courses that already feel production-ready</h2>
          </div>
          <Link className="button-secondary" to="/courses">
            View all courses
          </Link>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => <FeaturedTrackSkeleton key={index} />)
            : featuredCourses.map((course) => (
                <Link
                  key={course.id}
                  className="section-card interactive-card flex h-full flex-col p-6"
                  to={`/courses/${course.id}`}
                >
                  <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    {course.category}
                  </span>
                  <h3 className="mt-4 text-[1.45rem] leading-8 text-slate-900">{course.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{course.description}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                    Open course page
                    <FaArrowRight />
                  </div>
                </Link>
              ))}
        </div>
      </section>
    </main>
  );
}
