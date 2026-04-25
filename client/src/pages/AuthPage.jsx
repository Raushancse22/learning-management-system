import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaCheckCircle, FaCircleNotch, FaLock, FaMobileAlt, FaUserGraduate } from "react-icons/fa";

import { classNames } from "../lib/format";

const demoAccounts = [
  {
    label: "Student",
    email: "student@gatematelearning.dev",
    password: "Student@123",
  },
  {
    label: "Instructor",
    email: "instructor@gatematelearning.dev",
    password: "Instructor@123",
  },
  {
    label: "Admin",
    email: "admin@gatematelearning.dev",
    password: "Admin@123",
  },
];

const registerSteps = [
  { id: 1, label: "Basic Info", icon: FaMobileAlt },
  { id: 2, label: "Course / Interest", icon: FaUserGraduate },
  { id: 3, label: "Security", icon: FaLock },
];

const examOptions = ["GATE", "BPSC", "UPSC", "SSC", "CAT", "Banking", "Web Development", "Generative AI", "C++", "Other"];

function normalizeMobile(value = "") {
  return String(value).replace(/\D/g, "");
}

function getPasswordStrength(password = "") {
  let score = 0;
  if (password.length >= 8) {
    score += 1;
  }
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }
  if (/\d/.test(password)) {
    score += 1;
  }
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (!password) {
    return { label: "Start typing", tone: "text-slate-400", fill: "bg-slate-200", width: "w-0" };
  }

  if (score <= 1) {
    return { label: "Weak", tone: "text-rose-600", fill: "bg-rose-500", width: "w-1/3" };
  }

  if (score <= 3) {
    return { label: "Medium", tone: "text-amber-600", fill: "bg-amber-500", width: "w-2/3" };
  }

  return { label: "Strong", tone: "text-emerald-600", fill: "bg-emerald-500", width: "w-full" };
}

function createInitialRegisterForm() {
  return {
    name: "",
    mobile: "",
    email: "",
    examPreparingFor: "GATE",
    customExamPreparingFor: "",
    password: "",
    confirmPassword: "",
    otp: "",
    role: "student",
  };
}

function StepIndicator({ currentStep }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {registerSteps.map((step) => {
        const Icon = step.icon;
        const active = currentStep === step.id;
        const completed = currentStep > step.id;

        return (
          <div
            key={step.id}
            className={classNames(
              "rounded-3xl border px-4 py-4 transition",
              completed || active ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={classNames(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  completed ? "bg-emerald-500 text-white" : active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {completed ? <FaCheckCircle /> : <Icon />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Step {step.id}</p>
                <p className="mt-1 font-semibold text-slate-900">{step.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldNote({ message = "", tone = "neutral" }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={classNames(
        "mt-2 text-sm",
        tone === "success" ? "text-emerald-600" : tone === "error" ? "text-rose-600" : tone === "warning" ? "text-amber-600" : "text-slate-500",
      )}
    >
      {message}
    </p>
  );
}

function getInlineError(error) {
  return error?.data?.fieldErrors || {};
}

export default function AuthPage({
  mode,
  busyAction,
  onLogin,
  onCheckRegistration,
  onRequestRegistrationOtp,
  onVerifyRegistrationOtp,
}) {
  const isLogin = mode === "login";
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState(createInitialRegisterForm);
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [availability, setAvailability] = useState({
    email: { available: false, message: "" },
    mobile: { available: false, message: "" },
  });
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [verification, setVerification] = useState(null);
  const [infoMessage, setInfoMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const title = useMemo(() => (isLogin ? "Sign in to your learning portal" : "Create a pro-level learner account"), [isLogin]);
  const passwordStrength = useMemo(() => getPasswordStrength(registerForm.password), [registerForm.password]);
  const isOtpStepActive = !isLogin && currentStep === 3 && Boolean(verification);
  const passwordHelper = useMemo(() => {
    if (!registerForm.password) {
      return { message: "Use 8+ characters with letters, numbers, and a symbol.", tone: "neutral" };
    }

    if (registerForm.password.length < 8) {
      return { message: "Password too short. Use at least 8 characters.", tone: "error" };
    }

    if (passwordStrength.label === "Strong") {
      return { message: "Strong password. This is ready to use.", tone: "success" };
    }

    return { message: "Good start. Add uppercase, numbers, or symbols to make it stronger.", tone: "warning" };
  }, [passwordStrength.label, registerForm.password]);
  const confirmPasswordHelper = useMemo(() => {
    if (!registerForm.confirmPassword) {
      return { message: "Re-enter the same password to confirm it.", tone: "neutral" };
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      return { message: "Passwords do not match yet.", tone: "error" };
    }

    return { message: "Passwords match.", tone: "success" };
  }, [registerForm.confirmPassword, registerForm.password]);

  useEffect(() => {
    if (isLogin) {
      return undefined;
    }

    const email = registerForm.email.trim().toLowerCase();
    const mobile = normalizeMobile(registerForm.mobile);
    if (!email && !mobile) {
      setAvailability({
        email: { available: false, message: "" },
        mobile: { available: false, message: "" },
      });
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const response = await onCheckRegistration({ email, mobile });
        setAvailability(
          response.fields || {
            email: { available: false, message: "" },
            mobile: { available: false, message: "" },
          },
        );
      } catch {
        setAvailability({
          email: { available: false, message: "" },
          mobile: { available: false, message: "" },
        });
      } finally {
        setCheckingAvailability(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [isLogin, onCheckRegistration, registerForm.email, registerForm.mobile]);

  function setRegisterField(key, value) {
    setRegisterForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setSubmitError("");
    setInfoMessage("");
    if (key !== "otp" && verification) {
      setVerification(null);
    }
  }

  async function validateStepOne() {
    const nextErrors = {};
    if (!registerForm.name.trim()) {
      nextErrors.name = "Full name is required.";
    }
    if (!normalizeMobile(registerForm.mobile)) {
      nextErrors.mobile = "Enter a valid mobile number.";
    }
    if (!registerForm.email.trim()) {
      nextErrors.email = "Email is required.";
    }

    try {
      const response = await onCheckRegistration({
        email: registerForm.email,
        mobile: registerForm.mobile,
      });
      const remoteFields = response.fields || {};
      if (remoteFields.email?.message && !remoteFields.email.available) {
        nextErrors.email = remoteFields.email.message;
      }
      if (remoteFields.mobile?.message && !remoteFields.mobile.available) {
        nextErrors.mobile = remoteFields.mobile.message;
      }
      setAvailability(remoteFields);
    } catch {
      // Keep local validation in place if the availability check cannot complete.
    }

    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepTwo() {
    const nextErrors = {};
    const selectedExam =
      registerForm.examPreparingFor === "Other" ? registerForm.customExamPreparingFor.trim() : registerForm.examPreparingFor.trim();

    if (!selectedExam) {
      nextErrors.examPreparingFor = "Choose the exam or track you are preparing for.";
    }

    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  function validateStepThree() {
    const nextErrors = {};
    if (!registerForm.password) {
      nextErrors.password = "Password is required.";
    } else if (registerForm.password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters long.";
    }

    if (!registerForm.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (registerForm.password !== registerForm.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  }

  async function handleNextStep() {
    if (currentStep === 1) {
      if (await validateStepOne()) {
        setCurrentStep(2);
      }
      return;
    }

    if (currentStep === 2 && validateStepTwo()) {
      setCurrentStep(3);
    }
  }

  async function handleRequestOtp() {
    setSubmitError("");
    setInfoMessage("");

    const isStepOneValid = await validateStepOne();
    const isStepTwoValid = validateStepTwo();
    const isStepThreeValid = validateStepThree();

    if (!isStepOneValid || !isStepTwoValid || !isStepThreeValid) {
      return;
    }

    try {
      const response = await onRequestRegistrationOtp({
        name: registerForm.name,
        mobile: normalizeMobile(registerForm.mobile),
        email: registerForm.email.trim().toLowerCase(),
        examPreparingFor: registerForm.examPreparingFor,
        customExamPreparingFor: registerForm.customExamPreparingFor,
        password: registerForm.password,
        role: "student",
      });
      setVerification(response.verification || null);
      setInfoMessage("OTP generated. Enter the code below to finish creating the account.");
      setRegisterField("otp", "");
    } catch (error) {
      setFieldErrors((current) => ({ ...current, ...getInlineError(error) }));
      setSubmitError(error.message || "Unable to send OTP right now.");
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setSubmitError("");
    setInfoMessage("");

    if (!registerForm.otp.trim()) {
      setFieldErrors((current) => ({ ...current, otp: "Enter the OTP to verify your account." }));
      return;
    }

    try {
      await onVerifyRegistrationOtp({
        email: registerForm.email.trim().toLowerCase(),
        mobile: normalizeMobile(registerForm.mobile),
        otp: registerForm.otp,
      });
    } catch (error) {
      setSubmitError(error.message || "Unable to verify OTP right now.");
    }
  }

  return (
    <main className="page-shell mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-7 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="glass-panel p-8 lg:p-12">
          <p className="type-eyebrow text-teal-700">{isLogin ? "Login" : "Register"}</p>
          <h1 className="type-page-title mt-4 text-slate-900">{title}</h1>
          <p className="type-lead mt-6 max-w-xl">
            {isLogin
              ? "Access your dashboard, courses, live classes, progress, and admin tools from one focused sign-in screen."
              : "This new registration flow feels like a serious EdTech product: guided onboarding, exam capture, password strength, instant checks, and OTP verification."}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className={isLogin ? "button-primary" : "button-secondary"} to="/login">
              Login
            </Link>
            <Link className={!isLogin ? "button-primary" : "button-secondary"} to="/register">
              Register
            </Link>
          </div>

          {!isLogin ? (
            <div className="mt-10 space-y-4 rounded-[28px] border border-teal-100 bg-white/70 p-6">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-1 text-teal-600" />
                <div>
                  <p className="font-semibold text-slate-900">Multi-step registration</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Basic info, course interest, and security are collected in a clean guided flow.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-1 text-teal-600" />
                <div>
                  <p className="font-semibold text-slate-900">Data-driven learner profiles</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">The platform now stores mobile number and exam-prep intent instead of just name and email.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-1 text-teal-600" />
                <div>
                  <p className="font-semibold text-slate-900">OTP verification</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">New accounts are only created after the registration OTP is verified.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10">
              <p className="type-eyebrow text-slate-400">Demo Credentials</p>
              <div className="mt-4 space-y-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    className="interactive-soft flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-stone-50 px-4 py-4 text-left hover:border-teal-300"
                    type="button"
                    onClick={() => setLoginForm({ email: account.email, password: account.password })}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{account.label}</p>
                      <p className="text-sm text-slate-500">{account.email}</p>
                    </div>
                    <span className="text-sm font-semibold text-teal-700">Use</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="section-card p-8 lg:p-10">
          {isLogin ? (
            <form
              className="grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                onLogin(loginForm);
              }}
            >
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  className="field"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  className="field"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>

              <button className="button-primary mt-2" type="submit" disabled={busyAction === "login"}>
                {busyAction === "login" ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form className="grid gap-6" onSubmit={handleVerifyOtp}>
              <StepIndicator currentStep={currentStep} />

              {currentStep === 1 ? (
                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                    <input className="field" value={registerForm.name} onChange={(event) => setRegisterField("name", event.target.value)} />
                    <FieldNote message={fieldErrors.name} tone="error" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Mobile</label>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={registerForm.mobile}
                      onChange={(event) => setRegisterField("mobile", event.target.value)}
                    />
                    <FieldNote
                      message={fieldErrors.mobile || availability.mobile.message || (checkingAvailability ? "Checking mobile..." : "")}
                      tone={
                        fieldErrors.mobile
                          ? "error"
                          : checkingAvailability
                            ? "warning"
                            : availability.mobile.message
                              ? availability.mobile.available
                                ? "success"
                                : "error"
                              : "neutral"
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                    <input className="field" type="email" value={registerForm.email} onChange={(event) => setRegisterField("email", event.target.value)} />
                    <FieldNote
                      message={fieldErrors.email || availability.email.message || (checkingAvailability ? "Checking email..." : "")}
                      tone={
                        fieldErrors.email
                          ? "error"
                          : checkingAvailability
                            ? "warning"
                            : availability.email.message
                              ? availability.email.available
                                ? "success"
                                : "error"
                              : "neutral"
                      }
                    />
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Exam Preparing For</label>
                    <select
                      className="field"
                      value={registerForm.examPreparingFor}
                      onChange={(event) => setRegisterField("examPreparingFor", event.target.value)}
                    >
                      {examOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <FieldNote message={fieldErrors.examPreparingFor} tone="error" />
                  </div>

                  {registerForm.examPreparingFor === "Other" ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Custom Exam / Interest</label>
                      <input
                        className="field"
                        value={registerForm.customExamPreparingFor}
                        onChange={(event) => setRegisterField("customExamPreparingFor", event.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="grid gap-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                    <input
                      className="field"
                      type="password"
                      value={registerForm.password}
                      onChange={(event) => setRegisterField("password", event.target.value)}
                    />
                    <div className="mt-3 overflow-hidden rounded-full bg-slate-200">
                      <div className={classNames("h-2 rounded-full transition-all", passwordStrength.fill, passwordStrength.width)} />
                    </div>
                    <p className={classNames("mt-2 text-sm font-semibold", passwordStrength.tone)}>Password strength: {passwordStrength.label}</p>
                    <FieldNote message={fieldErrors.password || passwordHelper.message} tone={fieldErrors.password ? "error" : passwordHelper.tone} />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
                    <input
                      className="field"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={(event) => setRegisterField("confirmPassword", event.target.value)}
                    />
                    <FieldNote
                      message={fieldErrors.confirmPassword || confirmPasswordHelper.message}
                      tone={fieldErrors.confirmPassword ? "error" : confirmPasswordHelper.tone}
                    />
                  </div>

                  {verification ? (
                    <div className="rounded-[28px] border border-teal-200 bg-teal-50 p-5">
                      <p className="text-sm font-semibold text-teal-900">
                        OTP sent to {verification.maskedMobile} and {verification.maskedEmail}
                      </p>
                      <p className="mt-2 text-sm text-teal-700">Enter the 6-digit code below to activate your account.</p>
                      {verification.deliveryMode === "demo-preview" ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-teal-300 bg-white px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">Demo OTP Preview</p>
                          <p className="mt-2 text-2xl font-bold tracking-[0.35em] text-slate-900">{verification.otpPreview}</p>
                        </div>
                      ) : null}
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">OTP</label>
                        <input
                          className="field"
                          inputMode="numeric"
                          value={registerForm.otp}
                          onChange={(event) => setRegisterField("otp", event.target.value)}
                        />
                        <FieldNote message={fieldErrors.otp} tone="error" />
                      </div>
                    </div>
                  ) : null}

                  {infoMessage ? <FieldNote message={infoMessage} tone="success" /> : null}
                  {submitError ? <FieldNote message={submitError} tone="error" /> : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {currentStep > 1 ? (
                  <button className="button-secondary" type="button" onClick={() => setCurrentStep((current) => current - 1)} disabled={isOtpStepActive}>
                    Back
                  </button>
                ) : null}

                {currentStep < 3 ? (
                  <button className="button-primary" type="button" onClick={handleNextStep}>
                    Continue
                  </button>
                ) : null}

                {currentStep === 3 && !verification ? (
                  <button className="button-primary" type="button" onClick={handleRequestOtp} disabled={busyAction === "request-otp"}>
                    {busyAction === "request-otp" ? "Sending OTP..." : "Send OTP"}
                  </button>
                ) : null}

                {currentStep === 3 && verification ? (
                  <>
                    <button className="button-primary" type="submit" disabled={busyAction === "verify-otp"}>
                      {busyAction === "verify-otp" ? "Verifying..." : "Verify OTP & Create Account"}
                    </button>
                    <button className="button-secondary" type="button" onClick={handleRequestOtp} disabled={busyAction === "request-otp"}>
                      {busyAction === "request-otp" ? (
                        <span className="inline-flex items-center gap-2">
                          <FaCircleNotch className="animate-spin" />
                          Resending...
                        </span>
                      ) : (
                        "Resend OTP"
                      )}
                    </button>
                  </>
                ) : null}
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
