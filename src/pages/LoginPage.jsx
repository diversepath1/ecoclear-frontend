import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { getRouteForRole, useAuth } from "../context/AuthContext";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";
import AuthPageLayout from "../components/auth/AuthPageLayout";
import BrandHeader from "../components/auth/BrandHeader";
import CheckboxField from "../components/auth/CheckboxField";
import FooterLinks from "../components/auth/FooterLinks";
import PasswordInput from "../components/auth/PasswordInput";
import PrimaryButton from "../components/auth/PrimaryButton";

function LoginPage() {
  const navigate = useNavigate();
  const { signInWithCredentials } = useAuth();
  const [form, setForm] = useState({
    email: "",
    password: "",
    staySignedIn: true,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    const value =
      field === "staySignedIn" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!form.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    const { data, error } = await signInWithCredentials({
      email: form.email,
      password: form.password,
    });

    if (error || !data?.profile) {
      setErrors({
        email: error?.message || "Invalid email or password.",
        password: error?.message || "Invalid email or password.",
      });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    navigate(getRouteForRole(data.profile.role), { replace: true });
  };

  return (
    <AuthPageLayout footer={<FooterLinks />} header={<BrandHeader />}>
      <div className="mx-auto flex w-full max-w-xl flex-col justify-center">
        <div className="mb-8 text-center lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#124734]">
            Secure Access
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-[#0f2138] sm:text-5xl">
            Welcome Back
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-500">
            Chhattisgarh Environment Conservation Board
          </p>
        </div>

        <AuthCard
          description="Access your EcoClear workspace to manage environmental clearance applications, compliance reviews, and approved project records."
          eyebrow="Secure Portal Access"
          icon={<LockKeyhole className="h-5 w-5" />}
          title="Authorized Compliance Login"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <AuthInput
              autoComplete="email"
              error={errors.email}
              icon={Mail}
              label="Email Address"
              onChange={handleChange("email")}
              placeholder="Enter your email address"
              type="email"
              value={form.email}
            />

            <div className="space-y-3">
              <PasswordInput
                autoComplete="current-password"
                error={errors.password}
                label="Password"
                onChange={handleChange("password")}
                placeholder="Enter your password"
                value={form.password}
              />
              <div className="flex items-center justify-end">
                <Link
                  className="text-sm font-medium text-[#124734] transition hover:text-[#0d3628]"
                  to="/signup"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            <CheckboxField
              checked={form.staySignedIn}
              label="Stay signed in for 30 days"
              onChange={handleChange("staySignedIn")}
            />

            <PrimaryButton
              className="w-full justify-center"
              icon={ArrowRight}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in to Dashboard"}
            </PrimaryButton>
          </form>

          <div className="space-y-5 rounded-[24px] border border-[#d8efe3] bg-[#f7fbf8] p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d8efe3] text-[#124734]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0f2138]">
                  Protected compliance access
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Your session is encrypted and monitored according to EcoClear
                  governance standards for environmental data handling.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                Secure Session
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                Govt Workflow
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-2">
                Audit Ready
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              className="font-semibold text-[#124734] transition hover:text-[#0d3628]"
              to="/signup"
            >
              Create a proponent account
            </Link>
          </p>
        </AuthCard>
      </div>
    </AuthPageLayout>
  );
}

export default LoginPage;
