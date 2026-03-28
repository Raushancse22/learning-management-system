async function parseResponse(response) {
  if (response.status === 204) {
    return {};
  }

  const payload = await response.text();
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(payload);
  } catch {
    return { message: payload };
  }
}

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;
  const nextHeaders = new Headers(headers || {});
  let nextBody = body;

  if (body && !isFormData && typeof body !== "string") {
    nextHeaders.set("Content-Type", "application/json");
    nextBody = JSON.stringify(body);
  }

  const response = await fetch(path, {
    credentials: "include",
    headers: nextHeaders,
    body: nextBody,
    ...rest,
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  getSession: () => request("/api/auth/me"),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  getCatalog: (filters = {}) => {
    const searchParams = new URLSearchParams();
    if (filters.search) {
      searchParams.set("search", filters.search);
    }
    if (filters.category) {
      searchParams.set("category", filters.category);
    }

    const query = searchParams.toString();
    return request(`/api/catalog${query ? `?${query}` : ""}`);
  },
  getDashboard: () => request("/api/dashboard"),
  getCourse: (courseId) => request(`/api/courses/${courseId}`),
  enroll: (courseId) => request(`/api/courses/${courseId}/enroll`, { method: "POST" }),
  resumeLesson: (lessonId) => request(`/api/lessons/${lessonId}/resume`, { method: "POST" }),
  completeLesson: (lessonId) => request(`/api/lessons/${lessonId}/complete`, { method: "POST" }),
  submitQuiz: (quizId, answers) => request(`/api/quizzes/${quizId}/submit`, { method: "POST", body: { answers } }),
  getManagedCourses: () => request("/api/manage/courses"),
  createCourse: (payload) => request("/api/courses", { method: "POST", body: payload }),
  updateCourse: (courseId, payload) => request(`/api/courses/${courseId}`, { method: "PUT", body: payload }),
  deleteCourse: (courseId) => request(`/api/courses/${courseId}`, { method: "DELETE" }),
  addLesson: (courseId, formData) => request(`/api/courses/${courseId}/lessons`, { method: "POST", body: formData }),
  deleteLesson: (lessonId) => request(`/api/lessons/${lessonId}`, { method: "DELETE" }),
  saveQuiz: (courseId, payload) => request(`/api/courses/${courseId}/quizzes`, { method: "POST", body: payload }),
  getAdminAnalytics: () => request("/api/admin/analytics"),
  getAdminUsers: () => request("/api/admin/users"),
  updateUserRole: (userId, role) => request(`/api/admin/users/${userId}`, { method: "PATCH", body: { role } }),
  reviewCourse: (courseId, status) =>
    request(`/api/admin/courses/${courseId}/approval`, { method: "PATCH", body: { status } }),
};
