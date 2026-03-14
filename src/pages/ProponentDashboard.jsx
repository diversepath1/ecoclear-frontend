import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

const APPLICATION_DOCUMENT_BUCKET = "application-documents";

const STATUS_LABELS = {
  draft: "Draft",
  submitted: "Submitted",
  under_scrutiny: "Under Scrutiny",
  under_review: "Under Review",
  deficiency: "Deficiency",
  deficiency_raised: "Deficiency",
  referred: "Referred",
  mom_generated: "MoM Generated",
  finalized: "Finalized",
  meeting_scheduled: "Meeting Scheduled",
  minutes_draft: "Minutes Draft",
};

function ProponentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState("");
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [deficiencyCaseId, setDeficiencyCaseId] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [creationMessage, setCreationMessage] = useState("");
  const [form, setForm] = useState({
    projectName: "",
    category: "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [allowMultipleFiles, setAllowMultipleFiles] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [sectorCategories, setSectorCategories] = useState([]);
  const [sectorsLoading, setSectorsLoading] = useState(true);
  const [sectorsError, setSectorsError] = useState("");
  const fileInputRef = useRef(null);
  const draftEditorInitRef = useRef(false);

  const dashboardNavItems = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { key: "new-app", label: "New App", icon: <PlusCircleIcon /> },
    { key: "my-apps", label: "My Apps", icon: <DocumentIcon /> },
    { key: "payments", label: "Payments", icon: <PaymentsIcon /> },
    { key: "tracking", label: "Tracking", icon: <PinIcon /> },
  ];

  const dashboardStats = useMemo(() => {
    const count = (status) => applications.filter((item) => item.status === status).length;
    return [
      { label: "Draft", value: formatCount(count("Draft")), tone: "neutral", tag: "Active" },
      { label: "Submitted", value: formatCount(count("Submitted")), tone: "blue", tag: "Pending" },
      {
        label: "Under Review",
        value: formatCount(count("Under Review")),
        tone: "amber",
        tag: "Reviewing",
      },
      { label: "Deficiency", value: formatCount(count("Deficiency")), tone: "red", tag: "Critical" },
      { label: "Finalized", value: formatCount(count("Finalized")), tone: "green", tag: "Success" },
    ];
  }, [applications]);

  const trendBars = [
    { label: "Mar", height: "40%" },
    { label: "Apr", height: "65%" },
    { label: "May", height: "35%" },
    { label: "Jun", height: "80%" },
    { label: "Jul", height: "55%" },
    { label: "Aug", height: "95%" },
    { label: "Sep", height: "50%" },
    { label: "Oct", height: "75%" },
  ];

  const recentApplications = applications.slice(0, 5);
  const deficiencyCase = useMemo(
    () => applications.find((application) => application.dbId === deficiencyCaseId) ?? null,
    [applications, deficiencyCaseId],
  );
  const workflowApplicationId = useMemo(
    () => new URLSearchParams(location.search).get("workflow"),
    [location.search],
  );
  const draftEditQueryId = useMemo(
    () => new URLSearchParams(location.search).get("editDraft"),
    [location.search],
  );
  const workflowApplication = useMemo(
    () =>
      applications.find((application) => application.id === workflowApplicationId) ?? null,
    [applications, workflowApplicationId],
  );
  const editingDraft = useMemo(
    () => applications.find((application) => application.dbId === editingDraftId) ?? null,
    [applications, editingDraftId],
  );

  const selectView = (view) => {
    setActiveView(view);
    if (view !== "my-apps") setCreationMessage("");
    if (view !== "new-app") {
      setDeficiencyCaseId(null);
      setEditingDraftId(null);
    }
  };

  const openWorkflowWindow = (applicationId) => {
    window.open(
      `/proponent-dashboard?workflow=${encodeURIComponent(applicationId)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const openDeficiencyResolution = (application) => {
    if (!application?.dbId) return;

    setDeficiencyCaseId(application.dbId);
    setEditingDraftId(null);
    setForm({
      projectName: application.name || "",
      category: application.category || "",
    });
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormErrors({});
    setCreationMessage("");
    setActiveView("new-app");
  };

  const openDraftEditorWindow = (application) => {
    if (!application?.dbId) return;

    window.open(
      `/proponent-dashboard?editDraft=${encodeURIComponent(application.dbId)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleFormChange = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleCreateApplication = async (event) => {
    event.preventDefault();
    await createApplication("submitted");
  };

  const handleSaveDraft = async () => {
    await createApplication("draft");
  };

  const handleFileSelection = (event) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    const files = allowMultipleFiles ? incomingFiles : incomingFiles.slice(0, 1);
    setSelectedFiles(files);
    setFormErrors((current) => ({ ...current, documents: "" }));
  };

  const handleAllowMultipleToggle = (event) => {
    const enabled = event.target.checked;
    setAllowMultipleFiles(enabled);
    if (!enabled && selectedFiles.length > 1) {
      setSelectedFiles((current) => current.slice(0, 1));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const mapDbApplicationToViewModel = (row) => {
    const status = mapStatusLabel(row?.status);
    const submittedAt = row?.submitted_at ? new Date(row.submitted_at) : null;
    const createdAt = row?.created_at ? new Date(row.created_at) : null;

    return {
      dbId: row?.id || null,
      dbStatus: row?.status || null,
      id: row?.application_code || row?.id || "N/A",
      name: row?.project_name || "Untitled Application",
      category: row?.sector_category || "Not Selected",
      allowMultipleFiles: row?.allow_multiple_files ?? true,
      documentCount: Number(row?.document_count ?? 0),
      status,
      date:
        status === "Draft"
          ? "Not Submitted"
          : toDisplayDate(submittedAt || createdAt || new Date()),
      deficiencyMessage: row?.deficiency_message || "",
    };
  };

  const loadApplications = async () => {
    if (!user?.id) {
      setApplications([]);
      setApplicationsLoading(false);
      setApplicationsError("");
      return;
    }

    setApplicationsLoading(true);
    setApplicationsError("");

    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, application_code, project_name, sector_category, status, submitted_at, created_at, deficiency_message, allow_multiple_files, document_count",
      )
      .eq("proponent_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setApplications([]);
      setApplicationsError(error.message || "Failed to load applications.");
      setApplicationsLoading(false);
      return;
    }

    setApplications((data ?? []).map(mapDbApplicationToViewModel));
    setApplicationsLoading(false);
  };

  const uploadApplicationDocuments = async (applicationId, files) => {
    if (!files?.length) return;

    const metadataRows = [];

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${applicationId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(APPLICATION_DOCUMENT_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/pdf",
        });

      if (uploadError) throw new Error(uploadError.message || "File upload failed.");

      metadataRows.push({
        application_id: applicationId,
        file_name: file.name,
        storage_path: filePath,
        mime_type: file.type || "application/pdf",
        file_size: Number(file.size) || 0,
      });
    }

    const { error: documentsError } = await supabase
      .from("application_documents")
      .insert(metadataRows);

    if (documentsError) {
      throw new Error(documentsError.message || "Failed to store document metadata.");
    }
  };

  const createApplication = async (status) => {
    const nextErrors = {};
    const isDeficiencyResubmission = Boolean(deficiencyCaseId);
    const isDraftEditFlow = Boolean(editingDraftId) && !isDeficiencyResubmission;
    const existingDocumentCount = editingDraft?.documentCount ?? 0;

    if (!isDeficiencyResubmission && status === "submitted") {
      if (!form.projectName.trim()) nextErrors.projectName = "Project name is required.";
      if (!form.category.trim()) nextErrors.category = "Category is required.";
    }

    if (status === "submitted" || isDeficiencyResubmission) {
      const requiresNewFiles = !(isDraftEditFlow && existingDocumentCount > 0);
      if (selectedFiles.length === 0 && requiresNewFiles) {
        nextErrors.documents = "At least one PDF file is required.";
      } else if (!selectedFiles.every((file) => isPdfFile(file))) {
        nextErrors.documents = "Only PDF files are allowed.";
      }
    } else if (!selectedFiles.every((file) => isPdfFile(file))) {
      nextErrors.documents = "Only PDF files are allowed.";
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!user?.id) {
      setFormErrors({ submit: "You must be logged in to create applications." });
      return;
    }

    setIsSubmittingApplication(true);
    setFormErrors((current) => ({ ...current, submit: "" }));

    if (isDeficiencyResubmission) {
      try {
        await uploadApplicationDocuments(deficiencyCaseId, selectedFiles);

        const { error: resubmitError } = await supabase
          .from("applications")
          .update({
            status: "submitted",
            deficiency_message: null,
            submitted_at: new Date().toISOString(),
          })
          .eq("id", deficiencyCaseId);

        if (resubmitError) {
          throw new Error(resubmitError.message || "Failed to resubmit deficiency application.");
        }

        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFormErrors({});
        setCreationMessage("Deficiency response submitted. New documents were uploaded successfully.");
        setDeficiencyCaseId(null);
        await loadApplications();
        setActiveView("my-apps");
      } catch (error) {
        setFormErrors((current) => ({
          ...current,
          submit: error?.message || "Failed to upload deficiency documents.",
        }));
      } finally {
        setIsSubmittingApplication(false);
      }
      return;
    }

    if (isDraftEditFlow) {
      const updatedStatus = status === "submitted" ? "submitted" : "draft";
      const nextDocumentCount =
        selectedFiles.length > 0
          ? existingDocumentCount + selectedFiles.length
          : existingDocumentCount;

      const updatePayload = {
        project_name:
          status === "draft" ? form.projectName.trim() || "Untitled Draft" : form.projectName.trim(),
        sector_category:
          status === "draft" ? form.category.trim() || "Not Selected" : form.category.trim(),
        status: updatedStatus,
        allow_multiple_files: allowMultipleFiles,
        document_count: nextDocumentCount,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from("applications")
        .update(updatePayload)
        .eq("id", editingDraftId)
        .eq("proponent_id", user.id);

      if (updateError) {
        setIsSubmittingApplication(false);
        setFormErrors((current) => ({
          ...current,
          submit: updateError?.message || "Failed to update draft.",
        }));
        return;
      }

      try {
        if (selectedFiles.length > 0) {
          await uploadApplicationDocuments(editingDraftId, selectedFiles);
        }

        setForm({ projectName: "", category: "" });
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setFormErrors({});
        setEditingDraftId(null);

        setCreationMessage(
          status === "draft"
            ? "Draft updated successfully. You can keep editing or submit later."
            : "Draft submitted successfully and moved for review.",
        );

        await loadApplications();
        setActiveView("my-apps");
      } catch (error) {
        setFormErrors((current) => ({
          ...current,
          submit:
            error?.message ||
            "Draft was updated, but document upload failed. Please contact admin.",
        }));
      } finally {
        setIsSubmittingApplication(false);
      }
      return;
    }

    const payload = {
      proponent_id: user.id,
      project_name:
        status === "draft" ? form.projectName.trim() || "Untitled Draft" : form.projectName.trim(),
      sector_category:
        status === "draft" ? form.category.trim() || "Not Selected" : form.category.trim(),
      status,
      allow_multiple_files: allowMultipleFiles,
      document_count: selectedFiles.length,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    };

    const { data: createdApplication, error: createError } = await supabase
      .from("applications")
      .insert(payload)
      .select("id")
      .single();

    if (createError || !createdApplication?.id) {
      setIsSubmittingApplication(false);
      setFormErrors((current) => ({
        ...current,
        submit: createError?.message || "Failed to create application.",
      }));
      return;
    }

    try {
      await uploadApplicationDocuments(createdApplication.id, selectedFiles);

      setForm({ projectName: "", category: "" });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFormErrors({});

      setCreationMessage(
        status === "draft"
          ? "Draft saved to database. You can resume and submit this application later."
          : "Application created and stored in database successfully.",
      );

      await loadApplications();
      setActiveView("my-apps");
    } catch (error) {
      setFormErrors((current) => ({
        ...current,
        submit:
          error?.message ||
          "Application was created, but document upload failed. Please contact admin.",
      }));
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const loadSectorCategories = async () => {
    setSectorsLoading(true);
    setSectorsError("");

    const { data, error } = await supabase
      .from("sectors")
      .select("name")
      .order("name", { ascending: true });

    if (error) {
      setSectorsError(error.message || "Failed to load sector categories.");
      setSectorCategories([]);
      setSectorsLoading(false);
      return;
    }

    const categoryNames = (data ?? [])
      .map((item) => item.name)
      .filter((name) => typeof name === "string" && name.trim().length > 0);

    setSectorCategories(categoryNames);
    setSectorsLoading(false);
  };

  useEffect(() => {
    loadSectorCategories();
  }, []);

  useEffect(() => {
    loadApplications();
  }, [user?.id]);

  useEffect(() => {
    if (!draftEditQueryId) {
      draftEditorInitRef.current = false;
      return;
    }

    if (applicationsLoading || draftEditorInitRef.current) return;

    const draftApplication =
      applications.find((application) => application.dbId === draftEditQueryId) ?? null;
    draftEditorInitRef.current = true;

    if (!draftApplication) {
      setCreationMessage("Draft not found for editing.");
      navigate("/proponent-dashboard", { replace: true });
      return;
    }

    setDeficiencyCaseId(null);
    setEditingDraftId(draftApplication.dbId);
    setForm({
      projectName: draftApplication.name || "",
      category: draftApplication.category || "",
    });
    setAllowMultipleFiles(Boolean(draftApplication.allowMultipleFiles ?? true));
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFormErrors({});
    setCreationMessage("");
    setActiveView("new-app");
    navigate("/proponent-dashboard", { replace: true });
  }, [applications, applicationsLoading, draftEditQueryId, navigate]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="dashboard-root">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <a className="dashboard-brand" href="/" aria-label="EcoClear home">
            <span className="dashboard-brand-mark">
              <LeafMark />
            </span>
            <span>EcoClear</span>
          </a>

          <nav className="dashboard-nav" aria-label="Sidebar">
            {dashboardNavItems.map((item) => (
              <button
                className={`dashboard-nav-item${activeView === item.key ? " is-active" : ""}`}
                key={item.key}
                onClick={() => selectView(item.key)}
                type="button"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="dashboard-profile">
            <div className="dashboard-avatar" aria-hidden="true">
              <span />
            </div>
            <div>
              <strong>Alex Rivera</strong>
              <span>Proponent Admin</span>
            </div>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <a className="dashboard-mobile-brand" href="/">
              <span className="dashboard-brand-mark">
                <LeafMark />
              </span>
              <span>EcoClear</span>
            </a>

            <label className="dashboard-search" aria-label="Search">
              <SearchIcon />
              <input placeholder="Search applications, invoices..." type="text" />
            </label>

            <div className="dashboard-toolbar">
              <button className="dashboard-icon-button" type="button">
                <BellIcon />
                <i />
              </button>
              <button className="dashboard-icon-button" type="button">
                <SettingsIcon />
              </button>
              <span className="dashboard-divider" />
              <button
                className="dashboard-primary-button"
                onClick={() => selectView("new-app")}
                type="button"
              >
                <PlusIcon />
                <span>New Application</span>
              </button>
              <button className="dashboard-ghost-button" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          </header>

          <div className="dashboard-content">
            {workflowApplicationId ? (
              <WorkflowStagesView
                application={workflowApplication}
                onClose={() => navigate("/proponent-dashboard")}
              />
            ) : null}

            {!workflowApplicationId && activeView === "dashboard" ? (
              <>
                <section className="dashboard-heading">
                  <div>
                    <h1>Dashboard</h1>
                    <p>Welcome back. Monitoring your environmental compliance status.</p>
                  </div>
                  <span>Last updated: Oct 24, 2023 at 09:42 AM</span>
                </section>

                <section className="dashboard-stats" aria-label="Application stats">
                  {dashboardStats.map((stat) => (
                    <article className="stat-tile" key={stat.label}>
                      <p>{stat.label}</p>
                      <div className="stat-tile-row">
                        <strong className={stat.tone === "red" ? "is-alert" : ""}>
                          {stat.value}
                        </strong>
                        <span className={`status-chip is-${stat.tone}`}>{stat.tag}</span>
                      </div>
                    </article>
                  ))}
                </section>

                <section className="dashboard-panel">
                  <div className="dashboard-panel-header">
                    <h2>Recent Applications</h2>
                    <div className="dashboard-panel-actions">
                      <button className="dashboard-ghost-button" type="button">
                        <FilterIcon />
                        <span>Filter</span>
                      </button>
                      <button className="dashboard-ghost-button" type="button">
                        <span>Export</span>
                      </button>
                    </div>
                  </div>

                  {applicationsError ? (
                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-4">
                      <p className="text-sm font-medium text-rose-600">{applicationsError}</p>
                      <button className="dashboard-ghost-button" onClick={loadApplications} type="button">
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {applicationsLoading ? (
                    <div className="px-6 py-6 text-sm font-medium text-[#5d6f89]">
                      Loading applications from database...
                    </div>
                  ) : (
                    <ApplicationsTable
                      applications={recentApplications}
                      onOpenDraft={openDraftEditorWindow}
                    />
                  )}

                  <div className="dashboard-panel-footer">
                    <p>Showing {Math.min(5, applications.length)} of {applications.length} applications</p>
                    <div className="pager">
                      <button type="button" disabled>
                        Previous
                      </button>
                      <button type="button">Next</button>
                    </div>
                  </div>
                </section>

                <section className="dashboard-secondary-grid">
                  <article className="dashboard-panel chart-panel">
                    <h2>Application Trends</h2>
                    <div className="trend-chart" aria-hidden="true">
                      {trendBars.map((bar, index) => (
                        <div className="trend-column" key={bar.label}>
                          <span
                            className={`trend-bar trend-bar-${index + 1}`}
                            style={{ height: bar.height }}
                          />
                          <small>{bar.label}</small>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="score-card">
                    <div className="score-card-content">
                      <h2>Environmental Compliance Score</h2>
                      <p>
                        Your organization is currently performing better than 84% of similar
                        proponents.
                      </p>
                      <strong>94%</strong>
                      <div className="score-meter" aria-hidden="true">
                        <span />
                      </div>
                      <small>
                        <InfoIcon />
                        Based on your finalized submissions
                      </small>
                    </div>
                  </article>
                </section>
              </>
            ) : null}

            {!workflowApplicationId && activeView === "new-app" ? (
              <section className="space-y-6">
                <section className="dashboard-heading">
                  <div>
                    <h1>
                      {deficiencyCase
                        ? "Resolve Deficiency"
                        : editingDraftId
                          ? "Edit Draft Application"
                          : "New Application"}
                    </h1>
                    <p>
                      {deficiencyCase
                        ? "Upload corrected documents for the flagged application."
                        : editingDraftId
                          ? "Continue editing your saved draft and submit when ready."
                          : "Create an environmental clearance application for review."}
                    </p>
                  </div>
                </section>

                <article className="dashboard-panel overflow-visible">
                  <div className="dashboard-panel-header">
                    <h2>Application Details</h2>
                  </div>

                  <form className="space-y-5 p-6 sm:p-8" onSubmit={handleCreateApplication}>
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold uppercase tracking-[0.12em] text-[#4f6180]">
                        Project Name
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-[#1f2c40] outline-none transition focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/15"
                        disabled={Boolean(deficiencyCase)}
                        onChange={handleFormChange("projectName")}
                        placeholder="Enter project name"
                        type="text"
                        value={form.projectName}
                      />
                      {deficiencyCase ? (
                        <p className="text-sm font-medium text-[#5d6f89]">
                          Project name is locked for deficiency resubmission.
                        </p>
                      ) : null}
                      {formErrors.projectName ? (
                        <p className="text-sm font-medium text-rose-600">{formErrors.projectName}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold uppercase tracking-[0.12em] text-[#4f6180]">
                        Category
                      </label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-[#1f2c40] outline-none transition focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/15"
                        disabled={sectorsLoading || Boolean(deficiencyCase)}
                        onChange={handleFormChange("category")}
                        value={form.category}
                      >
                        <option value="">
                          {sectorsLoading
                            ? "Loading sector categories..."
                            : "Select sector category"}
                        </option>
                        {sectorCategories.map((sectorName) => (
                          <option key={sectorName} value={sectorName}>
                            {sectorName}
                          </option>
                        ))}
                      </select>
                      {!sectorsLoading && sectorsError ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-medium text-rose-600">{sectorsError}</p>
                          <button
                            className="dashboard-ghost-button"
                            onClick={loadSectorCategories}
                            type="button"
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}
                      {!sectorsLoading &&
                      !sectorsError &&
                      sectorCategories.length === 0 ? (
                        <p className="text-sm font-medium text-amber-700">
                          No sectors found in database. Please ask admin to add sectors.
                        </p>
                      ) : null}
                      {deficiencyCase ? (
                        <p className="text-sm font-medium text-[#5d6f89]">
                          Category is locked for deficiency resubmission.
                        </p>
                      ) : null}
                      {formErrors.category ? (
                        <p className="text-sm font-medium text-rose-600">{formErrors.category}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold uppercase tracking-[0.12em] text-[#4f6180]">
                        Upload Documents (PDF)
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-[#4f6180]">
                        <input
                          checked={allowMultipleFiles}
                          onChange={handleAllowMultipleToggle}
                          type="checkbox"
                        />
                        Allow multiple PDF files
                      </label>
                      <input
                        ref={fileInputRef}
                        accept=".pdf,application/pdf"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-[#1f2c40] outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-[#124734] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#0f3a2b] focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/15"
                        multiple={allowMultipleFiles}
                        onChange={handleFileSelection}
                        type="file"
                      />
                      {selectedFiles.length > 0 ? (
                        <p className="text-sm text-[#4f6180]">
                          {selectedFiles.length} file(s) selected:{" "}
                          {selectedFiles.map((file) => file.name).join(", ")}
                        </p>
                      ) : null}
                      {formErrors.documents ? (
                        <p className="text-sm font-medium text-rose-600">{formErrors.documents}</p>
                      ) : null}
                    </div>

                    {formErrors.submit ? (
                      <p className="text-sm font-medium text-rose-600">{formErrors.submit}</p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3">
                      {!deficiencyCase ? (
                        <button
                          className="dashboard-ghost-button"
                          disabled={isSubmittingApplication}
                          onClick={handleSaveDraft}
                          type="button"
                        >
                          {isSubmittingApplication
                            ? "Saving..."
                            : editingDraftId
                              ? "Update Draft"
                              : "Save as Draft"}
                        </button>
                      ) : null}
                      <button
                        className="dashboard-primary-button"
                        disabled={isSubmittingApplication}
                        type="submit"
                      >
                        <PlusIcon />
                        <span>
                          {isSubmittingApplication
                            ? "Saving..."
                            : deficiencyCase
                              ? "Upload Documents & Resubmit"
                              : editingDraftId
                                ? "Update Application & Pay"
                                : "Create Application & Pay"}
                        </span>
                      </button>
                      <button
                        className="dashboard-ghost-button"
                        disabled={isSubmittingApplication}
                        onClick={() => selectView("dashboard")}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </article>
              </section>
            ) : null}

            {!workflowApplicationId && activeView === "my-apps" ? (
              <section className="space-y-6">
                <section className="dashboard-heading">
                  <div>
                    <h1>My Applications</h1>
                    <p>Track every submitted project and current review status.</p>
                  </div>
                </section>

                {creationMessage ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {creationMessage}
                  </div>
                ) : null}

                <article className="dashboard-panel">
                  <div className="dashboard-panel-header">
                    <h2>Applications List</h2>
                  </div>

                  {applicationsError ? (
                    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-6 py-4">
                      <p className="text-sm font-medium text-rose-600">{applicationsError}</p>
                      <button className="dashboard-ghost-button" onClick={loadApplications} type="button">
                        Retry
                      </button>
                    </div>
                  ) : null}

                  {applicationsLoading ? (
                    <div className="px-6 py-6 text-sm font-medium text-[#5d6f89]">
                      Loading applications from database...
                    </div>
                  ) : (
                    <ApplicationsTable
                      applications={applications}
                      enableWorkflowLinks
                      onOpenDraft={openDraftEditorWindow}
                      onOpenDeficiency={openDeficiencyResolution}
                      onOpenWorkflow={openWorkflowWindow}
                    />
                  )}

                  <div className="dashboard-panel-footer">
                    <p>Applications are fetched from database.</p>
                    <p>Total: {applications.length}</p>
                  </div>
                </article>
              </section>
            ) : null}

            {!workflowApplicationId &&
            (activeView === "payments" || activeView === "tracking") ? (
              <section className="space-y-6">
                <section className="dashboard-heading">
                  <div>
                    <h1>{activeView === "payments" ? "Payments" : "Tracking"}</h1>
                    <p>This section is reserved and can be connected to backend workflows next.</p>
                  </div>
                </section>

                <article className="dashboard-panel">
                  <div className="p-6 text-base text-[#5d6f89]">
                    Feature placeholder. Use sidebar to continue with New App or My Apps.
                  </div>
                </article>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function ApplicationsTable({
  applications,
  enableWorkflowLinks = false,
  onOpenDraft,
  onOpenDeficiency,
  onOpenWorkflow,
}) {
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Application ID</th>
            <th>Project Name</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date Submitted</th>
            <th className="align-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {applications.length === 0 ? (
            <tr>
              <td className="px-6 py-8 text-center text-sm font-medium text-[#5d6f89]" colSpan={6}>
                No applications found.
              </td>
            </tr>
          ) : (
            applications.map((application) => (
              <tr key={application.id}>
                <td className="app-id">{application.id}</td>
                <td className="app-name">
                  {enableWorkflowLinks ? (
                    <button
                      className="cursor-pointer border-0 bg-transparent p-0 text-left text-[inherit] font-[inherit] text-[#0f3f2f] underline-offset-4 hover:underline"
                      onClick={() => onOpenWorkflow?.(application.id)}
                      type="button"
                    >
                      {application.name}
                    </button>
                  ) : (
                    application.name
                  )}
                </td>
                <td className="app-category">{application.category}</td>
                <td>
                  <span className={`status-chip is-${slugify(application.status)}`}>
                    {application.status}
                  </span>
                </td>
                <td className="app-category">{application.date}</td>
                <td className="align-right">
                  {application.status === "Finalized" ? (
                    <details className="relative inline-block text-left">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#124734] hover:bg-[#f2f8f4]">
                        Download
                      </summary>
                      <div className="absolute right-0 z-10 mt-2 min-w-[190px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#1f3048] hover:bg-slate-50"
                          onClick={() => exportApplicationRecord(application, "word")}
                          type="button"
                        >
                          Export as Word
                        </button>
                        <button
                          className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#1f3048] hover:bg-slate-50"
                          onClick={() => exportApplicationRecord(application, "pdf")}
                          type="button"
                        >
                          Export as PDF
                        </button>
                      </div>
                    </details>
                  ) : null}

                  {application.status === "Deficiency" ? (
                    onOpenDeficiency ? (
                      <button
                        className="inline-block max-w-[320px] rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-semibold text-rose-700 underline decoration-rose-400 underline-offset-2 hover:bg-rose-100"
                        onClick={() => onOpenDeficiency(application)}
                        title="Resolve deficiency by uploading revised documents"
                        type="button"
                      >
                        {application.deficiencyMessage || "Deficiency raised by scrutiny team."}
                      </button>
                    ) : (
                      <span
                        className="inline-block max-w-[320px] rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-700"
                        title={application.deficiencyMessage || "Deficiency raised by scrutiny team."}
                      >
                        {application.deficiencyMessage || "Deficiency raised by scrutiny team."}
                      </span>
                    )
                  ) : null}

                  {application.status === "Draft" ? (
                    onOpenDraft ? (
                      <button
                        className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                        onClick={() => onOpenDraft(application)}
                        title="Open draft in New Application"
                        type="button"
                      >
                        Edit Draft
                      </button>
                    ) : null
                  ) : null}

                  {application.status !== "Finalized" &&
                  application.status !== "Deficiency" &&
                  application.status !== "Draft" ? (
                    <button className="table-action" title="More actions" type="button">
                      <MoreIcon />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function WorkflowStagesView({ application, onClose }) {
  const stages = [
    "Draft",
    "Submitted",
    "Under Scrutiny",
    "Deficiency Raised",
    "Referred",
    "MoM Generated",
    "Finalized",
  ];

  if (!application) {
    return (
      <section className="space-y-4">
        <section className="dashboard-heading">
          <div>
            <h1>Workflow Status</h1>
            <p>Application not found. Please go back and try again.</p>
          </div>
        </section>
        <button className="dashboard-ghost-button" onClick={onClose} type="button">
          Back to Dashboard
        </button>
      </section>
    );
  }

  const currentStageIndex = getWorkflowStageIndex(application.status);

  return (
    <section className="space-y-6">
      <section className="dashboard-heading">
        <div>
          <h1>{application.name}</h1>
          <p>
            Workflow stages for application ID {application.id}
          </p>
        </div>
      </section>

      <article className="dashboard-panel overflow-visible p-6 sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-3xl font-semibold text-[#13243d]">Status / Workflow Stages</h2>
          <button className="dashboard-ghost-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[1040px] items-center gap-0">
            {stages.map((stage, index) => {
              const isCompleted = index <= currentStageIndex;
              const isCurrent = index === currentStageIndex;
              return (
                <div className="flex flex-1 items-center" key={stage}>
                  <div className="flex min-w-[130px] flex-col items-center gap-2 px-2 text-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold ${
                        isCompleted
                          ? "border-[#124734] bg-[#124734] text-white"
                          : "border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.08em] ${
                        isCurrent
                          ? "text-[#124734]"
                          : isCompleted
                            ? "text-[#2e4665]"
                            : "text-slate-400"
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                  {index < stages.length - 1 ? (
                    <div
                      className={`h-1 flex-1 rounded ${
                        index < currentStageIndex ? "bg-[#124734]" : "bg-slate-200"
                      }`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </article>
    </section>
  );
}

function formatCount(value) {
  return String(value).padStart(2, "0");
}

function exportApplicationRecord(application, format) {
  const fileName =
    `${application.id}-${format === "word" ? "application.doc" : "application.pdf"}`.replace(
      /\s+/g,
      "_",
    );
  const content = [
    `Application ID: ${application.id}`,
    `Project Name: ${application.name}`,
    `Category: ${application.category}`,
    `Status: ${application.status}`,
    `Date Submitted: ${application.date}`,
  ].join("\n");

  const mimeType = format === "word" ? "application/msword" : "application/pdf";
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function toDisplayDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not Submitted";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPdfFile(file) {
  const name = file?.name?.toLowerCase() ?? "";
  return file?.type === "application/pdf" || name.endsWith(".pdf");
}

function mapStatusLabel(rawStatus) {
  const key = String(rawStatus ?? "")
    .trim()
    .toLowerCase();

  if (!key) return "Draft";
  return STATUS_LABELS[key] || toTitleCaseStatus(key);
}

function toTitleCaseStatus(statusKey) {
  return statusKey
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function getWorkflowStageIndex(status) {
  if (status === "Draft") return 0;
  if (status === "Submitted") return 1;
  if (status === "Under Review") return 2;
  if (status === "Deficiency") return 3;
  if (status === "Referred") return 4;
  if (status === "MoM Generated") return 5;
  if (status === "Finalized") return 6;
  return 0;
}

function LeafMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 14.5C5 8.75 9.36 4.47 15.8 4c-.52 2.8-2.22 5.58-4.92 7.76C8.67 13.56 6.8 14.2 5 14.5Zm4.2 5.3C5.48 18.2 3 14.63 3 10.54c3.71-.14 6.68-1.28 9.22-3.44 2.53-2.17 4.26-4.68 5.31-7.1C20.93 1.3 23 5.05 23 9.3 23 16.32 17.42 22 10.54 22c-.46 0-.91-.07-1.34-.2Z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect height="8" rx="1.5" width="8" x="3" y="3" />
      <rect height="8" rx="1.5" width="8" x="13" y="3" />
      <rect height="8" rx="1.5" width="8" x="3" y="13" />
      <rect height="8" rx="1.5" width="8" x="13" y="13" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7l4 4v13H7Z" />
      <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}

function PaymentsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect height="12" rx="2.2" width="18" x="3" y="6" />
      <path d="M3 10h18M7.5 14.5h3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 16.5h11l-1.2-1.6V10a4.8 4.8 0 1 0-9.6 0v4.9Z" />
      <path d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6M18.2 18.2l-1.6-1.6M7.4 7.4 5.8 5.8" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M7.5 12h9M10.5 17h3" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10.5v4.5M12 7.8h.01" />
    </svg>
  );
}

export default ProponentDashboard;
