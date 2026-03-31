import React, { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaClock,
  FaEdit,
  FaExternalLinkAlt,
  FaPlus,
  FaTrashAlt,
  FaUserCheck,
  FaVideo,
} from "react-icons/fa";

import { classNames, formatDate } from "../lib/format";

function createDefaultFormState() {
  return {
    title: "",
    category: "",
    scheduledAt: "",
    durationMinutes: 60,
    meetingUrl: "",
    description: "",
  };
}

function toLocalDateTimeValue(value = "") {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function formatDuration(durationMinutes = 60) {
  const safeDuration = Math.max(Number(durationMinutes || 60), 15);
  const hours = Math.floor(safeDuration / 60);
  const minutes = safeDuration % 60;

  if (!hours) {
    return `${minutes} min`;
  }

  if (!minutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function getStateTone(state) {
  if (state === "live") {
    return {
      badge: "bg-emerald-100 text-emerald-700",
      accent: "border-emerald-200/80",
      label: "Live now",
    };
  }

  if (state === "completed") {
    return {
      badge: "bg-slate-200 text-slate-600",
      accent: "border-slate-200/90",
      label: "Completed",
    };
  }

  return {
    badge: "bg-sky-100 text-sky-700",
    accent: "border-sky-200/80",
    label: "Upcoming",
  };
}

function LiveClassStat({ label, value, tone, icon, helper }) {
  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className={`mt-4 text-4xl font-semibold ${tone}`}>{value}</p>
          <p className="mt-3 text-sm leading-6 text-slate-500">{helper}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

function LiveClassCard({ session, user, busyAction, onRegister, onEdit, onDelete }) {
  const stateTone = getStateTone(session.sessionState);
  const registerBusy = busyAction === `register-live-class:${session.id}`;
  const deleteBusy = busyAction === `delete-live-class:${session.id}`;
  const joinLabel = session.sessionState === "live" ? "Join now" : "Open meeting link";

  return (
    <article className={classNames("section-card interactive-card p-6", stateTone.accent)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", stateTone.badge)}>
              {stateTone.label}
            </span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {session.category}
            </span>
            {session.isRegistered ? (
              <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Registered
              </span>
            ) : null}
            {session.canManage ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Host controls
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-2xl text-slate-900">{session.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{session.description}</p>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="interactive-soft rounded-2xl bg-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Schedule</p>
              <p className="mt-2 font-semibold text-slate-800">{formatDate(session.scheduledAt)}</p>
            </div>
            <div className="interactive-soft rounded-2xl bg-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Session</p>
              <p className="mt-2 font-semibold text-slate-800">
                {formatDuration(session.durationMinutes)} with {session.hostName}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-[240px] rounded-[26px] bg-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-900/15">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Attendance</p>
          <p className="mt-3 text-3xl font-semibold">{session.attendeeCount}</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {session.canManage
              ? "Manage the live room, updates, and host-side link from here."
              : session.isRegistered
                ? "Your seat is saved. Use the meeting link when it is time to join."
                : "Reserve your seat to unlock the join link and keep the session on your radar."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {session.meetingUrl ? (
              <a className="button-primary" href={session.meetingUrl} target="_blank" rel="noreferrer">
                <FaExternalLinkAlt />
                <span>{joinLabel}</span>
              </a>
            ) : null}

            {!session.canManage && user.role === "student" && !session.isRegistered && session.sessionState !== "completed" ? (
              <button className="button-secondary" type="button" disabled={registerBusy} onClick={() => onRegister(session.id)}>
                <FaUserCheck />
                <span>{registerBusy ? "Saving..." : "Reserve seat"}</span>
              </button>
            ) : null}

            {session.canManage ? (
              <>
                <button className="button-secondary" type="button" onClick={() => onEdit(session.id)}>
                  <FaEdit />
                  <span>Edit</span>
                </button>
                <button className="button-secondary text-red-600 hover:border-red-300 hover:text-red-600" type="button" disabled={deleteBusy} onClick={() => onDelete(session.id)}>
                  <FaTrashAlt />
                  <span>{deleteBusy ? "Removing..." : "Delete"}</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function LiveClassesLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="skeleton-surface h-40 p-6">
            <div className="skeleton-line h-3 w-24" />
            <div className="skeleton-line mt-6 h-10 w-28" />
            <div className="skeleton-line mt-6 h-3 w-full" />
            <div className="skeleton-line mt-3 h-3 w-5/6" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="skeleton-surface h-[420px] p-6" />
        <div className="skeleton-surface h-[420px] p-6" />
      </div>
    </div>
  );
}

export default function LiveClassesPanel({
  user,
  liveClasses,
  loading,
  busyAction,
  onRegisterLiveClass,
  onSaveLiveClass,
  onDeleteLiveClass,
}) {
  const canManageLiveClasses = user.role === "instructor" || user.role === "admin";
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(createDefaultFormState);

  const sortedClasses = useMemo(() => liveClasses || [], [liveClasses]);
  const liveNowCount = sortedClasses.filter((session) => session.sessionState === "live").length;
  const upcomingCount = sortedClasses.filter((session) => session.sessionState !== "completed").length;
  const mySessions = sortedClasses.filter((session) => session.isRegistered || session.canManage);
  const nextSession = sortedClasses.find((session) => session.sessionState !== "completed") || null;
  const editingSession = editingId ? sortedClasses.find((session) => session.id === editingId) || null : null;

  useEffect(() => {
    if (!editingSession) {
      setDraft(createDefaultFormState());
      return;
    }

    setDraft({
      title: editingSession.title,
      category: editingSession.category,
      scheduledAt: toLocalDateTimeValue(editingSession.scheduledAt),
      durationMinutes: editingSession.durationMinutes,
      meetingUrl: editingSession.meetingUrl,
      description: editingSession.description,
    });
  }, [editingSession]);

  const handleDraftChange = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManageLiveClasses || !draft.title || !draft.category || !draft.scheduledAt || !draft.meetingUrl || !draft.description) {
      return;
    }

    const success = await onSaveLiveClass(editingId, {
      title: draft.title,
      category: draft.category,
      scheduledAt: new Date(draft.scheduledAt).toISOString(),
      durationMinutes: Number(draft.durationMinutes) || 60,
      meetingUrl: draft.meetingUrl,
      description: draft.description,
    });

    if (success) {
      setEditingId(null);
      setDraft(createDefaultFormState());
    }
  };

  const handleDelete = async (liveClassId) => {
    const session = sortedClasses.find((item) => item.id === liveClassId);
    if (!session) {
      return;
    }

    if (!window.confirm(`Delete "${session.title}" from the live class schedule?`)) {
      return;
    }

    const success = await onDeleteLiveClass(liveClassId);
    if (success && editingId === liveClassId) {
      setEditingId(null);
      setDraft(createDefaultFormState());
    }
  };

  if (loading) {
    return <LiveClassesLoading />;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Live Classes</p>
            <h1 className="mt-3 text-4xl text-slate-900 lg:text-5xl">Interactive sessions in a dedicated space</h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Keep scheduled classes separate from recorded coursework with a clean live-session hub for registrations, joining links, and host-side scheduling.
            </p>
          </div>

          <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white shadow-xl shadow-slate-900/15">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Next session</p>
            <p className="mt-3 text-2xl font-semibold">{nextSession ? nextSession.title : "Nothing scheduled yet"}</p>
            <p className="mt-2 text-sm text-slate-300">{nextSession ? formatDate(nextSession.scheduledAt) : "Create or register for a live class to see it here."}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <LiveClassStat
          label="Upcoming Sessions"
          value={upcomingCount}
          tone="text-slate-900"
          helper="All scheduled live classes that learners can still join."
          icon={<FaCalendarAlt />}
        />
        <LiveClassStat
          label="Live Right Now"
          value={liveNowCount}
          tone="text-emerald-600"
          helper="Sessions currently in progress and ready to join."
          icon={<FaVideo />}
        />
        <LiveClassStat
          label={canManageLiveClasses ? "Hosted / Saved" : "My Schedule"}
          value={mySessions.length}
          tone="text-sky-600"
          helper={canManageLiveClasses ? "Classes you host plus any sessions already attached to you." : "Sessions you have already reserved from this dashboard."}
          icon={<FaChalkboardTeacher />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.18fr,0.82fr]">
        <section className="space-y-4">
          {sortedClasses.length ? (
            sortedClasses.map((session) => (
              <LiveClassCard
                key={session.id}
                session={session}
                user={user}
                busyAction={busyAction}
                onRegister={onRegisterLiveClass}
                onEdit={setEditingId}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="section-card p-8 text-sm text-slate-500">
              No live classes are scheduled yet. {canManageLiveClasses ? "Use the scheduler to create the first session." : "Check back soon for upcoming sessions."}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="section-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">My Schedule</p>
                <h2 className="mt-3 text-2xl text-slate-900">{canManageLiveClasses ? "Hosted and saved sessions" : "Registered sessions"}</h2>
              </div>
              <FaClock className="mt-1 text-xl text-slate-400" />
            </div>

            <div className="mt-6 space-y-4">
              {mySessions.length ? (
                mySessions.map((session) => (
                  <div key={session.id} className="interactive-soft rounded-3xl bg-stone-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{session.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(session.scheduledAt)}</p>
                      </div>
                      <span className={classNames("rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]", getStateTone(session.sessionState).badge)}>
                        {getStateTone(session.sessionState).label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {session.canManage ? `Hosting as ${session.hostName}` : `Hosted by ${session.hostName}`}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  {canManageLiveClasses
                    ? "Your hosted sessions will appear here once you schedule one."
                    : "Reserve a live class seat to keep your own schedule handy."}
                </div>
              )}
            </div>
          </section>

          {canManageLiveClasses ? (
            <section className="glass-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-700">Host Controls</p>
                  <h2 className="mt-3 text-2xl text-slate-900">{editingSession ? "Edit live class" : "Schedule a live class"}</h2>
                </div>
                <FaPlus className="mt-1 text-xl text-slate-400" />
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Keep live mentoring separate from recorded lessons by attaching a schedule, meeting link, and quick session brief.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <input className="field" placeholder="Live class title" value={draft.title} onChange={(event) => handleDraftChange("title", event.target.value)} />
                <input className="field" placeholder="Category" value={draft.category} onChange={(event) => handleDraftChange("category", event.target.value)} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <input
                    className="field"
                    type="datetime-local"
                    value={draft.scheduledAt}
                    onChange={(event) => handleDraftChange("scheduledAt", event.target.value)}
                  />
                  <input
                    className="field"
                    type="number"
                    min="15"
                    step="15"
                    value={draft.durationMinutes}
                    onChange={(event) => handleDraftChange("durationMinutes", event.target.value)}
                    placeholder="Duration (minutes)"
                  />
                </div>

                <input
                  className="field"
                  placeholder="Meeting URL (Zoom / Meet / Teams)"
                  value={draft.meetingUrl}
                  onChange={(event) => handleDraftChange("meetingUrl", event.target.value)}
                />

                <textarea
                  className="field min-h-[140px] resize-y"
                  placeholder="Describe the agenda, outcomes, and who should attend."
                  value={draft.description}
                  onChange={(event) => handleDraftChange("description", event.target.value)}
                />

                <div className="flex flex-wrap gap-3">
                  <button className="button-primary" type="submit" disabled={busyAction === "save-live-class"}>
                    <FaVideo />
                    <span>{busyAction === "save-live-class" ? "Saving..." : editingSession ? "Update session" : "Create session"}</span>
                  </button>
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(createDefaultFormState());
                    }}
                  >
                    Clear form
                  </button>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
