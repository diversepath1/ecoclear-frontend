import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Download,
  FilePenLine,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAiBackendBaseUrl,
  getAiBackendMissingConfigMessage,
} from "../lib/aiBackendUrl";
import { supabase } from "../lib/supabaseClient";
import { exportMomGistPdf, exportMomMinutesPdf } from "../utils/pdfExport";

const sidebarItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/mom-dashboard" },
  {
    key: "referred-cases",
    label: "Referred Cases",
    icon: FileText,
    route: "/mom-dashboard/referred-cases",
  },
  {
    key: "meeting-scheduled",
    label: "Meeting Scheduled",
    icon: CalendarClock,
    route: "/mom-dashboard/meeting-scheduled",
  },
  {
    key: "pending-mom",
    label: "Pending MoM",
    icon: FilePenLine,
    route: "/mom-dashboard/pending-mom",
  },
  {
    key: "finalized",
    label: "Finalized MoM",
    icon: CheckCircle2,
    route: "/mom-dashboard/finalized",
  },
];

const AI_BACKEND_BASE_URL = getAiBackendBaseUrl();

function MoMDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const [cases, setCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isMutatingCase, setIsMutatingCase] = useState(false);

  const assigneeName =
    profile?.full_name?.trim() || profile?.username || "MoM Specialist";
  const assigneeRoleLabel = formatRoleLabel(profile?.role);

  const currentView = useMemo(() => parseMomView(location.pathname), [location.pathname]);
  const referredCases = useMemo(() => cases.filter((item) => item.status === "Referred"), [cases]);
  const meetingScheduledCases = useMemo(
    () => cases.filter((item) => item.status === "Meeting Scheduled"),
    [cases],
  );
  const pendingMomCases = useMemo(() => cases.filter((item) => item.status === "Pending MoM"), [cases]);
  const finalizedCases = useMemo(() => cases.filter((item) => item.status === "Finalized"), [cases]);
  const editingCase = useMemo(
    () => cases.find((item) => item.id === currentView.editorId) ?? null,
    [cases, currentView.editorId],
  );
  const gistEditingCase = useMemo(
    () => cases.find((item) => item.id === currentView.gistId) ?? null,
    [cases, currentView.gistId],
  );

  const loadMomCases = async () => {
    setCasesLoading(true);
    setCasesError("");

    const { data: applicationRows, error: applicationsError } = await supabase
      .from("applications")
      .select(
        "id, application_code, project_name, sector_category, status, submitted_at, created_at",
      )
      .order("created_at", { ascending: false });

    if (applicationsError) {
      setCases([]);
      setCasesError(applicationsError.message || "Failed to load MoM cases.");
      setCasesLoading(false);
      return;
    }

    const applicationList = (applicationRows ?? []).filter((application) =>
      isMomRelevantStatus(application?.status),
    );
    if (applicationList.length === 0) {
      setCases([]);
      setCasesLoading(false);
      return;
    }

    const applicationIds = applicationList.map((item) => item.id);
    const { data: gistRows, error: gistError } = await supabase
      .from("meeting_gists")
      .select("application_id, gist_text, gist_json, provider, model_name, updated_at, created_at")
      .in("application_id", applicationIds);

    if (gistError) {
      setCases([]);
      setCasesError(gistError.message || "Failed to load meeting gist data.");
      setCasesLoading(false);
      return;
    }

    const gistByApplicationId = new Map(
      (gistRows ?? []).map((row) => [row.application_id, row]),
    );

    const mappedCases = applicationList.map((application) => {
      const gistRow = gistByApplicationId.get(application.id);
      return mapApplicationToMomCase(application, gistRow, assigneeName);
    });

    setCases(mappedCases);
    setCasesLoading(false);
  };

  useEffect(() => {
    loadMomCases();
  }, [assigneeName]);

  const openMinutesEditor = (caseId) => {
    window.open(`/mom-dashboard/editor/${encodeURIComponent(caseId)}`, "_blank", "noopener,noreferrer");
  };

  const openGistEditor = (caseId) => {
    window.open(`/mom-dashboard/gist/${encodeURIComponent(caseId)}`, "_blank", "noopener,noreferrer");
  };

  const runCaseMutation = async (task, onSuccess) => {
    setActionError("");
    setIsMutatingCase(true);

    try {
      await task();
      await loadMomCases();
      onSuccess?.();
    } catch (error) {
      setActionError(error?.message || "Failed to update MoM workflow.");
    } finally {
      setIsMutatingCase(false);
    }
  };

  const scheduleMeeting = async (caseId) => {
    const caseItem = cases.find((item) => item.id === caseId);
    if (!caseItem?.dbId) return;

    await runCaseMutation(async () => {
      const { error } = await supabase
        .from("applications")
        .update({ status: "meeting_scheduled" })
        .eq("id", caseItem.dbId);

      if (error) {
        throw new Error(error.message || "Failed to move case to Meeting Scheduled.");
      }
    }, () => navigate("/mom-dashboard/meeting-scheduled"));
  };

  const markMeetingDone = async (caseId) => {
    const caseItem = cases.find((item) => item.id === caseId);
    if (!caseItem?.dbId) return;

    await runCaseMutation(async () => {
      const { error } = await supabase
        .from("applications")
        .update({ status: "minutes_draft" })
        .eq("id", caseItem.dbId);

      if (error) {
        throw new Error(error.message || "Failed to move case to Pending MoM.");
      }
    }, () => navigate("/mom-dashboard/pending-mom"));
  };

  const saveDraftMinutes = async (caseId, minutesPayload) => {
    const caseItem = cases.find((item) => item.id === caseId);
    if (!caseItem?.dbId) return;

    await runCaseMutation(async () => {
      const gistJson = {
        ...(caseItem.gistJson ?? {}),
        minutes: minutesPayload,
      };

      const { error: gistError } = await supabase
        .from("meeting_gists")
        .upsert(
          {
            application_id: caseItem.dbId,
            gist_text: caseItem.gist ?? "",
            gist_json: gistJson,
            provider: caseItem.provider || "local",
            model_name: caseItem.modelName || "",
          },
          { onConflict: "application_id" },
        );

      if (gistError) {
        throw new Error(gistError.message || "Failed to save draft minutes.");
      }

      const { error: applicationError } = await supabase
        .from("applications")
        .update({ status: "minutes_draft" })
        .eq("id", caseItem.dbId);

      if (applicationError) {
        throw new Error(applicationError.message || "Failed to update application status.");
      }
    });
  };

  const finalizeMinutes = async (caseId, minutesPayload) => {
    const caseItem = cases.find((item) => item.id === caseId);
    if (!caseItem?.dbId) return;

    await runCaseMutation(async () => {
      const gistJson = {
        ...(caseItem.gistJson ?? {}),
        minutes: minutesPayload,
      };

      const { error: gistError } = await supabase
        .from("meeting_gists")
        .upsert(
          {
            application_id: caseItem.dbId,
            gist_text: caseItem.gist ?? "",
            gist_json: gistJson,
            provider: caseItem.provider || "local",
            model_name: caseItem.modelName || "",
          },
          { onConflict: "application_id" },
        );

      if (gistError) {
        throw new Error(gistError.message || "Failed to save finalized minutes.");
      }

      const { error: applicationError } = await supabase
        .from("applications")
        .update({ status: "finalized" })
        .eq("id", caseItem.dbId);

      if (applicationError) {
        throw new Error(applicationError.message || "Failed to finalize application.");
      }
    }, () => navigate("/mom-dashboard/finalized"));
  };

  const exportMinutesRecord = (caseId, format) => {
    const record = cases.find((item) => item.id === caseId);
    if (!record) return;

    if (format === "pdf") {
      exportMomMinutesPdf(record);
      return;
    }

    const minutesPayload = record.minutes ?? {};
    const body = [
      `Case Ref: ${record.id}`,
      `Meeting Title: ${record.meetingTitle}`,
      `Department: ${record.department}`,
      `Status: ${record.status}`,
      "",
      `AI Gist: ${record.gist}`,
      "",
      `Minutes Summary: ${minutesPayload.discussionSummary || "Not provided"}`,
      `Decisions: ${minutesPayload.decisionsTaken || "Not provided"}`,
      `Action Items: ${minutesPayload.actionItems || "Not provided"}`,
    ].join("\n");

    const fileName =
      `${record.id}-minutes.${format === "word" ? "doc" : "pdf"}`.replace(/\s+/g, "_");
    const mimeType = format === "word" ? "application/msword" : "application/pdf";

    const blob = new Blob([body], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const exportGistRecord = (caseId, format) => {
    const record = cases.find((item) => item.id === caseId);
    if (!record) return;

    if (format === "pdf") {
      exportMomGistPdf(record);
      return;
    }

    const fileName = `${record.id}-meeting-gist.${format === "word" ? "doc" : "pdf"}`;
    const mimeType = format === "word" ? "application/msword" : "application/pdf";
    const body = [
      `Case Ref: ${record.id}`,
      `Meeting Title: ${record.meetingTitle}`,
      `Department: ${record.department}`,
      "",
      "AI Generated Meeting Gist:",
      record.gist || "No gist available.",
    ].join("\n");

    const blob = new Blob([body], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const saveGistChanges = async (caseId, gistText) => {
    const caseItem = cases.find((item) => item.id === caseId);
    if (!caseItem?.dbId) return;

    await runCaseMutation(async () => {
      const { error } = await supabase
        .from("meeting_gists")
        .upsert(
          {
            application_id: caseItem.dbId,
            gist_text: gistText.trim(),
            gist_json: caseItem.gistJson ?? {},
            provider: caseItem.provider || "local",
            model_name: caseItem.modelName || "",
          },
          { onConflict: "application_id" },
        );

      if (error) {
        throw new Error(error.message || "Failed to save gist changes.");
      }
    }, () => navigate("/mom-dashboard/referred-cases"));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout failed", error);
    }
  };

  const activeSidebarKey =
    currentView.type === "editor"
      ? "pending-mom"
      : currentView.type === "gist-editor"
        ? "referred-cases"
        : currentView.type;

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-[#111827]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[300px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-[#f7faf8] lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#124734] text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[40px] leading-[1] tracking-tight text-[#124734]">EcoClear</p>
                <p className="-mt-0.5 text-lg text-slate-500">MoM Team Portal</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeSidebarKey;
              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[28px] ${
                    isActive
                      ? "bg-[#124734] text-white shadow-[0_12px_25px_rgba(18,71,52,0.2)]"
                      : "text-[#2e4665] hover:bg-white"
                  }`}
                  key={item.key}
                  onClick={() => navigate(item.route)}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-slate-200" />
              <div>
                <p className="text-[28px] font-semibold text-[#1f3048]">{assigneeName}</p>
                <p className="text-lg text-slate-500">{assigneeRoleLabel}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-[#f4f7f6]/95 px-6 py-4 backdrop-blur lg:px-8">
            <label className="relative hidden max-w-xl flex-1 sm:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-12 w-full rounded-xl border border-slate-200 bg-white/90 pl-12 pr-4 text-lg text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                placeholder="Search cases, meetings or documents..."
                type="text"
              />
            </label>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button className="rounded-lg p-2 text-slate-500 hover:bg-white" type="button">
                <Settings className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 text-slate-500 hover:bg-white" type="button">
                <Bell className="h-5 w-5" />
              </button>
              <span className="mx-1 h-8 w-px bg-slate-200" />
              <div className="hidden text-right sm:block">
                <p className="text-[19px] font-semibold text-[#1f3048]">{assigneeName}</p>
                <p className="text-sm text-slate-500">{assigneeRoleLabel}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[18px] font-semibold text-[#445a78] hover:bg-slate-50"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </header>

          <div className="space-y-6 p-6 lg:p-8">
            {actionError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[18px] text-rose-700">
                {actionError}
              </div>
            ) : null}

            {currentView.type === "dashboard" ? (
              <MomDashboardView
                casesError={casesError}
                casesLoading={casesLoading}
                finalizedCount={finalizedCases.length}
                isActionBusy={isMutatingCase}
                meetingCount={meetingScheduledCases.length}
                onEditGist={openGistEditor}
                onEditMinutes={openMinutesEditor}
                onExportGist={exportGistRecord}
                onExportMinutes={exportMinutesRecord}
                onMeetingDone={markMeetingDone}
                onScheduleMeeting={scheduleMeeting}
                recentCases={cases.slice(0, 6)}
                referredCount={referredCases.length}
              />
            ) : null}

            {currentView.type === "referred-cases" ? (
              <MomCasesPage
                casesError={casesError}
                casesLoading={casesLoading}
                description="Cases approved by scrutiny and referred with AI-generated gist."
                isActionBusy={isMutatingCase}
                onEditGist={openGistEditor}
                onEditMinutes={openMinutesEditor}
                onExportGist={exportGistRecord}
                onExportMinutes={exportMinutesRecord}
                onMeetingDone={markMeetingDone}
                onScheduleMeeting={scheduleMeeting}
                rows={referredCases}
                title="Referred Cases"
              />
            ) : null}

            {currentView.type === "meeting-scheduled" ? (
              <MomCasesPage
                casesError={casesError}
                casesLoading={casesLoading}
                description="Meetings are scheduled; MoM team can edit formal minutes after completion."
                isActionBusy={isMutatingCase}
                onEditGist={openGistEditor}
                onEditMinutes={openMinutesEditor}
                onExportGist={exportGistRecord}
                onExportMinutes={exportMinutesRecord}
                onMeetingDone={markMeetingDone}
                onScheduleMeeting={scheduleMeeting}
                rows={meetingScheduledCases}
                title="Meeting Scheduled"
              />
            ) : null}

            {currentView.type === "pending-mom" ? (
              <MomCasesPage
                casesError={casesError}
                casesLoading={casesLoading}
                description="Meeting is completed. MoM team can now edit and finalize formal minutes."
                isActionBusy={isMutatingCase}
                onEditGist={openGistEditor}
                onEditMinutes={openMinutesEditor}
                onExportGist={exportGistRecord}
                onExportMinutes={exportMinutesRecord}
                onMeetingDone={markMeetingDone}
                onScheduleMeeting={scheduleMeeting}
                rows={pendingMomCases}
                title="Pending MoM"
              />
            ) : null}

            {currentView.type === "finalized" ? (
              <MomCasesPage
                casesError={casesError}
                casesLoading={casesLoading}
                description="Finalized minutes are the last stage in this workflow."
                isActionBusy={isMutatingCase}
                onEditGist={openGistEditor}
                onEditMinutes={openMinutesEditor}
                onExportGist={exportGistRecord}
                onExportMinutes={exportMinutesRecord}
                onMeetingDone={markMeetingDone}
                onScheduleMeeting={scheduleMeeting}
                rows={finalizedCases}
                title="Finalized MoM"
              />
            ) : null}

            {currentView.type === "editor" ? (
              <MinutesEditorPage
                caseItem={editingCase}
                isSaving={isMutatingCase}
                loading={casesLoading}
                onBack={() => navigate("/mom-dashboard/pending-mom")}
                onFinalize={finalizeMinutes}
                onSaveDraft={saveDraftMinutes}
              />
            ) : null}

            {currentView.type === "gist-editor" ? (
              <GistEditorPage
                caseItem={gistEditingCase}
                isSaving={isMutatingCase}
                loading={casesLoading}
                onBack={() => navigate("/mom-dashboard/referred-cases")}
                onSave={saveGistChanges}
              />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function MomDashboardView({
  casesLoading,
  casesError,
  referredCount,
  meetingCount,
  finalizedCount,
  recentCases,
  isActionBusy,
  onMeetingDone,
  onScheduleMeeting,
  onEditGist,
  onEditMinutes,
  onExportGist,
  onExportMinutes,
}) {
  const gistsReceived = referredCount + meetingCount + finalizedCount;
  return (
    <>
      <section>
        <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">Team Dashboard</h1>
        <p className="mt-2 text-[29px] text-[#5a6f8d]">
          Manage and finalize meeting documentation for environmental compliance committee.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MomStatCard
          icon={<FileText className="h-5 w-5 text-blue-600" />}
          label="Referred Cases"
          tone="bg-blue-100"
          value={referredCount}
        />
        <MomStatCard
          icon={<Sparkles className="h-5 w-5 text-violet-600" />}
          label="AI Gists Received"
          tone="bg-violet-100"
          value={gistsReceived}
        />
        <MomStatCard
          icon={<CalendarClock className="h-5 w-5 text-amber-700" />}
          label="Meeting Scheduled"
          tone="bg-amber-100"
          value={meetingCount}
        />
        <MomStatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />}
          label="Finalized MoMs"
          tone="bg-emerald-100"
          value={finalizedCount}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#f9fbfa] px-6 py-4">
          <div>
            <h2 className="text-[38px] font-semibold text-[#111827]">Recent Meetings & Cases</h2>
            <p className="text-[22px] text-[#5a6f8d]">
              Gists are auto-created when scrutiny approves and refers cases.
            </p>
          </div>
        </div>
        <MomCasesTable
          casesError={casesError}
          casesLoading={casesLoading}
          isActionBusy={isActionBusy}
          onEditGist={onEditGist}
          onEditMinutes={onEditMinutes}
          onExportGist={onExportGist}
          onExportMinutes={onExportMinutes}
          onMeetingDone={onMeetingDone}
          onScheduleMeeting={onScheduleMeeting}
          rows={recentCases}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-[34px] font-semibold text-[#1f3048]">Workflow Summary</h3>
        <ul className="mt-3 space-y-2 text-[22px] text-[#4f6583]">
          <li className="flex gap-2">
            <CheckCircle2 className="mt-1 h-5 w-5 text-[#124734]" />
            Scrutiny-approved cases come with AI-generated meeting gist.
          </li>
          <li className="flex gap-2">
            <CalendarClock className="mt-1 h-5 w-5 text-[#124734]" />
            Case moves to Meeting Scheduled before minutes editing.
          </li>
          <li className="flex gap-2">
            <FilePenLine className="mt-1 h-5 w-5 text-[#124734]" />
            MoM team edits Formal Minutes template and sets final status.
          </li>
        </ul>
      </section>
    </>
  );
}

function MomCasesPage({
  title,
  description,
  rows,
  casesLoading,
  casesError,
  isActionBusy,
  onMeetingDone,
  onScheduleMeeting,
  onEditGist,
  onEditMinutes,
  onExportGist,
  onExportMinutes,
}) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">{title}</h1>
        <p className="mt-2 text-[29px] text-[#5a6f8d]">{description}</p>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-[#f9fbfa] px-6 py-4">
          <h2 className="text-[34px] font-semibold text-[#111827]">{title} List</h2>
        </div>
        <MomCasesTable
          casesError={casesError}
          casesLoading={casesLoading}
          isActionBusy={isActionBusy}
          onEditGist={onEditGist}
          onEditMinutes={onEditMinutes}
          onExportGist={onExportGist}
          onExportMinutes={onExportMinutes}
          onMeetingDone={onMeetingDone}
          onScheduleMeeting={onScheduleMeeting}
          rows={rows}
        />
      </article>
    </section>
  );
}

function MomCasesTable({
  rows,
  casesLoading,
  casesError,
  isActionBusy,
  onMeetingDone,
  onScheduleMeeting,
  onEditGist,
  onEditMinutes,
  onExportGist,
  onExportMinutes,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="border-b border-slate-200 bg-[#f6f9f7]">
          <tr>
            <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
              Case Ref
            </th>
            <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
              Meeting Title
            </th>
            <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
              Date
            </th>
            <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
              Status
            </th>
            <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
              Assignee
            </th>
            <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {casesLoading ? (
            <tr>
              <td className="px-5 py-8 text-[21px] text-[#5c6f89]" colSpan={6}>
                Loading MoM cases from database...
              </td>
            </tr>
          ) : null}
          {!casesLoading && casesError ? (
            <tr>
              <td className="px-5 py-8 text-[21px] font-medium text-rose-700" colSpan={6}>
                {casesError}
              </td>
            </tr>
          ) : null}
          {!casesLoading && !casesError && rows.length === 0 ? (
            <tr>
              <td className="px-5 py-8 text-[21px] text-[#5c6f89]" colSpan={6}>
                No cases in this stage.
              </td>
            </tr>
          ) : null}
          {!casesLoading && !casesError
            ? rows.map((row) => (
            <tr className="border-b border-slate-100 last:border-b-0" key={row.id}>
              <td className="px-5 py-3">
                <span className="rounded-md bg-[#e8f2eb] px-2.5 py-1 text-[20px] font-semibold text-[#124734]">
                  {row.id}
                </span>
              </td>
              <td className="px-5 py-3">
                <p className="text-[24px] font-semibold text-[#1f3048]">{row.meetingTitle}</p>
                <p className="text-[20px] text-[#5a6f8d]">{row.department}</p>
              </td>
              <td className="px-5 py-3 text-[22px] text-[#5c6f89]">{row.date}</td>
              <td className="px-5 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-5 py-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f2f6f5] px-2.5 py-1">
                  <div className="h-6 w-6 rounded-full bg-slate-300" />
                  <span className="text-[18px] font-semibold text-[#2e4665]">{row.assignee}</span>
                </div>
              </td>
              <td className="px-5 py-3">
                {row.status === "Referred" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isActionBusy}
                      onClick={() => onEditGist(row.id)}
                      type="button"
                    >
                      View / Edit Gist
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isActionBusy}
                      onClick={() => onScheduleMeeting(row.id)}
                      type="button"
                    >
                      Schedule Meeting
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                {row.status === "Meeting Scheduled" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <details className="relative inline-block text-left">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[18px] font-semibold text-[#124734] hover:bg-[#f2f8f4]">
                        <Download className="h-4 w-4" />
                        Download Gist
                      </summary>
                      <div className="absolute right-0 z-10 mt-2 min-w-[190px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#1f3048] hover:bg-slate-50"
                          onClick={() => onExportGist(row.id, "word")}
                          type="button"
                        >
                          Export as Word
                        </button>
                        <button
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#1f3048] hover:bg-slate-50"
                          onClick={() => onExportGist(row.id, "pdf")}
                          type="button"
                        >
                          Export as PDF
                        </button>
                      </div>
                    </details>

                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isActionBusy}
                      onClick={() => onMeetingDone(row.id)}
                      type="button"
                    >
                      Meeting Done
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                {row.status === "Pending MoM" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isActionBusy}
                      onClick={() => onEditMinutes(row.id)}
                      type="button"
                    >
                      Edit Minutes
                      <FilePenLine className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}

                {row.status === "Finalized" ? (
                  <div className="flex items-center gap-2">
                    <details className="relative inline-block text-left">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[18px] font-semibold text-[#124734] hover:bg-[#f2f8f4]">
                        <Download className="h-4 w-4" />
                        Download
                      </summary>
                      <div className="absolute right-0 z-10 mt-2 min-w-[190px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#1f3048] hover:bg-slate-50"
                          onClick={() => onExportMinutes(row.id, "word")}
                          type="button"
                        >
                          Export as Word
                        </button>
                        <button
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#1f3048] hover:bg-slate-50"
                          onClick={() => onExportMinutes(row.id, "pdf")}
                          type="button"
                        >
                          Export as PDF
                        </button>
                      </div>
                    </details>
                  </div>
                ) : null}
              </td>
            </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}

function GistEditorPage({ caseItem, loading, isSaving, onBack, onSave }) {
  const [gistText, setGistText] = useState(caseItem?.gist ?? "");

  useEffect(() => {
    setGistText(caseItem?.gist ?? "");
  }, [caseItem]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">Loading Gist...</h1>
      </section>
    );
  }

  if (!caseItem) {
    return (
      <section className="space-y-4">
        <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">Gist Not Found</h1>
        <button
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">
            Edit AI Generated Gist
          </h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Referred case {caseItem.id} - {caseItem.meetingTitle}
          </p>
        </div>
        <button
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-xl border border-slate-200 bg-[#f9fbfa] p-4">
          <p className="text-[18px] font-semibold text-[#536a87]">Case Ref</p>
          <p className="text-[22px] font-semibold text-[#1f3048]">{caseItem.id}</p>
          <p className="mt-2 text-[18px] font-semibold text-[#536a87]">Department</p>
          <p className="text-[22px] text-[#1f3048]">{caseItem.department}</p>
        </div>

        <label className="mt-4 block">
          <span className="block text-[18px] font-semibold text-[#536a87]">Meeting Gist</span>
          <textarea
            className="mt-1 min-h-[220px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
            onChange={(event) => setGistText(event.target.value)}
            value={gistText}
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2.5 text-[20px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={() => onSave(caseItem.id, gistText)}
            type="button"
          >
            Save Gist Changes
          </button>
        </div>
      </article>
    </section>
  );
}

function MinutesEditorPage({ caseItem, loading, isSaving, onBack, onSaveDraft, onFinalize }) {
  const [form, setForm] = useState(() => buildTemplateState(caseItem));
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    setForm(buildTemplateState(caseItem));
    setChatMessages([]);
    setChatInput("");
    setChatError("");
    setIsChatLoading(false);
  }, [caseItem]);

  if (loading) {
    return (
      <section className="space-y-4">
        <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">
          Loading Minutes Editor...
        </h1>
      </section>
    );
  }

  if (!caseItem) {
    return (
      <section className="space-y-4">
        <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">Editor Not Found</h1>
        <button
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </section>
    );
  }

  const onFieldChange = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const sendChatMessage = async () => {
    const message = chatInput.trim();
    if (!message || isChatLoading) return;

    if (!caseItem?.dbId) {
      setChatError("Case context is missing. Reload and try again.");
      return;
    }
    if (!AI_BACKEND_BASE_URL) {
      setChatError(getAiBackendMissingConfigMessage());
      return;
    }

    const historyForApi = chatMessages.map((item) => ({
      role: item.role,
      content: item.content,
    }));

    setChatMessages((current) => [...current, { role: "user", content: message }]);
    setChatInput("");
    setChatError("");
    setIsChatLoading(true);

    try {
      const response = await fetch(`${AI_BACKEND_BASE_URL}/api/mom/chat-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicationId: caseItem.dbId,
          userMessage: message,
          chatHistory: historyForApi,
          minutesDraft: form,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to get AI assistant response.");
      }

      const assistantMessage =
        typeof payload.assistantMessage === "string"
          ? payload.assistantMessage.trim()
          : "";

      if (!assistantMessage) {
        throw new Error("Assistant returned an empty response. Try again.");
      }

      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error) {
      setChatError(error?.message || "AI assistant is temporarily unavailable.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#111f3b]">
            Edit Minutes
          </h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Formal Minutes of Meeting Template for {caseItem.id}
          </p>
        </div>
        <button
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(380px,1fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <TemplateInput label="Meeting Title" onChange={onFieldChange("meetingTitle")} value={form.meetingTitle} />
            <TemplateInput label="Meeting Type" onChange={onFieldChange("meetingType")} value={form.meetingType} />
            <TemplateInput label="Date" onChange={onFieldChange("date")} type="date" value={form.date} />
            <TemplateInput label="Time" onChange={onFieldChange("time")} type="time" value={form.time} />
            <TemplateInput label="Location" onChange={onFieldChange("location")} value={form.location} />
            <TemplateInput label="Chairperson" onChange={onFieldChange("chairperson")} value={form.chairperson} />
            <TemplateInput label="Minute Taker" onChange={onFieldChange("minuteTaker")} value={form.minuteTaker} />
          </div>

          <div className="mt-4 grid gap-3">
            <TemplateTextArea label="Participants" onChange={onFieldChange("participants")} value={form.participants} />
            <TemplateTextArea label="Agenda Items" onChange={onFieldChange("agendaItems")} value={form.agendaItems} />
            <TemplateTextArea
              label="Summary of Discussion"
              onChange={onFieldChange("discussionSummary")}
              value={form.discussionSummary}
            />
            <TemplateTextArea
              label="Decisions Taken"
              onChange={onFieldChange("decisionsTaken")}
              value={form.decisionsTaken}
            />
            <TemplateTextArea label="Action Items" onChange={onFieldChange("actionItems")} value={form.actionItems} />
            <TemplateTextArea label="Risks / Concerns Raised" onChange={onFieldChange("risks")} value={form.risks} />
            <TemplateTextArea label="Next Steps" onChange={onFieldChange("nextSteps")} value={form.nextSteps} />
            <TemplateInput
              label="Next Meeting Schedule"
              onChange={onFieldChange("nextMeetingSchedule")}
              value={form.nextMeetingSchedule}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onSaveDraft(caseItem.id, form)}
              type="button"
            >
              Save Draft
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2.5 text-[20px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => onFinalize(caseItem.id, form)}
              type="button"
            >
              Finalize Minutes
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24 xl:min-h-[68vh]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-[28px] font-semibold tracking-tight text-[#111f3b]">
                AI Assistant
              </h2>
              <p className="text-[18px] text-[#5a6f8d]">
                Ask for help drafting or refining meeting minutes.
              </p>
            </div>
          </div>

          <div className="mt-4 h-[360px] min-h-[320px] max-h-[72vh] resize-y space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-[#f9fbfa] p-4 sm:h-[420px] xl:h-[48vh]">
            {chatMessages.length === 0 ? (
              <p className="text-[18px] text-[#5a6f8d]">
                Start by asking the assistant to summarize agenda points, improve wording,
                or draft decisions from your meeting context.
              </p>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  className={`max-w-[92%] rounded-xl px-4 py-2 text-[18px] ${
                    message.role === "user"
                      ? "ml-auto bg-[#124734] text-white"
                      : "mr-auto border border-slate-200 bg-white text-[#1f3048]"
                  }`}
                  key={`${message.role}-${index}`}
                >
                  {message.content}
                </div>
              ))
            )}

            {isChatLoading ? (
              <div className="mr-auto inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-[18px] text-[#5a6f8d]">
                AI is thinking...
              </div>
            ) : null}
          </div>

          {chatError ? (
            <p className="mt-3 text-[17px] font-semibold text-rose-600">{chatError}</p>
          ) : null}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[18px] text-[#1f3048] outline-none placeholder:text-slate-400 focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Ask AI to help draft minutes..."
              value={chatInput}
            />
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#124734] px-4 text-[18px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isChatLoading || !chatInput.trim()}
              onClick={sendChatMessage}
              type="button"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function MomStatCard({ label, value, icon, tone }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </span>
        <span className="text-[22px] font-semibold text-emerald-600">+6%</span>
      </div>
      <p className="mt-3 text-[29px] text-[#5b6d87]">{label}</p>
      <p className="text-5xl font-semibold tracking-tight text-[#111827]">{value}</p>
    </article>
  );
}

function TemplateInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[18px] font-semibold text-[#536a87]">{label}</span>
      <input
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
        onChange={onChange}
        type={type}
        value={value}
      />
    </label>
  );
}

function TemplateTextArea({ label, value, onChange }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[18px] font-semibold text-[#536a87]">{label}</span>
      <textarea
        className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
        onChange={onChange}
        value={value}
      />
    </label>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Referred: "bg-amber-100 text-amber-700",
    "Meeting Scheduled": "bg-blue-100 text-blue-700",
    "Pending MoM": "bg-violet-100 text-violet-700",
    Finalized: "bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-[16px] font-semibold ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {status}
    </span>
  );
}

function parseMomView(pathname) {
  const normalized = pathname.replace(/\/+$/, "");
  const gistMatch = normalized.match(/^\/mom-dashboard\/gist\/([^/]+)$/);
  if (gistMatch) {
    return { type: "gist-editor", gistId: decodeURIComponent(gistMatch[1]) };
  }
  const editorMatch = normalized.match(/^\/mom-dashboard\/editor\/([^/]+)$/);
  if (editorMatch) {
    return { type: "editor", editorId: decodeURIComponent(editorMatch[1]) };
  }
  if (normalized === "/mom-dashboard/referred-cases") {
    return { type: "referred-cases" };
  }
  if (normalized === "/mom-dashboard/meeting-scheduled") {
    return { type: "meeting-scheduled" };
  }
  if (normalized === "/mom-dashboard/pending-mom") {
    return { type: "pending-mom" };
  }
  if (normalized === "/mom-dashboard/finalized") {
    return { type: "finalized" };
  }
  return { type: "dashboard" };
}

function buildTemplateState(caseItem) {
  if (!caseItem) {
    return {
      meetingTitle: "",
      meetingType: "",
      date: "",
      time: "",
      location: "",
      chairperson: "",
      minuteTaker: "",
      participants: "",
      agendaItems: "",
      discussionSummary: "",
      decisionsTaken: "",
      actionItems: "",
      risks: "",
      nextSteps: "",
      nextMeetingSchedule: "",
    };
  }

  const base = caseItem.minutes ?? {};
  return {
    meetingTitle: base.meetingTitle ?? caseItem.meetingTitle,
    meetingType: base.meetingType ?? "Committee Review",
    date: base.date ?? "",
    time: base.time ?? "",
    location: base.location ?? "",
    chairperson: base.chairperson ?? "",
    minuteTaker: base.minuteTaker ?? caseItem.assignee,
    participants: base.participants ?? "",
    agendaItems: base.agendaItems ?? caseItem.gist,
    discussionSummary: base.discussionSummary ?? caseItem.gist,
    decisionsTaken: base.decisionsTaken ?? "",
    actionItems: base.actionItems ?? "",
    risks: base.risks ?? "",
    nextSteps: base.nextSteps ?? "",
    nextMeetingSchedule: base.nextMeetingSchedule ?? "",
  };
}

function mapApplicationToMomCase(application, gistRow, assigneeName) {
  const normalizedStatus = normalizeMomStatus(application?.status);
  const gistJson = asObject(gistRow?.gist_json);
  const minutes = asObject(gistJson?.minutes);

  return {
    dbId: application?.id || "",
    id: application?.application_code || application?.id || "N/A",
    meetingTitle:
      normalizeText(gistJson?.meeting_title) ||
      normalizeText(gistJson?.meetingTitle) ||
      normalizeText(application?.project_name) ||
      "Untitled Meeting",
    department: normalizeText(application?.sector_category) || "General",
    date: toDisplayDate(application?.submitted_at || application?.created_at),
    status: toMomStatusLabel(normalizedStatus),
    dbStatus: normalizedStatus,
    assignee: assigneeName,
    gist: buildGistText(gistRow, gistJson, application),
    gistJson,
    provider: normalizeText(gistRow?.provider) || "",
    modelName: normalizeText(gistRow?.model_name) || "",
    minutes,
  };
}

function buildGistText(gistRow, gistJson, application) {
  const directText = normalizeText(gistRow?.gist_text);
  if (directText) return directText;

  const fallbackSummary =
    normalizeText(gistJson?.discussion_summary) ||
    normalizeText(gistJson?.summary) ||
    normalizeText(gistJson?.agenda_summary);

  if (fallbackSummary) return fallbackSummary;

  const projectName = normalizeText(application?.project_name) || "the referred case";
  return `AI gist is not yet available for ${projectName}.`;
}

function toDisplayDate(dateValue) {
  if (!dateValue) return "Not Available";
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return "Not Available";
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeMomStatus(statusValue) {
  const value = String(statusValue ?? "")
    .trim()
    .toLowerCase();

  if (value === "meeting_scheduled") return "meeting_scheduled";
  if (value === "minutes_draft") return "minutes_draft";
  if (value === "finalized") return "finalized";
  if (value === "referred" || value === "mom_generated") return value;
  return "referred";
}

function isMomRelevantStatus(statusValue) {
  const value = String(statusValue ?? "")
    .trim()
    .toLowerCase();

  return (
    value === "referred" ||
    value === "mom_generated" ||
    value === "meeting_scheduled" ||
    value === "minutes_draft" ||
    value === "finalized"
  );
}

function toMomStatusLabel(status) {
  if (status === "meeting_scheduled") return "Meeting Scheduled";
  if (status === "minutes_draft") return "Pending MoM";
  if (status === "finalized") return "Finalized";
  return "Referred";
}

function normalizeText(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function formatRoleLabel(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "scrutiny_team" || normalized === "scrutiny") return "Scrutiny Team";
  if (normalized === "mom_team" || normalized === "mom") return "MoM Team";
  return "Proponent";
}

export default MoMDashboard;
