import React from "react";
import { FaChartPie, FaCheckCircle, FaHourglassHalf, FaUsers } from "react-icons/fa";

function StatCard({ label, value, accent, icon }) {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">{label}</p>
        <div className={`rounded-2xl p-3 ${accent}`}>{icon}</div>
      </div>
      <p className="mt-6 text-4xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminPanel({
  analytics,
  users,
  loading,
  busyAction,
  onReviewCourse,
  onChangeUserRole,
  onOpenCourse,
}) {
  if (loading) {
    return (
      <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton-surface p-6">
              <div className="flex items-center justify-between">
                <div className="skeleton-line h-4 w-20" />
                <div className="skeleton-line h-12 w-12 rounded-2xl" />
              </div>
              <div className="mt-6 skeleton-line h-10 w-16" />
            </div>
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="skeleton-surface p-6">
            <div className="skeleton-line h-4 w-32" />
            <div className="mt-4 skeleton-line h-8 w-2/3" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-white/60 bg-white/45 p-5">
                  <div className="skeleton-line h-5 w-1/2" />
                  <div className="mt-3 skeleton-line h-4 w-full" />
                  <div className="mt-2 skeleton-line h-4 w-11/12" />
                  <div className="mt-6 flex gap-3">
                    <div className="skeleton-line h-11 w-24 rounded-2xl" />
                    <div className="skeleton-line h-11 w-28 rounded-2xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="skeleton-surface p-6">
            <div className="skeleton-line h-4 w-24" />
            <div className="mt-4 skeleton-line h-8 w-2/3" />
            <div className="mt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton-line h-16 w-full rounded-3xl" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!analytics) {
    return (
      <div className="section-card p-10 text-center">
        <h2 className="text-3xl text-slate-900">Admin analytics are not available yet</h2>
        <p className="mt-3 text-sm text-slate-600">Refresh the dashboard after signing in as an admin.</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-4">
        <StatCard label="Users" value={analytics.stats.totalUsers} accent="bg-teal-100 text-teal-700" icon={<FaUsers />} />
        <StatCard label="Courses" value={analytics.stats.totalCourses} accent="bg-amber-100 text-amber-700" icon={<FaChartPie />} />
        <StatCard label="Pending" value={analytics.stats.pendingCourses} accent="bg-sky-100 text-sky-700" icon={<FaHourglassHalf />} />
        <StatCard
          label="Enrollments"
          value={analytics.stats.totalEnrollments}
          accent="bg-emerald-100 text-emerald-700"
          icon={<FaCheckCircle />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="glass-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Moderation Queue</p>
              <h2 className="mt-2 text-3xl text-slate-900">Approve or reject courses</h2>
            </div>
            <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
              {analytics.pendingCourses.length} waiting
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {analytics.pendingCourses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                No pending courses right now. The moderation queue is clear.
              </div>
            ) : (
              analytics.pendingCourses.map((course) => (
                <div key={course.id} className="interactive-card rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{course.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{course.description}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">{course.category}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button className="button-secondary" type="button" onClick={() => onOpenCourse(course.id)}>
                        Review
                      </button>
                      <button
                        className="button-primary"
                        type="button"
                        disabled={busyAction === `review:${course.id}:approved`}
                        onClick={() => onReviewCourse(course.id, "approved")}
                      >
                        {busyAction === `review:${course.id}:approved` ? "Approving..." : "Approve"}
                      </button>
                      <button
                        className="button-secondary text-red-600 hover:border-red-200 hover:text-red-700"
                        type="button"
                        disabled={busyAction === `review:${course.id}:rejected`}
                        onClick={() => onReviewCourse(course.id, "rejected")}
                      >
                        {busyAction === `review:${course.id}:rejected` ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="section-card p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Platform Mix</p>
          <h2 className="mt-2 text-3xl text-slate-900">Roles and course health</h2>

          <div className="mt-6 space-y-4">
            {analytics.usersByRole.map((role) => (
              <div key={role.role} className="interactive-soft rounded-3xl bg-slate-100 p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{role.role}</span>
                  <span>{role.count}</span>
                </div>
              </div>
            ))}
            {analytics.courseStatuses.map((status) => (
              <div key={status.status} className="interactive-soft rounded-3xl bg-amber-50 p-4">
                <div className="flex items-center justify-between text-sm font-semibold text-amber-900">
                  <span>{status.status}</span>
                  <span>{status.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section-card overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">User Management</p>
            <h2 className="mt-2 text-3xl text-slate-900">Manage platform roles</h2>
          </div>
          <span className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">{users.length} accounts</span>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.25em] text-slate-400">
              <tr>
                <th className="pb-4 pr-4">User</th>
                <th className="pb-4 pr-4">Role</th>
                <th className="pb-4 pr-4">Enrollments</th>
                <th className="pb-4 pr-4">Courses</th>
                <th className="pb-4">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-slate-500">{user.email}</p>
                  </td>
                  <td className="py-4 pr-4 capitalize text-slate-700">{user.role}</td>
                  <td className="py-4 pr-4 text-slate-700">{user.enrollmentsCount}</td>
                  <td className="py-4 pr-4 text-slate-700">{user.coursesCount}</td>
                  <td className="py-4">
                    <select
                      className="field max-w-[180px] py-2"
                      value={user.role}
                      disabled={busyAction === `role:${user.id}`}
                      onChange={(event) => onChangeUserRole(user.id, event.target.value)}
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
