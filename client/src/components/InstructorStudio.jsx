import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaClipboardList, FaPlusCircle, FaTrashAlt, FaUpload } from "react-icons/fa";

import { formatDate } from "../lib/format";

const emptyCourseForm = {
  title: "",
  description: "",
  category: "",
  introText: "",
};

const emptyLessonForm = {
  title: "",
  summary: "",
  position: 1,
  videoUrl: "",
  videoFile: null,
  materialFile: null,
};

const emptyQuestionForm = {
  prompt: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "a",
};

export default function InstructorStudio({
  courses,
  selectedCourse,
  loading,
  busyAction,
  onSelectCourse,
  onNewCourse,
  onSaveCourse,
  onDeleteCourse,
  onAddLesson,
  onDeleteLesson,
  onSaveQuiz,
}) {
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [lessonForm, setLessonForm] = useState(emptyLessonForm);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizInstructions, setQuizInstructions] = useState("");
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [questions, setQuestions] = useState([]);
  const videoInputRef = useRef(null);
  const materialInputRef = useRef(null);

  const selectedSummary = selectedCourse?.course || null;

  useEffect(() => {
    if (!selectedSummary) {
      setCourseForm(emptyCourseForm);
      setLessonForm(emptyLessonForm);
      setQuizTitle("");
      setQuizInstructions("");
      setQuestions([]);
      return;
    }

    setCourseForm({
      title: selectedSummary.title || "",
      description: selectedSummary.description || "",
      category: selectedSummary.category || "",
      introText: selectedSummary.introText || "",
    });
    setLessonForm({
      ...emptyLessonForm,
      position: (selectedCourse?.lessons?.length || 0) + 1,
    });
    setQuizTitle(selectedCourse?.quiz?.title || "");
    setQuizInstructions(selectedCourse?.quiz?.instructions || "");
    setQuestions(
      (selectedCourse?.quiz?.questions || []).map((question) => ({
        prompt: question.prompt,
        optionA: question.options.a,
        optionB: question.options.b,
        optionC: question.options.c,
        optionD: question.options.d,
        correctOption: question.correctOption || "a",
      })),
    );
  }, [selectedCourse, selectedSummary]);

  const lessonCount = selectedCourse?.lessons?.length || 0;
  const courseId = selectedSummary?.id || null;
  const sortedCourses = useMemo(
    () => [...courses].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)),
    [courses],
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[320px,1fr]">
      <aside className="section-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Studio</p>
            <h2 className="mt-2 text-2xl text-slate-900">Manage your courses</h2>
          </div>
          <button className="button-secondary" type="button" onClick={onNewCourse}>
            <FaPlusCircle />
            <span className="ml-2">New</span>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton-surface p-4">
                <div className="skeleton-line h-5 w-3/5" />
                <div className="mt-3 skeleton-line h-4 w-24" />
                <div className="mt-5 skeleton-line h-4 w-1/2" />
              </div>
            ))
          ) : sortedCourses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              No courses yet. Create your first course to start adding lessons and quizzes.
            </div>
          ) : (
            sortedCourses.map((course) => (
              <button
                key={course.id}
                className={`interactive-soft w-full rounded-3xl border p-4 text-left ${
                  course.id === courseId ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                type="button"
                onClick={() => onSelectCourse(course.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{course.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{course.category}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {course.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  {course.lessonCount} lessons | {course.enrollmentCount} learners
                </p>
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="space-y-6">
        <div className="glass-panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Course Builder</p>
              <h2 className="mt-2 text-3xl text-slate-900">{courseId ? "Edit selected course" : "Create a new course"}</h2>
            </div>
            {selectedSummary ? (
              <div className="rounded-3xl bg-slate-950 px-4 py-3 text-sm text-white">Updated {formatDate(selectedSummary.updatedAt)}</div>
            ) : null}
          </div>

          <form
            className="mt-6 grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveCourse(courseId, courseForm);
            }}
          >
            <input
              className="field"
              placeholder="Course title"
              value={courseForm.title}
              onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              className="field"
              placeholder="Category"
              value={courseForm.category}
              onChange={(event) => setCourseForm((current) => ({ ...current, category: event.target.value }))}
            />
            <textarea
              className="field md:col-span-2"
              rows="4"
              placeholder="Course description"
              value={courseForm.description}
              onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))}
            />
            <textarea
              className="field md:col-span-2"
              rows="4"
              placeholder="Intro text for students"
              value={courseForm.introText}
              onChange={(event) => setCourseForm((current) => ({ ...current, introText: event.target.value }))}
            />
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button className="button-primary" type="submit" disabled={busyAction === "save-course"}>
                {busyAction === "save-course" ? "Saving..." : courseId ? "Update Course" : "Create Course"}
              </button>
              {courseId ? (
                <button
                  className="button-secondary text-red-600 hover:border-red-200 hover:text-red-700"
                  type="button"
                  disabled={busyAction === "delete-course"}
                  onClick={() => {
                    if (window.confirm("Delete this course and all of its lessons?")) {
                      onDeleteCourse(courseId);
                    }
                  }}
                >
                  <FaTrashAlt />
                  <span className="ml-2">{busyAction === "delete-course" ? "Deleting..." : "Delete Course"}</span>
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {courseId ? (
          <>
            <div className="section-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Lessons</p>
                  <h3 className="mt-2 text-2xl text-slate-900">Upload and organize content</h3>
                </div>
                <div className="rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">{lessonCount} total lessons</div>
              </div>

              <form
                className="mt-6 grid gap-4 md:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData();
                  formData.set("title", lessonForm.title);
                  formData.set("summary", lessonForm.summary);
                  formData.set("position", String(lessonForm.position));
                  formData.set("videoUrl", lessonForm.videoUrl);
                  if (lessonForm.videoFile) {
                    formData.set("videoFile", lessonForm.videoFile);
                  }
                  if (lessonForm.materialFile) {
                    formData.set("materialFile", lessonForm.materialFile);
                  }

                  onAddLesson(courseId, formData);
                  setLessonForm({
                    ...emptyLessonForm,
                    position: lessonCount + 1,
                  });
                  if (videoInputRef.current) {
                    videoInputRef.current.value = "";
                  }
                  if (materialInputRef.current) {
                    materialInputRef.current.value = "";
                  }
                }}
              >
                <input
                  className="field"
                  placeholder="Lesson title"
                  value={lessonForm.title}
                  onChange={(event) => setLessonForm((current) => ({ ...current, title: event.target.value }))}
                />
                <input
                  className="field"
                  type="number"
                  min="1"
                  placeholder="Position"
                  value={lessonForm.position}
                  onChange={(event) => setLessonForm((current) => ({ ...current, position: event.target.value }))}
                />
                <textarea
                  className="field md:col-span-2"
                  rows="3"
                  placeholder="Lesson summary"
                  value={lessonForm.summary}
                  onChange={(event) => setLessonForm((current) => ({ ...current, summary: event.target.value }))}
                />
                <input
                  className="field md:col-span-2"
                  placeholder="External video URL (optional)"
                  value={lessonForm.videoUrl}
                  onChange={(event) => setLessonForm((current) => ({ ...current, videoUrl: event.target.value }))}
                />
                <label className="field flex cursor-pointer items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <FaUpload className="text-teal-700" />
                    Upload video file
                  </span>
                  <input
                    ref={videoInputRef}
                    className="max-w-[190px] text-xs"
                    type="file"
                    accept="video/*"
                    onChange={(event) =>
                      setLessonForm((current) => ({ ...current, videoFile: event.target.files?.[0] || null }))
                    }
                  />
                </label>
                <label className="field flex cursor-pointer items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <FaUpload className="text-teal-700" />
                    Upload study material
                  </span>
                  <input
                    ref={materialInputRef}
                    className="max-w-[190px] text-xs"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(event) =>
                      setLessonForm((current) => ({ ...current, materialFile: event.target.files?.[0] || null }))
                    }
                  />
                </label>
                <div className="md:col-span-2">
                  <button className="button-primary" type="submit" disabled={busyAction === "save-lesson"}>
                    {busyAction === "save-lesson" ? "Uploading..." : "Add Lesson"}
                  </button>
                </div>
              </form>

              <div className="mt-8 grid gap-4">
                {(selectedCourse?.lessons || []).map((lesson) => (
                  <div key={lesson.id} className="interactive-soft rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Lesson {lesson.position}</p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-900">{lesson.title}</h4>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{lesson.summary || "No summary added yet."}</p>
                      </div>
                      <button
                        className="button-secondary text-red-600 hover:border-red-200 hover:text-red-700"
                        type="button"
                        disabled={busyAction === `delete-lesson:${lesson.id}`}
                        onClick={() => {
                          if (window.confirm("Delete this lesson?")) {
                            onDeleteLesson(lesson.id);
                          }
                        }}
                      >
                        <FaTrashAlt />
                        <span className="ml-2">{busyAction === `delete-lesson:${lesson.id}` ? "Deleting..." : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="section-card p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <FaClipboardList />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-700">Assessment Builder</p>
                  <h3 className="mt-2 text-2xl text-slate-900">Create or replace the quiz</h3>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <input className="field" placeholder="Quiz title" value={quizTitle} onChange={(event) => setQuizTitle(event.target.value)} />
                <textarea
                  className="field md:col-span-2"
                  rows="3"
                  placeholder="Quiz instructions"
                  value={quizInstructions}
                  onChange={(event) => setQuizInstructions(event.target.value)}
                />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <textarea
                  className="field md:col-span-2"
                  rows="3"
                  placeholder="Question prompt"
                  value={questionForm.prompt}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, prompt: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Option A"
                  value={questionForm.optionA}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, optionA: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Option B"
                  value={questionForm.optionB}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, optionB: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Option C"
                  value={questionForm.optionC}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, optionC: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder="Option D"
                  value={questionForm.optionD}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, optionD: event.target.value }))}
                />
                <select
                  className="field"
                  value={questionForm.correctOption}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, correctOption: event.target.value }))}
                >
                  <option value="a">Correct answer: A</option>
                  <option value="b">Correct answer: B</option>
                  <option value="c">Correct answer: C</option>
                  <option value="d">Correct answer: D</option>
                </select>
                <div className="md:col-span-2">
                  <button
                    className="button-secondary"
                    type="button"
                    onClick={() => {
                      if (
                        !questionForm.prompt ||
                        !questionForm.optionA ||
                        !questionForm.optionB ||
                        !questionForm.optionC ||
                        !questionForm.optionD
                      ) {
                        return;
                      }

                      setQuestions((current) => [...current, questionForm]);
                      setQuestionForm(emptyQuestionForm);
                    }}
                  >
                    <FaPlusCircle />
                    <span className="ml-2">Add Question</span>
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {questions.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    Add at least one multiple-choice question before saving the quiz.
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <div key={`${question.prompt}-${index}`} className="interactive-soft rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {index + 1}. {question.prompt}
                          </p>
                          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                            Correct answer: {question.correctOption.toUpperCase()}
                          </p>
                        </div>
                        <button
                          className="text-sm font-semibold text-red-600"
                          type="button"
                          onClick={() => setQuestions((current) => current.filter((_, questionIndex) => questionIndex !== index))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6">
                <button
                  className="button-primary"
                  type="button"
                  disabled={busyAction === "save-quiz"}
                  onClick={() =>
                    onSaveQuiz(courseId, {
                      title: quizTitle,
                      instructions: quizInstructions,
                      questions: questions.map((question) => ({
                        prompt: question.prompt,
                        optionA: question.optionA,
                        optionB: question.optionB,
                        optionC: question.optionC,
                        optionD: question.optionD,
                        correctOption: question.correctOption,
                      })),
                    })
                  }
                >
                  {busyAction === "save-quiz" ? "Saving..." : "Save Quiz"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="section-card p-10 text-center">
            <h3 className="text-2xl text-slate-900">Select a course to continue building</h3>
            <p className="mt-3 text-sm text-slate-600">Once a course is selected, you can upload lessons, attach material, and create quizzes.</p>
          </div>
        )}
      </div>
    </section>
  );
}
