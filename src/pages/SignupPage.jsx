import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  LineChart,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";
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

function SignupPage() {
  const navigate = useNavigate();
  const { signUpWithCredentials } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    organization: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreed: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field) => (event) => {
    const value = field === "agreed" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!form.organization.trim()) {
      nextErrors.organization = "Organization name is required.";
    }
    if (!form.email.trim()) {
      nextErrors.email = "Work email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid work email address.";
    }
    if (!form.phone.trim()) nextErrors.phone = "Mobile number is required.";
    if (!form.password.trim()) nextErrors.password = "Password is required.";
    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }
    if (!form.agreed) {
      nextErrors.agreed = "You must accept the terms to continue.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");

    const username = buildUsername(form.fullName, form.email);

    const { data, error } = await signUpWithCredentials({
      username,
      email: form.email,
      mobile_no: form.phone,
      full_name: form.fullName,
      password: form.password,
      role: "proponent",
    });

    if (error) {
      setErrors((current) => ({ ...current, email: error.message }));
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);

    if (data?.profile) {
      navigate(getRouteForRole(data.profile.role), { replace: true });
      return;
    }

    setSuccessMessage(
      "Account created successfully. Please sign in with your email and password.",
    );
    navigate("/login", { replace: true });
  };

  return (
    <AuthPageLayout
      aside={<SignupAside />}
      footer={<FooterLinks />}
      header={
        <BrandHeader
          rightContent={
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:inline">
                Already have an account?
              </span>
              <PrimaryButton to="/login" variant="secondary">
                Login
              </PrimaryButton>
            </div>
          }
          subtitle="PROJECT CLEARANCE PORTAL"
        />
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col justify-center">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#124734]">
            Onboarding
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-[#0f2138] sm:text-5xl">
            Proponent Registration
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
            Create your professional profile to start managing and proposing
            environmental impact projects.
          </p>
        </div>

        <AuthCard
          description="Register your organization to submit projects, track approvals, and maintain a complete environmental compliance trail through EcoClear."
          eyebrow="Trusted Registration"
          icon={<BadgeCheck className="h-5 w-5" />}
          title="Create a secure EcoClear account"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <AuthInput
                error={errors.fullName}
                icon={User}
                label="Full Name"
                onChange={updateField("fullName")}
                placeholder="Alex Rivera"
                type="text"
                value={form.fullName}
              />
              <AuthInput
                error={errors.organization}
                icon={BriefcaseBusiness}
                label="Organization / Company Name"
                onChange={updateField("organization")}
                placeholder="GreenGrid Infrastructure"
                type="text"
                value={form.organization}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <AuthInput
                error={errors.email}
                icon={Mail}
                label="Work Email"
                onChange={updateField("email")}
                placeholder="official@company.com"
                type="email"
                value={form.email}
              />
              <AuthInput
                error={errors.phone}
                icon={Phone}
                label="Mobile Number"
                onChange={updateField("phone")}
                placeholder="+91 98765 43210"
                type="tel"
                value={form.phone}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <PasswordInput
                error={errors.password}
                label="Password"
                onChange={updateField("password")}
                placeholder="Create a password"
                value={form.password}
              />
              <PasswordInput
                error={errors.confirmPassword}
                label="Confirm Password"
                onChange={updateField("confirmPassword")}
                placeholder="Confirm your password"
                value={form.confirmPassword}
              />
            </div>

            <CheckboxField
              checked={form.agreed}
              error={errors.agreed}
              label="I agree to the Terms of Service and Privacy Policy regarding data handling for environmental proponents."
              onChange={updateField("agreed")}
            />

            <PrimaryButton
              className="w-full justify-center"
              icon={ArrowRight}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating account..." : "Create Proponent Account"}
            </PrimaryButton>
          </form>

          {successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              className="font-semibold text-[#124734] transition hover:text-[#0d3628]"
              to="/login"
            >
              Login
            </Link>
          </p>
        </AuthCard>
      </div>
    </AuthPageLayout>
  );
}

function buildUsername(fullName, email) {
  const emailPart = email.split("@")[0] || "user";
  const normalizedName = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const base = normalizedName || emailPart.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${base}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

function SignupAside() {
  return (
    <aside className="auth-card-shadow relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(145deg,#124734_0%,#0d3628_62%,#174b38_100%)] p-7 text-white sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute right-[-4rem] top-[-3rem] h-36 w-36 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-3rem] left-[-2rem] h-40 w-40 rounded-full bg-[#8fd1b0]/20 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <LineChart className="h-8 w-8" />
        </div>

        <div className="mt-8 max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
            Proponent Network
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight">
            Empowering Sustainable Development
          </h2>
          <p className="mt-4 text-base leading-7 text-white/75">
            Join EcoClear to move environmental clearance collaboration into a
            secure, digital, and transparent workflow trusted by modern
            governance teams.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <InfoCard
            description="Live project visibility, action tracking, and faster compliance follow-through."
            icon={<LineChart className="h-5 w-5" />}
            title="Real-time Analytics"
          />
          <InfoCard
            description="Digitally structured records ready for approvals, reviews, and long-term archival."
            icon={<LockKeyhole className="h-5 w-5" />}
            title="Digital Certification"
          />
        </div>

        <div className="mt-auto pt-10">
          <p className="text-sm text-white/70">
            Trusting EcoClear for environmental transparency.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
              ISO 14001
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
              Secure Data
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function InfoCard({ icon, title, description }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/72">{description}</p>
    </div>
  );
}

export default SignupPage;
