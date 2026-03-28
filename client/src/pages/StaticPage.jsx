import React from "react";

export default function StaticPage({ content, children }) {
  return (
    <main className="page-shell mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <section className="glass-panel p-8 lg:p-12">
        <p className="type-eyebrow text-teal-700">{content.eyebrow}</p>
        <h1 className="type-page-title mt-4 text-slate-900">{content.title}</h1>
        <p className="type-lead mt-6 max-w-3xl">{content.intro}</p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {content.stats.map((stat) => (
            <div key={stat.label} className="metric-card bg-white/70">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">{stat.label}</p>
              <p className="mt-4 text-[1.6rem] leading-8 text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        {content.sections.map((section) => (
          <article key={section.title} className="section-card interactive-card p-7">
            <h2 className="text-[1.55rem] leading-8 text-slate-900">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{section.body}</p>
          </article>
        ))}
      </section>

      {children ? <section className="mt-12">{children}</section> : null}
    </main>
  );
}
