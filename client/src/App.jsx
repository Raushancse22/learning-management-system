import React, { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import { api } from "./lib/api";
import { staticPages } from "./lib/siteContent";
import PublicLayout from "./layouts/PublicLayout";
import AuthPage from "./pages/AuthPage";
import CoursesPage from "./pages/CoursesPage";
import HomePage from "./pages/HomePage";
import PublicCoursePage from "./pages/PublicCoursePage";
import StaticPage from "./pages/StaticPage";

const initialFilters = {
  search: "",
  category: "",
};

function getErrorMessage(error) {
  if (error instanceof TypeError && error.message.toLowerCase().includes("fetch")) {
    return "The LMS backend is not reachable. Run `npm.cmd start` in `lms-website` and open `http://localhost:3000`.";
  }

  return error?.message || "Something went wrong while talking to the LMS backend.";
}

function RoleGuard({ user, allow, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function LearnRoutePage({ onLoadCourse, ...dashboardProps }) {
  const { courseId } = useParams();

  useEffect(() => {
    const parsedId = Number(courseId);
    if (Number.isFinite(parsedId)) {
      onLoadCourse(parsedId);
    }
  }, [courseId, onLoadCourse]);

  return <Dashboard activeView="workspace" {...dashboardProps} />;
}

function StudioRoutePage({ onLoadCourse, onClearCourse, ...dashboardProps }) {
  const { courseId } = useParams();

  useEffect(() => {
    if (!courseId) {
      onClearCourse();
      return;
    }

    const parsedId = Number(courseId);
    if (Number.isFinite(parsedId)) {
      onLoadCourse(parsedId);
    }
  }, [courseId, onClearCourse, onLoadCourse]);

  return <Dashboard activeView="studio" {...dashboardProps} />;
}

function PublicCourseRoutePage({ onLoadCourse, ...pageProps }) {
  const { courseId } = useParams();

  useEffect(() => {
    const parsedId = Number(courseId);
    if (Number.isFinite(parsedId)) {
      onLoadCourse(parsedId);
    }
  }, [courseId, onLoadCourse]);

  return <PublicCoursePage {...pageProps} />;
}

export default function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [filters, setFilters] = useState(initialFilters);
  const deferredSearch = useDeferredValue(filters.search);

  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [dashboard, setDashboard] = useState(null);
  const [manageCourses, setManageCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeLessonId, setActiveLessonId] = useState(null);

  const [courseLoading, setCourseLoading] = useState(false);
  const [studioLoading, setStudioLoading] = useState(false);
  const [liveClassesLoading, setLiveClassesLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [liveClasses, setLiveClasses] = useState([]);

  const [busyAction, setBusyAction] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const refreshCatalog = useCallback(
    async ({ search = "", category = "" } = {}) => {
      setCatalogLoading(true);
      try {
        const response = await api.getCatalog({ search, category });
        setCatalog(response.courses || []);
        setCategories(response.categories || []);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setCatalogLoading(false);
      }
    },
    [showToast],
  );

  const refreshRoleData = useCallback(
    async (currentUser) => {
      if (!currentUser) {
        setDashboard(null);
        setManageCourses([]);
        setLiveClasses([]);
        setLiveClassesLoading(false);
        setAdminAnalytics(null);
        setAdminUsers([]);
        return;
      }

      const jobs = [];

      setLiveClassesLoading(true);
      jobs.push(
        api
          .getLiveClasses()
          .then((response) => {
            setLiveClasses(response.classes || []);
          })
          .catch((error) => {
            showToast(getErrorMessage(error));
          })
          .finally(() => {
            setLiveClassesLoading(false);
          }),
      );

      jobs.push(
        api
          .getDashboard()
          .then((response) => {
            setDashboard(response);
          })
          .catch((error) => {
            showToast(getErrorMessage(error));
          }),
      );

      if (currentUser.role === "instructor" || currentUser.role === "admin") {
        setStudioLoading(true);
        jobs.push(
          api
            .getManagedCourses()
            .then((response) => {
              setManageCourses(response.courses || []);
            })
            .catch((error) => {
              showToast(getErrorMessage(error));
            })
            .finally(() => {
              setStudioLoading(false);
            }),
        );
      } else {
        setManageCourses([]);
        setStudioLoading(false);
      }

      if (currentUser.role === "admin") {
        setAdminLoading(true);
        jobs.push(
          Promise.all([api.getAdminAnalytics(), api.getAdminUsers()])
            .then(([analyticsResponse, usersResponse]) => {
              setAdminAnalytics(analyticsResponse);
              setAdminUsers(usersResponse.users || []);
            })
            .catch((error) => {
              showToast(getErrorMessage(error));
            })
            .finally(() => {
              setAdminLoading(false);
            }),
        );
      } else {
        setAdminAnalytics(null);
        setAdminUsers([]);
        setAdminLoading(false);
      }

      await Promise.allSettled(jobs);
    },
    [showToast],
  );

  const refreshAfterMutation = useCallback(
    async (currentUser) => {
      await Promise.all([
        refreshCatalog({ search: deferredSearch, category: filters.category }),
        refreshRoleData(currentUser),
      ]);
    },
    [deferredSearch, filters.category, refreshCatalog, refreshRoleData],
  );

  const loadCourse = useCallback(
    async (courseId) => {
      setCourseLoading(true);
      try {
        const detail = await api.getCourse(courseId);
        setSelectedCourse(detail);
        setActiveLessonId(detail.progress.lastLessonId || detail.progress.nextLessonId || detail.lessons[0]?.id || null);
        return detail;
      } catch (error) {
        showToast(getErrorMessage(error));
        return null;
      } finally {
        setCourseLoading(false);
      }
    },
    [showToast],
  );

  const clearSelectedCourse = useCallback(() => {
    setSelectedCourse(null);
    setActiveLessonId(null);
  }, []);

  useEffect(() => {
    refreshCatalog({ search: deferredSearch, category: filters.category });
  }, [deferredSearch, filters.category, user?.id, user?.role, refreshCatalog]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const response = await api.getSession();
        if (cancelled) {
          return;
        }

        const nextUser = response.user || null;
        setUser(nextUser);
        if (nextUser) {
          await refreshRoleData(nextUser);
        }
      } catch (error) {
        if (!cancelled) {
          showToast(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    initialize();
    return () => {
      cancelled = true;
    };
  }, [refreshRoleData, showToast]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const handleDashboardNavigate = useCallback(
    (view) => {
      const routes = {
        dashboard: "/dashboard",
        courses: "/my-courses",
        catalog: "/courses",
        liveClasses: "/live-classes",
        studio: "/studio",
        admin: "/admin",
        profile: "/profile",
        workspace: selectedCourse?.course?.id ? `/learn/${selectedCourse.course.id}` : "/courses",
      };

      navigate(routes[view] || "/dashboard");
    },
    [navigate, selectedCourse],
  );

  const handleOpenCourse = useCallback(
    (courseId) => {
      navigate(user ? `/learn/${courseId}` : `/courses/${courseId}`);
    },
    [navigate, user],
  );

  const handleOpenCoursePreview = useCallback(
    (courseId) => {
      navigate(`/courses/${courseId}`);
    },
    [navigate],
  );

  const handleOpenLearningPage = useCallback(() => {
    if (selectedCourse?.course?.id) {
      navigate(`/learn/${selectedCourse.course.id}`);
    }
  }, [navigate, selectedCourse]);

  const handleStudioSelectCourse = useCallback(
    (courseId) => {
      navigate(`/studio/courses/${courseId}`);
    },
    [navigate],
  );

  const handleLogin = useCallback(
    async (payload) => {
      setBusyAction("login");
      try {
        const response = await api.login(payload);
        setUser(response.user);
        clearSelectedCourse();
        await refreshAfterMutation(response.user);
        navigate("/dashboard");
        showToast(`Welcome back, ${response.user.name}.`);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
        setInitializing(false);
      }
    },
    [clearSelectedCourse, navigate, refreshAfterMutation, showToast],
  );

  const handleRegister = useCallback(
    async (payload) => {
      setBusyAction("register");
      try {
        const response = await api.register(payload);
        setUser(response.user);
        clearSelectedCourse();
        await refreshAfterMutation(response.user);
        navigate("/dashboard");
        showToast(`Account ready for ${response.user.name}.`);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
        setInitializing(false);
      }
    },
    [clearSelectedCourse, navigate, refreshAfterMutation, showToast],
  );

  const handleLogout = useCallback(async () => {
    setBusyAction("logout");
    try {
      await api.logout();
    } catch (error) {
      showToast(getErrorMessage(error));
    } finally {
      setUser(null);
      setDashboard(null);
      setManageCourses([]);
      setLiveClasses([]);
      setAdminAnalytics(null);
      setAdminUsers([]);
      clearSelectedCourse();
      setBusyAction(null);
      navigate("/");
      showToast("You have been signed out.");
    }
  }, [clearSelectedCourse, navigate, showToast]);

  const handleSelectLesson = useCallback(
    async (lessonId) => {
      setActiveLessonId(lessonId);
      if (!user) {
        return;
      }

      try {
        await api.resumeLesson(lessonId);
        setSelectedCourse((current) =>
          current
            ? {
                ...current,
                progress: {
                  ...current.progress,
                  lastLessonId: lessonId,
                },
              }
            : current,
        );
      } catch (error) {
        showToast(getErrorMessage(error));
      }
    },
    [showToast, user],
  );

  const handleEnroll = useCallback(
    async (courseId) => {
      if (!user) {
        showToast("Sign in first to enroll in a course.");
        navigate("/login");
        return;
      }

      setBusyAction(`enroll:${courseId}`);
      try {
        const detail = await api.enroll(courseId);
        setSelectedCourse(detail);
        setActiveLessonId(detail.progress.lastLessonId || detail.progress.nextLessonId || detail.lessons[0]?.id || null);
        await refreshAfterMutation(user);
        navigate(`/learn/${courseId}`);
        showToast(`Enrollment confirmed for ${detail.course.title}.`);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [navigate, refreshAfterMutation, showToast, user],
  );

  const handleCompleteLesson = useCallback(
    async (lessonId) => {
      if (!user) {
        return;
      }

      setBusyAction(`complete:${lessonId}`);
      try {
        const detail = await api.completeLesson(lessonId);
        setSelectedCourse(detail);
        setActiveLessonId(lessonId);
        await refreshAfterMutation(user);
        showToast("Lesson progress saved.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [refreshAfterMutation, showToast, user],
  );

  const handleSubmitQuiz = useCallback(
    async (quizId, answers) => {
      if (!user) {
        return;
      }

      setBusyAction("submit-quiz");
      try {
        const response = await api.submitQuiz(quizId, answers);
        setSelectedCourse(response.course);
        await refreshAfterMutation(user);
        showToast(`Quiz submitted. Score: ${response.result.score}/${response.result.total}.`);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [refreshAfterMutation, showToast, user],
  );

  const handleNewCourse = useCallback(() => {
    clearSelectedCourse();
    navigate("/studio");
  }, [clearSelectedCourse, navigate]);

  const handleSaveCourse = useCallback(
    async (courseId, payload) => {
      setBusyAction("save-course");
      try {
        const detail = courseId ? await api.updateCourse(courseId, payload) : await api.createCourse(payload);
        setSelectedCourse(detail);
        setActiveLessonId(detail.progress.lastLessonId || detail.progress.nextLessonId || detail.lessons[0]?.id || null);
        await refreshAfterMutation(user);
        navigate(`/studio/courses/${detail.course.id}`);
        showToast(courseId ? "Course updated successfully." : "Course created successfully.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [navigate, refreshAfterMutation, showToast, user],
  );

  const handleDeleteCourse = useCallback(
    async (courseId) => {
      setBusyAction("delete-course");
      try {
        await api.deleteCourse(courseId);
        if (selectedCourse?.course?.id === courseId) {
          clearSelectedCourse();
        }
        await refreshAfterMutation(user);
        navigate("/studio");
        showToast("Course deleted.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [clearSelectedCourse, navigate, refreshAfterMutation, selectedCourse, showToast, user],
  );

  const handleAddLesson = useCallback(
    async (courseId, formData) => {
      setBusyAction("save-lesson");
      try {
        const detail = await api.addLesson(courseId, formData);
        setSelectedCourse(detail);
        setActiveLessonId(detail.lessons[detail.lessons.length - 1]?.id || activeLessonId);
        await refreshAfterMutation(user);
        showToast("Lesson added to the course.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [activeLessonId, refreshAfterMutation, showToast, user],
  );

  const handleDeleteLesson = useCallback(
    async (lessonId) => {
      if (!selectedCourse?.course?.id) {
        return;
      }

      setBusyAction(`delete-lesson:${lessonId}`);
      try {
        await api.deleteLesson(lessonId);
        await loadCourse(selectedCourse.course.id);
        await refreshAfterMutation(user);
        showToast("Lesson deleted.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [loadCourse, refreshAfterMutation, selectedCourse, showToast, user],
  );

  const handleSaveQuiz = useCallback(
    async (courseId, payload) => {
      setBusyAction("save-quiz");
      try {
        const detail = await api.saveQuiz(courseId, payload);
        setSelectedCourse(detail);
        await refreshAfterMutation(user);
        showToast("Quiz saved successfully.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [refreshAfterMutation, showToast, user],
  );

  const handleRegisterLiveClass = useCallback(
    async (liveClassId) => {
      if (!user) {
        showToast("Sign in first to reserve a live class seat.");
        navigate("/login");
        return false;
      }

      setBusyAction(`register-live-class:${liveClassId}`);
      try {
        await api.registerLiveClass(liveClassId);
        await refreshRoleData(user);
        showToast("Your seat has been reserved for the live class.");
        return true;
      } catch (error) {
        showToast(getErrorMessage(error));
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [navigate, refreshRoleData, showToast, user],
  );

  const handleSaveLiveClass = useCallback(
    async (liveClassId, payload) => {
      setBusyAction("save-live-class");
      try {
        if (liveClassId) {
          await api.updateLiveClass(liveClassId, payload);
        } else {
          await api.createLiveClass(payload);
        }

        await refreshRoleData(user);
        showToast(liveClassId ? "Live class updated successfully." : "Live class scheduled successfully.");
        return true;
      } catch (error) {
        showToast(getErrorMessage(error));
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [refreshRoleData, showToast, user],
  );

  const handleDeleteLiveClass = useCallback(
    async (liveClassId) => {
      setBusyAction(`delete-live-class:${liveClassId}`);
      try {
        await api.deleteLiveClass(liveClassId);
        await refreshRoleData(user);
        showToast("Live class removed from the schedule.");
        return true;
      } catch (error) {
        showToast(getErrorMessage(error));
        return false;
      } finally {
        setBusyAction(null);
      }
    },
    [refreshRoleData, showToast, user],
  );

  const handleReviewCourse = useCallback(
    async (courseId, status) => {
      setBusyAction(`review:${courseId}:${status}`);
      try {
        const detail = await api.reviewCourse(courseId, status);
        if (selectedCourse?.course?.id === courseId) {
          setSelectedCourse(detail);
        }
        await refreshAfterMutation(user);
        showToast(`Course ${status}.`);
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [refreshAfterMutation, selectedCourse, showToast, user],
  );

  const handleChangeUserRole = useCallback(
    async (userId, role) => {
      setBusyAction(`role:${userId}`);
      try {
        const response = await api.updateUserRole(userId, role);
        if (user?.id === userId) {
          setUser(response.user);
          await refreshAfterMutation(response.user);
        } else {
          await refreshAfterMutation(user);
        }
        showToast("User role updated.");
      } catch (error) {
        showToast(getErrorMessage(error));
      } finally {
        setBusyAction(null);
      }
    },
    [refreshAfterMutation, showToast, user],
  );

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="glass-panel max-w-xl p-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Gatemate Learning</p>
          <h1 className="mt-4 text-4xl text-slate-900">Preparing the LMS website</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">Loading session state, public catalog pages, and role-specific workspace data.</p>
        </div>
      </div>
    );
  }

  const sharedDashboardProps = {
    user,
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
    onNavigate: handleDashboardNavigate,
    onLogout: handleLogout,
    onFilterChange: handleFilterChange,
    onOpenCourse: handleOpenCourse,
    onEnroll: handleEnroll,
    onSelectLesson: handleSelectLesson,
    onCompleteLesson: handleCompleteLesson,
    onSubmitQuiz: handleSubmitQuiz,
    onStudioSelectCourse: handleStudioSelectCourse,
    onNewCourse: handleNewCourse,
    onSaveCourse: handleSaveCourse,
    onDeleteCourse: handleDeleteCourse,
    onAddLesson: handleAddLesson,
    onDeleteLesson: handleDeleteLesson,
    onSaveQuiz: handleSaveQuiz,
    onRegisterLiveClass: handleRegisterLiveClass,
    onSaveLiveClass: handleSaveLiveClass,
    onDeleteLiveClass: handleDeleteLiveClass,
    onReviewCourse: handleReviewCourse,
    onChangeUserRole: handleChangeUserRole,
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <HomePage catalog={catalog} user={user} loading={catalogLoading} />
            </PublicLayout>
          }
        />
        <Route
          path="/courses"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <CoursesPage
                catalog={catalog}
                categories={categories}
                filters={filters}
                loading={catalogLoading}
                user={user}
                busyAction={busyAction}
                onFilterChange={handleFilterChange}
                onOpenCourse={handleOpenCoursePreview}
                onEnroll={handleEnroll}
              />
            </PublicLayout>
          }
        />
        <Route
          path="/courses/:courseId"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <PublicCourseRoutePage
                user={user}
                courseDetail={selectedCourse}
                activeLessonId={activeLessonId}
                busyAction={busyAction}
                loading={courseLoading}
                onLoadCourse={loadCourse}
                onSelectLesson={handleSelectLesson}
                onEnroll={handleEnroll}
                onOpenLearning={handleOpenLearningPage}
              />
            </PublicLayout>
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <PublicLayout user={user} onLogout={handleLogout}>
                <AuthPage mode="login" busyAction={busyAction} onLogin={handleLogin} onRegister={handleRegister} />
              </PublicLayout>
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <PublicLayout user={user} onLogout={handleLogout}>
                <AuthPage mode="register" busyAction={busyAction} onLogin={handleLogin} onRegister={handleRegister} />
              </PublicLayout>
            )
          }
        />
        <Route
          path="/about-us"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <StaticPage content={staticPages.about} />
            </PublicLayout>
          }
        />
        <Route
          path="/contact-us"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <StaticPage content={staticPages.contact} />
            </PublicLayout>
          }
        />
        <Route
          path="/careers"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <StaticPage content={staticPages.careers} />
            </PublicLayout>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <StaticPage content={staticPages.privacy} />
            </PublicLayout>
          }
        />
        <Route
          path="/terms-of-service"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <StaticPage content={staticPages.terms} />
            </PublicLayout>
          }
        />
        <Route
          path="/video-test"
          element={
            <PublicLayout user={user} onLogout={handleLogout}>
              <StaticPage content={staticPages.videoTest} />
            </PublicLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RoleGuard user={user}>
              <Dashboard activeView="dashboard" {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/my-courses"
          element={
            <RoleGuard user={user} allow={["student"]}>
              <Dashboard activeView="courses" {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/live-classes"
          element={
            <RoleGuard user={user}>
              <Dashboard activeView="liveClasses" {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/learn/:courseId"
          element={
            <RoleGuard user={user}>
              <LearnRoutePage onLoadCourse={loadCourse} {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/studio"
          element={
            <RoleGuard user={user} allow={["instructor", "admin"]}>
              <StudioRoutePage onLoadCourse={loadCourse} onClearCourse={clearSelectedCourse} {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/studio/courses/:courseId"
          element={
            <RoleGuard user={user} allow={["instructor", "admin"]}>
              <StudioRoutePage onLoadCourse={loadCourse} onClearCourse={clearSelectedCourse} {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleGuard user={user} allow={["admin"]}>
              <Dashboard activeView="admin" {...sharedDashboardProps} />
            </RoleGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <RoleGuard user={user}>
              <Dashboard activeView="profile" {...sharedDashboardProps} />
            </RoleGuard>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-3xl bg-slate-950 px-5 py-4 text-sm text-white shadow-2xl">
          {toast}
        </div>
      ) : null}
    </>
  );
}
