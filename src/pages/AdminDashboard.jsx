import {
  Archive,
  Bell,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FilePlus2,
  FileText,
  GripVertical,
  LayoutDashboard,
  LogOut,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserCircle2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "role-assignment", label: "Role Assignment", icon: UserCog },
  { key: "sectors", label: "Sector", icon: SlidersHorizontal },
  { key: "sector-parameters", label: "Sector Parameters", icon: SlidersHorizontal },
  { key: "templates", label: "Templates", icon: FileText },
  { key: "audit-logs", label: "Audit Logs", icon: Archive },
  { key: "notifications", label: "Notifications", icon: Bell, badge: "12" },
  { key: "profile", label: "Profile", icon: UserCircle2 },
];

const stageData = [
  { stage: "Draft", value: 30 },
  { stage: "Review", value: 56 },
  { stage: "Pending", value: 42 },
  { stage: "Approved", value: 72 },
  { stage: "Rejected", value: 18 },
  { stage: "Archived", value: 48 },
];

const initialUsers = [
  {
    username: "mom_user_01",
    name: "Riya Sharma",
    email: "riya.sharma@ecoclear.gov",
    role: "MoM",
  },
  {
    username: "scrutiny_user_07",
    name: "Arjun Verma",
    email: "arjun.verma@ecoclear.gov",
    role: "Scrutiny",
  },
  {
    username: "admin_02",
    name: "Priya Nair",
    email: "priya.nair@ecoclear.gov",
    role: "Admin",
  },
  {
    username: "prop_112",
    name: "Naveen Kapoor",
    email: "naveen.kapoor@ecoclear.gov",
    role: "Proponent",
  },
  {
    username: "mom_user_09",
    name: "Sana Ali",
    email: "sana.ali@ecoclear.gov",
    role: "MoM",
  },
  {
    username: "scrutiny_user_15",
    name: "Karan Joshi",
    email: "karan.joshi@ecoclear.gov",
    role: "Scrutiny",
  },
];

const initialSectors = [
  {
    id: 1,
    name: "Infrastructure Sector",
    parameters: ["Project timeline", "Land acquisition"],
  },
  {
    id: 2,
    name: "Industrial Waste Sector",
    parameters: ["Waste handling protocol", "Emission threshold"],
  },
  {
    id: 3,
    name: "Renewable Energy Sector",
    parameters: ["Site sensitivity score", "Habitat impact assessment"],
  },
];

const fieldTypeOptions = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "single_select", label: "Single select" },
  { value: "multi_line_list", label: "Multi-line list" },
  { value: "table_rows", label: "Table rows" },
  { value: "paragraph_block", label: "Paragraph block" },
];

const initialTemplates = [
  {
    id: "template_001",
    name: "Formal Minutes of Meeting Template",
    description:
      "Template for official environmental clearance meeting documentation",
    type: "MoM",
    status: "active",
    sector: "General",
    createdBy: "Admin",
    updatedAt: "2026-03-13",
    sections: [
      {
        id: "sec_1",
        title: "Meeting Details",
        type: "group",
        repeatable: false,
        fields: [
          { id: "f1", label: "Meeting Title", key: "meeting_title", fieldType: "short_text" },
          { id: "f2", label: "Meeting Type", key: "meeting_type", fieldType: "short_text" },
          { id: "f3", label: "Date", key: "date", fieldType: "date" },
          { id: "f4", label: "Time", key: "time", fieldType: "time" },
          { id: "f5", label: "Location", key: "location", fieldType: "short_text" },
          { id: "f6", label: "Chairperson", key: "chairperson", fieldType: "short_text" },
          { id: "f7", label: "Minute Taker", key: "minute_taker", fieldType: "short_text" },
        ],
      },
      {
        id: "sec_2",
        title: "Participants & Agenda",
        type: "group",
        repeatable: true,
        fields: [
          { id: "f8", label: "Participants", key: "participants", fieldType: "multi_line_list" },
          { id: "f9", label: "Agenda Items", key: "agenda_items", fieldType: "multi_line_list" },
        ],
      },
      {
        id: "sec_3",
        title: "Discussion and Actions",
        type: "group",
        repeatable: false,
        fields: [
          {
            id: "f10",
            label: "Summary of Discussion",
            key: "discussion_summary",
            fieldType: "paragraph_block",
          },
          { id: "f11", label: "Decisions Taken", key: "decisions_taken", fieldType: "multi_line_list" },
          {
            id: "f12",
            label: "Action Items",
            key: "action_items",
            fieldType: "table_rows",
            columns: ["Task Description", "Responsible Person", "Due Date", "Status"],
          },
          { id: "f13", label: "Risks / Concerns Raised", key: "risks", fieldType: "long_text" },
          { id: "f14", label: "Next Steps", key: "next_steps", fieldType: "long_text" },
          {
            id: "f15",
            label: "Next Meeting Schedule",
            key: "next_meeting_schedule",
            fieldType: "short_text",
          },
        ],
      },
    ],
  },
  {
    id: "template_002",
    name: "Sector Review Minutes Template",
    description: "Sector-specific template for MoM and decision documentation",
    type: "MoM",
    status: "draft",
    sector: "Infrastructure Sector",
    createdBy: "Admin",
    updatedAt: "2026-03-12",
    sections: [
      {
        id: "sec_a",
        title: "Meeting Metadata",
        type: "group",
        repeatable: false,
        fields: [
          { id: "fa1", label: "Meeting Title", key: "meeting_title", fieldType: "short_text" },
          { id: "fa2", label: "Date", key: "date", fieldType: "date" },
          { id: "fa3", label: "Location", key: "location", fieldType: "short_text" },
        ],
      },
      {
        id: "sec_b",
        title: "Resolutions",
        type: "group",
        repeatable: true,
        fields: [{ id: "fb1", label: "Decisions Taken", key: "decisions_taken", fieldType: "multi_line_list" }],
      },
    ],
  },
];

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeKey(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

function createNewTemplateDraft(sectors) {
  const defaultSector = sectors[0]?.name ?? "General";
  return {
    id: "",
    name: "New MoM Template",
    description: "Template for meeting minutes generation",
    type: "MoM",
    status: "draft",
    sector: defaultSector,
    createdBy: "Admin",
    updatedAt: todayISO(),
    sections: [
      {
        id: makeId("sec"),
        title: "Meeting Details",
        type: "group",
        repeatable: false,
        fields: [
          { id: makeId("f"), label: "Meeting Title", key: "meeting_title", fieldType: "short_text" },
          { id: makeId("f"), label: "Meeting Type", key: "meeting_type", fieldType: "short_text" },
          { id: makeId("f"), label: "Date", key: "date", fieldType: "date" },
          { id: makeId("f"), label: "Time", key: "time", fieldType: "time" },
          { id: makeId("f"), label: "Location", key: "location", fieldType: "short_text" },
        ],
      },
      {
        id: makeId("sec"),
        title: "Discussion and Decisions",
        type: "group",
        repeatable: false,
        fields: [
          {
            id: makeId("f"),
            label: "Summary of Discussion",
            key: "discussion_summary",
            fieldType: "paragraph_block",
          },
          {
            id: makeId("f"),
            label: "Decisions Taken",
            key: "decisions_taken",
            fieldType: "multi_line_list",
          },
          {
            id: makeId("f"),
            label: "Action Items",
            key: "action_items",
            fieldType: "table_rows",
            columns: ["Task Description", "Responsible Person", "Due Date", "Status"],
          },
        ],
      },
    ],
  };
}

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [users, setUsers] = useState(initialUsers);
  const [selectedUsername, setSelectedUsername] = useState(initialUsers[0].username);
  const [pendingRole, setPendingRole] = useState(initialUsers[0].role);

  const [sectors, setSectors] = useState(initialSectors);
  const [selectedSectorId, setSelectedSectorId] = useState(initialSectors[0].id);
  const [sectorMode, setSectorMode] = useState("edit");
  const [sectorForm, setSectorForm] = useState({
    name: initialSectors[0].name,
    parametersText: initialSectors[0].parameters.join("\n"),
  });

  const [templates, setTemplates] = useState(initialTemplates);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateStatusFilter, setTemplateStatusFilter] = useState("all");
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState(null);
  const [templateEditorMode, setTemplateEditorMode] = useState("new");
  const [templateEditorDraft, setTemplateEditorDraft] = useState(() =>
    createNewTemplateDraft(initialSectors),
  );
  const [previewTemplateId, setPreviewTemplateId] = useState(null);
  const [showSectionDeleteConfirm, setShowSectionDeleteConfirm] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  const selectedUser = useMemo(
    () => users.find((user) => user.username === selectedUsername) ?? users[0],
    [selectedUsername, users],
  );

  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.id === selectedSectorId) ?? null,
    [selectedSectorId, sectors],
  );

  const roleCounts = useMemo(() => {
    const counts = { MoM: 0, Scrutiny: 0, Admin: 0, Proponent: 0 };
    users.forEach((user) => {
      if (counts[user.role] !== undefined) counts[user.role] += 1;
    });
    return counts;
  }, [users]);

  useEffect(() => {
    if (selectedUser) setPendingRole(selectedUser.role);
  }, [selectedUser]);

  useEffect(() => {
    if (sectorMode === "edit" && selectedSector) {
      setSectorForm({
        name: selectedSector.name,
        parametersText: selectedSector.parameters.join("\n"),
      });
    }
  }, [sectorMode, selectedSector]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const path = location.pathname.replace(/\/+$/, "");

    if (path === "/admin-dashboard" || path === "/admin-dashboard/") {
      setActiveView("dashboard");
      return;
    }
    if (path === "/admin-dashboard/users") {
      setActiveView("users");
      return;
    }
    if (path === "/admin-dashboard/role-assignment") {
      setActiveView("role-assignment");
      return;
    }
    if (path === "/admin-dashboard/sectors") {
      setActiveView("sectors");
      return;
    }
    if (path === "/admin-dashboard/sector-parameters") {
      setActiveView("sector-parameters");
      return;
    }
    if (path === "/admin-dashboard/templates") {
      setActiveView("templates");
      return;
    }
    if (path === "/admin-dashboard/templates/new") {
      setTemplateEditorMode("new");
      setTemplateEditorDraft(createNewTemplateDraft(sectors));
      setShowSectionDeleteConfirm(null);
      setActiveView("templates-editor");
      return;
    }

    const editMatch = path.match(/^\/admin-dashboard\/templates\/([^/]+)\/edit$/);
    if (editMatch) {
      const templateId = decodeURIComponent(editMatch[1]);
      const template = templates.find((item) => item.id === templateId);
      if (template) {
        setTemplateEditorMode("edit");
        setTemplateEditorDraft(cloneTemplate(template));
        setShowSectionDeleteConfirm(null);
        setActiveView("templates-editor");
      } else {
        setActiveView("templates");
      }
      return;
    }

    const previewMatch = path.match(/^\/admin-dashboard\/templates\/([^/]+)\/preview$/);
    if (previewMatch) {
      const templateId = decodeURIComponent(previewMatch[1]);
      setPreviewTemplateId(templateId);
      setActiveView("templates-preview");
    }
  }, [location.pathname, sectors, templates]);

  const stats = [
    {
      label: "Total Users",
      value: "24,512",
      note: "+12.5% vs last month",
      noteClass: "text-emerald-600",
      icon: Users,
      iconWrap: "bg-blue-100 text-blue-600",
    },
    {
      label: "Role Counts",
      note: "Role-wise user distribution",
      noteClass: "text-[#4f6583]",
      hideValue: true,
      details: [
        `MoM: ${roleCounts.MoM}`,
        `Scrutiny: ${roleCounts.Scrutiny}`,
        `Admins: ${roleCounts.Admin}`,
        `Proponents: ${roleCounts.Proponent}`,
      ],
      icon: UserCog,
      iconWrap: "bg-violet-100 text-violet-600",
    },
    {
      label: "Pending Actions",
      value: "28 Issues",
      note: "4 Urgent",
      noteClass: "text-rose-600",
      icon: FileText,
      iconWrap: "bg-amber-100 text-amber-700",
    },
    {
      label: "Total % Orders Completed",
      value: "89.7%",
      note: "Across all processed orders",
      noteClass: "text-emerald-600",
      icon: CheckCircle2,
      iconWrap: "bg-emerald-100 text-emerald-700",
    },
  ];

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesQuery =
        query.length === 0 ||
        template.name.toLowerCase().includes(query) ||
        template.type.toLowerCase().includes(query) ||
        template.sector.toLowerCase().includes(query);
      const matchesStatus =
        templateStatusFilter === "all" || template.status === templateStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [templateSearch, templateStatusFilter, templates]);

  const openRoleAssignment = (username) => {
    setSelectedUsername(username);
    navigate("/admin-dashboard/role-assignment");
  };

  const saveRoleAssignment = () => {
    setUsers((current) =>
      current.map((user) =>
        user.username === selectedUsername ? { ...user, role: pendingRole } : user,
      ),
    );
    navigate("/admin-dashboard/users");
  };

  const openAddSector = () => {
    setSectorMode("add");
    setSelectedSectorId(null);
    setSectorForm({ name: "", parametersText: "" });
    navigate("/admin-dashboard/sector-parameters");
  };

  const openEditSector = (sectorId) => {
    setSectorMode("edit");
    setSelectedSectorId(sectorId);
    navigate("/admin-dashboard/sector-parameters");
  };

  const saveSector = () => {
    const nextName = sectorForm.name.trim();
    const nextParameters = sectorForm.parametersText
      .split("\n")
      .map((line) => line.trim().replace(/^[-*]\s*/, ""))
      .filter(Boolean);

    if (!nextName || nextParameters.length === 0) {
      return;
    }

    if (sectorMode === "add") {
      const nextId = sectors.length > 0 ? Math.max(...sectors.map((s) => s.id)) + 1 : 1;
      setSectors((current) => [
        ...current,
        { id: nextId, name: nextName, parameters: nextParameters },
      ]);
      setSelectedSectorId(nextId);
    } else if (selectedSectorId != null) {
      setSectors((current) =>
        current.map((sector) =>
          sector.id === selectedSectorId
            ? { ...sector, name: nextName, parameters: nextParameters }
            : sector,
        ),
      );
    }

    navigate("/admin-dashboard/sectors");
  };

  const openTemplatesList = () => {
    navigate("/admin-dashboard/templates");
  };

  const openCreateTemplate = () => {
    navigate("/admin-dashboard/templates/new");
  };

  const openEditTemplate = (templateId) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    navigate(`/admin-dashboard/templates/${encodeURIComponent(templateId)}/edit`);
  };

  const openPreviewTemplate = (templateId) => {
    navigate(`/admin-dashboard/templates/${encodeURIComponent(templateId)}/preview`);
  };

  const saveTemplateDraft = (status) => {
    const payload = {
      ...templateEditorDraft,
      id: templateEditorMode === "new" ? makeId("template") : templateEditorDraft.id,
      status,
      updatedAt: todayISO(),
    };

    if (templateEditorMode === "new") {
      setTemplates((current) => [payload, ...current]);
      setToastMessage("Template created successfully.");
    } else {
      setTemplates((current) =>
        current.map((template) => (template.id === payload.id ? payload : template)),
      );
      setToastMessage("Template updated successfully.");
    }

    navigate("/admin-dashboard/templates");
  };

  const duplicateTemplate = (templateId) => {
    setTemplates((current) => {
      const source = current.find((template) => template.id === templateId);
      if (!source) return current;
      const copy = cloneTemplate(source);
      copy.id = makeId("template");
      copy.name = `${source.name} (Copy)`;
      copy.status = "draft";
      copy.updatedAt = todayISO();
      return [copy, ...current];
    });
    setToastMessage("Template duplicated.");
  };

  const setTemplateAsActive = (templateId) => {
    setTemplates((current) =>
      current.map((template) => ({
        ...template,
        status: template.id === templateId ? "active" : "draft",
      })),
    );
    setToastMessage("Template set as active.");
  };

  const deleteTemplate = () => {
    if (!templateDeleteTarget) return;
    setTemplates((current) =>
      current.filter((template) => template.id !== templateDeleteTarget.id),
    );
    setTemplateDeleteTarget(null);
    setToastMessage("Template deleted.");
  };

  const addTemplateSection = () => {
    setTemplateEditorDraft((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          id: makeId("sec"),
          title: "New Section",
          type: "group",
          repeatable: false,
          fields: [
            {
              id: makeId("f"),
              label: "New Field",
              key: "new_field",
              fieldType: "short_text",
            },
          ],
        },
      ],
    }));
  };

  const moveSection = (sectionIndex, direction) => {
    setTemplateEditorDraft((current) => {
      const targetIndex = sectionIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.sections.length) return current;
      const next = [...current.sections];
      const [section] = next.splice(sectionIndex, 1);
      next.splice(targetIndex, 0, section);
      return { ...current, sections: next };
    });
  };

  const updateSection = (sectionId, patch) => {
    setTemplateEditorDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  };

  const confirmDeleteSection = () => {
    if (!showSectionDeleteConfirm) return;
    setTemplateEditorDraft((current) => ({
      ...current,
      sections: current.sections.filter(
        (section) => section.id !== showSectionDeleteConfirm.id,
      ),
    }));
    setShowSectionDeleteConfirm(null);
  };

  const addField = (sectionId) => {
    setTemplateEditorDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: [
                ...section.fields,
                {
                  id: makeId("f"),
                  label: "Field Label",
                  key: "field_key",
                  fieldType: "short_text",
                },
              ],
            }
          : section,
      ),
    }));
  };

  const updateField = (sectionId, fieldId, patch) => {
    setTemplateEditorDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, ...patch } : field,
              ),
            }
          : section,
      ),
    }));
  };

  const removeField = (sectionId, fieldId) => {
    setTemplateEditorDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter((field) => field.id !== fieldId) }
          : section,
      ),
    }));
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

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-[#121826]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[300px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-[#f7faf8] lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#124734] text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[40px] leading-[1] tracking-tight text-[#124734]">
                  EcoClear
                </p>
                <p className="-mt-0.5 text-lg text-slate-500">GovTech Admin</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isTemplatesView =
                activeView === "templates" ||
                activeView === "templates-editor" ||
                activeView === "templates-preview";
              const isActive =
                item.key === "templates" ? isTemplatesView : item.key === activeView;
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left ${
                    isActive
                      ? "bg-[#124734] text-white shadow-[0_12px_25px_rgba(18,71,52,0.2)]"
                      : "text-[#2e4665] hover:bg-white"
                  }`}
                  key={item.label}
                  onClick={() => {
                    const routeMap = {
                      dashboard: "/admin-dashboard",
                      users: "/admin-dashboard/users",
                      "role-assignment": "/admin-dashboard/role-assignment",
                      sectors: "/admin-dashboard/sectors",
                      "sector-parameters": "/admin-dashboard/sector-parameters",
                      templates: "/admin-dashboard/templates",
                    };
                    if (
                      item.key === "dashboard" ||
                      item.key === "users" ||
                      item.key === "role-assignment" ||
                      item.key === "sectors" ||
                      item.key === "sector-parameters" ||
                      item.key === "templates"
                    ) {
                      navigate(routeMap[item.key]);
                    }
                  }}
                  type="button"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="text-[29px]">{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200 px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-slate-200" />
                <div>
                  <p className="text-[29px] font-semibold text-[#1f3048]">Alex Rivera</p>
                  <p className="text-lg text-slate-500">Super Admin</p>
                </div>
              </div>
              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
                onClick={handleLogout}
                type="button"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-[#f4f7f6]/95 px-6 py-4 backdrop-blur lg:px-8">
            <label className="relative hidden max-w-xl flex-1 sm:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="h-12 w-full rounded-xl border border-slate-200 bg-white/90 pl-12 pr-4 text-lg text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                placeholder="Search applications, users, or logs..."
                type="text"
              />
            </label>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
                type="button"
              >
                <Bell className="h-5 w-5" />
              </button>
              <button
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
                type="button"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="space-y-6 p-6 lg:p-8">
            {activeView === "dashboard" ? <DashboardView stats={stats} /> : null}
            {activeView === "users" ? (
              <UsersView onEditRole={openRoleAssignment} users={users} />
            ) : null}
            {activeView === "role-assignment" ? (
              <RoleAssignmentView
                onSave={saveRoleAssignment}
                pendingRole={pendingRole}
                selectedUser={selectedUser}
                setPendingRole={setPendingRole}
                setSelectedUsername={setSelectedUsername}
                users={users}
              />
            ) : null}
            {activeView === "sectors" ? (
              <SectorsView
                onAddSector={openAddSector}
                onEditSector={openEditSector}
                sectors={sectors}
              />
            ) : null}
            {activeView === "sector-parameters" ? (
              <SectorParametersView
                mode={sectorMode}
                onSave={saveSector}
                sectorForm={sectorForm}
                selectedSector={selectedSector}
                setSectorForm={setSectorForm}
              />
            ) : null}

            {activeView === "templates" ? (
              <TemplatesListView
                filteredTemplates={filteredTemplates}
                onCreate={openCreateTemplate}
                onDeleteAsk={setTemplateDeleteTarget}
                onDuplicate={duplicateTemplate}
                onEdit={openEditTemplate}
                onPreview={openPreviewTemplate}
                onSetActive={setTemplateAsActive}
                search={templateSearch}
                setSearch={setTemplateSearch}
                statusFilter={templateStatusFilter}
                setStatusFilter={setTemplateStatusFilter}
              />
            ) : null}

            {activeView === "templates-editor" ? (
              <TemplateEditorView
                addField={addField}
                addTemplateSection={addTemplateSection}
                draft={templateEditorDraft}
                mode={templateEditorMode}
                moveSection={moveSection}
                onCancel={openTemplatesList}
                onSaveDraft={() => saveTemplateDraft("draft")}
                onSaveTemplate={() => saveTemplateDraft("active")}
                removeField={removeField}
                requestDeleteSection={setShowSectionDeleteConfirm}
                sectors={sectors}
                setDraft={setTemplateEditorDraft}
                updateField={updateField}
                updateSection={updateSection}
              />
            ) : null}

            {activeView === "templates-preview" ? (
              <TemplatePreviewView
                onBack={openTemplatesList}
                onEdit={openEditTemplate}
                template={templates.find((template) => template.id === previewTemplateId)}
              />
            ) : null}
          </div>
        </main>
      </div>

      {templateDeleteTarget ? (
        <ConfirmModal
          confirmLabel="Delete Template"
          description={`Delete "${templateDeleteTarget.name}"? This action cannot be undone.`}
          onCancel={() => setTemplateDeleteTarget(null)}
          onConfirm={deleteTemplate}
          title="Delete Template"
        />
      ) : null}

      {showSectionDeleteConfirm ? (
        <ConfirmModal
          confirmLabel="Delete Section"
          description={`Delete section "${showSectionDeleteConfirm.title}" and all placeholders?`}
          onCancel={() => setShowSectionDeleteConfirm(null)}
          onConfirm={confirmDeleteSection}
          title="Delete Section"
        />
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#124734] px-4 py-2.5 text-[17px] font-semibold text-white shadow-[0_14px_28px_rgba(18,71,52,0.28)]">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}

function DashboardView({ stats }) {
  return (
    <>
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">
            System Dashboard
          </h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Status report for EcoClear Environmental Governance Platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[29px] font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
          >
            <Download className="h-[18px] w-[18px]" />
            Export Data
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2.5 text-[29px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
            type="button"
          >
            <Plus className="h-[18px] w-[18px]" />
            New User
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              key={stat.label}
            >
              <div className="flex items-start justify-between">
                <p className="text-[27px] text-[#5b6d87]">{stat.label}</p>
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconWrap}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              {!stat.hideValue ? (
                <p className="mt-4 text-5xl font-semibold tracking-tight text-[#111827]">
                  {stat.value}
                </p>
              ) : null}
              <p
                className={`${stat.hideValue ? "mt-4" : "mt-2"} text-[27px] font-medium ${stat.noteClass}`}
              >
                {stat.note}
              </p>
              {stat.details ? (
                <div className="mt-3 space-y-1 rounded-lg bg-[#f6f8fc] px-3 py-2 text-[23px] font-semibold text-[#3f5d83]">
                  {stat.details.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      <section>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[37px] font-semibold text-[#111827]">
                Application Stage Distribution
              </h2>
              <p className="mt-1 text-[27px] text-[#5a6f8d]">
                Current status of all active environmental clearances
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#f8faf9] px-3.5 py-2 text-[27px] text-slate-700"
              type="button"
            >
              Last 30 Days
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-slate-100 bg-[#fbfcfb] p-4">
            <div className="flex h-[260px] items-end justify-between gap-3">
              {stageData.map((item) => (
                <div className="flex flex-1 flex-col items-center gap-3" key={item.stage}>
                  <div
                    className="w-full max-w-[74px] rounded-t-lg bg-gradient-to-t from-[#124734]/90 to-[#2b7f5d]/40"
                    style={{ height: `${item.value}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-center text-[24px] font-semibold text-[#4d6584]">
              {stageData.map((item) => (
                <span className="flex-1" key={item.stage}>
                  {item.stage}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function UsersView({ users, onEditRole }) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">Users</h1>
        <p className="mt-2 text-[29px] text-[#5a6f8d]">
          Manage user identities and role access in EcoClear.
        </p>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-[#f6f9f7]">
              <tr>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Username
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-b border-slate-100 last:border-b-0" key={user.username}>
                  <td className="px-5 py-3 text-[22px] font-semibold text-[#1f3048]">
                    {user.username}
                  </td>
                  <td className="px-5 py-3 text-[22px] text-[#1f3048]">{user.name}</td>
                  <td className="px-5 py-3 text-[22px] text-[#5c6f89]">{user.email}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-[#dff0e7] px-2.5 py-1 text-[20px] font-semibold text-[#124734]">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                      onClick={() => onEditRole(user.username)}
                      type="button"
                    >
                      Edit Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function RoleAssignmentView({
  users,
  selectedUser,
  setSelectedUsername,
  pendingRole,
  setPendingRole,
  onSave,
}) {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">
          Role Assignment
        </h1>
        <p className="mt-2 text-[29px] text-[#5a6f8d]">
          Assign `MoM`, `Scrutiny`, or `Admin` role to a selected user.
        </p>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-[22px] font-semibold text-[#304763]">User</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[22px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
              onChange={(event) => setSelectedUsername(event.target.value)}
              value={selectedUser?.username ?? ""}
            >
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.username} - {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="block text-[22px] font-semibold text-[#304763]">Assign Role</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[22px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
              onChange={(event) => setPendingRole(event.target.value)}
              value={pendingRole}
            >
              <option value="MoM">MoM</option>
              <option value="Scrutiny">Scrutiny</option>
              <option value="Admin">Admin</option>
              <option value="Proponent">Proponent</option>
            </select>
          </label>
        </div>

        {selectedUser ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-[#f8fbf9] p-4">
            <p className="text-[22px] text-[#415a79]">
              <span className="font-semibold text-[#1f3048]">Username:</span>{" "}
              {selectedUser.username}
            </p>
            <p className="mt-1 text-[22px] text-[#415a79]">
              <span className="font-semibold text-[#1f3048]">Name:</span> {selectedUser.name}
            </p>
            <p className="mt-1 text-[22px] text-[#415a79]">
              <span className="font-semibold text-[#1f3048]">Email:</span> {selectedUser.email}
            </p>
            <p className="mt-1 text-[22px] text-[#415a79]">
              <span className="font-semibold text-[#1f3048]">Current Role:</span>{" "}
              {selectedUser.role}
            </p>
          </div>
        ) : null}

        <div className="mt-5">
          <button
            className="inline-flex items-center rounded-xl bg-[#124734] px-5 py-2.5 text-[22px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
            onClick={onSave}
            type="button"
          >
            Save Assignment
          </button>
        </div>
      </article>
    </section>
  );
}

function SectorsView({ sectors, onAddSector, onEditSector }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">Sector</h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Sector list from database. Add new sectors or edit existing sectors.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2.5 text-[22px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
          onClick={onAddSector}
          type="button"
        >
          <Plus className="h-[18px] w-[18px]" />
          Add New Sector
        </button>
      </div>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-[#f6f9f7]">
              <tr>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Sector Name
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Parameters
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => (
                <tr className="border-b border-slate-100 last:border-b-0" key={sector.id}>
                  <td className="px-5 py-3 text-[22px] font-semibold text-[#1f3048]">
                    {sector.name}
                  </td>
                  <td className="px-5 py-3 text-[21px] text-[#5c6f89]">
                    {sector.parameters.join(", ")}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                      onClick={() => onEditSector(sector.id)}
                      type="button"
                    >
                      Edit Sector
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function SectorParametersView({ mode, selectedSector, sectorForm, setSectorForm, onSave }) {
  const title =
    mode === "add" ? "Sector Parameters - Add New Sector" : "Sector Parameters - Edit Sector";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">
          Sector Parameters
        </h1>
        <p className="mt-2 text-[29px] text-[#5a6f8d]">{title}</p>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="block text-[22px] font-semibold text-[#304763]">Sector Name</span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[22px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
              onChange={(event) =>
                setSectorForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Infrastructure Sector"
              type="text"
              value={sectorForm.name}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-[22px] font-semibold text-[#304763]">
              Parameters (one per line)
            </span>
            <textarea
              className="min-h-[150px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[22px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
              onChange={(event) =>
                setSectorForm((current) => ({
                  ...current,
                  parametersText: event.target.value,
                }))
              }
              placeholder={"Project timeline\nLand acquisition"}
              value={sectorForm.parametersText}
            />
          </label>
        </div>

        {mode === "edit" && selectedSector ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-[#f8fbf9] p-4">
            <p className="text-[22px] font-semibold text-[#1f3048]">
              Example:
              <span className="ml-2 font-normal text-[#415a79]">
                {selectedSector.name}
              </span>
            </p>
            <p className="mt-1 text-[22px] text-[#415a79]">Parameters:</p>
            {selectedSector.parameters.map((parameter) => (
              <p className="text-[21px] text-[#5c6f89]" key={parameter}>
                - {parameter}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-5">
          <button
            className="inline-flex items-center rounded-xl bg-[#124734] px-5 py-2.5 text-[22px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
            onClick={onSave}
            type="button"
          >
            Save Sector Parameters
          </button>
        </div>
      </article>
    </section>
  );
}

function TemplatesListView({
  filteredTemplates,
  onCreate,
  onDeleteAsk,
  onDuplicate,
  onEdit,
  onPreview,
  onSetActive,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">Templates</h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Manage MoM document templates for meeting generation.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2.5 text-[22px] font-semibold text-white shadow-[0_12px_24px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
          onClick={onCreate}
          type="button"
        >
          <FilePlus2 className="h-[18px] w-[18px]" />
          Create Template
        </button>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-[20px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates, type, or sector..."
              type="text"
              value={search}
            />
          </label>
          <select
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-[20px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </article>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-[#f6f9f7]">
              <tr>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Template Name
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Sector
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Last Modified
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Created By
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-[20px] font-semibold text-[#536a87]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.length === 0 ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-[22px] text-[#5c6f89]"
                    colSpan={7}
                  >
                    No templates found for current filters.
                  </td>
                </tr>
              ) : null}

              {filteredTemplates.map((template) => (
                <tr className="border-b border-slate-100 last:border-b-0" key={template.id}>
                  <td className="px-5 py-3 text-[22px] font-semibold text-[#1f3048]">
                    {template.name}
                  </td>
                  <td className="px-5 py-3 text-[21px] text-[#5c6f89]">{template.type}</td>
                  <td className="px-5 py-3 text-[21px] text-[#5c6f89]">{template.sector}</td>
                  <td className="px-5 py-3 text-[21px] text-[#5c6f89]">{template.updatedAt}</td>
                  <td className="px-5 py-3 text-[21px] text-[#5c6f89]">{template.createdBy}</td>
                  <td className="px-5 py-3">
                    <StatusChip status={template.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[18px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                        onClick={() => onEdit(template.id)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[18px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                        onClick={() => onPreview(template.id)}
                        type="button"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[18px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                        onClick={() => onDuplicate(template.id)}
                        type="button"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[18px] font-semibold text-[#124734] hover:bg-[#f2f8f4] disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={template.status === "active"}
                        onClick={() => onSetActive(template.id)}
                        type="button"
                      >
                        Set Active
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[18px] font-semibold text-rose-700 hover:bg-rose-50"
                        onClick={() => onDeleteAsk(template)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function TemplateEditorView({
  addField,
  addTemplateSection,
  draft,
  mode,
  moveSection,
  onCancel,
  onSaveDraft,
  onSaveTemplate,
  removeField,
  requestDeleteSection,
  sectors,
  setDraft,
  updateField,
  updateSection,
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">
            {mode === "new" ? "Create Template" : "Edit Template"}
          </h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Build reusable MoM schema with sections, placeholders, and field types.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
            onClick={onSaveDraft}
            type="button"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2 text-[20px] font-semibold text-white shadow-[0_10px_20px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
            onClick={onSaveTemplate}
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Template
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-[30px] font-semibold text-[#1f3048]">Template Settings</h2>
            <div className="mt-3 grid gap-3">
              <label className="space-y-1.5">
                <span className="block text-[19px] font-semibold text-[#3f5b7d]">
                  Template Name
                </span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                  type="text"
                  value={draft.name}
                />
              </label>

              <label className="space-y-1.5">
                <span className="block text-[19px] font-semibold text-[#3f5b7d]">
                  Description
                </span>
                <textarea
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  value={draft.description}
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-[19px] font-semibold text-[#3f5b7d]">Type</span>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, type: event.target.value }))
                    }
                    value={draft.type}
                  >
                    <option value="MoM">MoM</option>
                    <option value="Committee">Committee</option>
                    <option value="Sector Review">Sector Review</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-[19px] font-semibold text-[#3f5b7d]">Sector</span>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, sector: event.target.value }))
                    }
                    value={draft.sector}
                  >
                    <option value="General">General</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.name}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1.5">
                <span className="block text-[19px] font-semibold text-[#3f5b7d]">Status</span>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, status: event.target.value }))
                  }
                  value={draft.status}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </label>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[30px] font-semibold text-[#1f3048]">Template Sections</h2>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-[#124734] px-3 py-1.5 text-[18px] font-semibold text-white hover:bg-[#0f3a2b]"
                onClick={addTemplateSection}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Section
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {draft.sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-[#f9fbfa] p-4 text-[19px] text-[#5c6f89]">
                  No sections yet. Add a section to start building the template.
                </div>
              ) : null}

              {draft.sections.map((section, sectionIndex) => (
                <div
                  className="rounded-xl border border-slate-200 bg-[#fbfcfc] p-3"
                  key={section.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <GripVertical className="h-4 w-4 text-slate-400" />
                    <input
                      className="h-10 min-w-[230px] flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[19px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                      onChange={(event) =>
                        updateSection(section.id, { title: event.target.value })
                      }
                      type="text"
                      value={section.title}
                    />

                    <button
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[16px] font-semibold text-[#3e5676] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={sectionIndex === 0}
                      onClick={() => moveSection(sectionIndex, -1)}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[16px] font-semibold text-[#3e5676] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={sectionIndex === draft.sections.length - 1}
                      onClick={() => moveSection(sectionIndex, 1)}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[16px] font-semibold text-rose-700 hover:bg-rose-50"
                      onClick={() => requestDeleteSection(section)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  <label className="mt-2 flex items-center gap-2 text-[18px] text-[#4f6583]">
                    <input
                      checked={section.repeatable}
                      onChange={(event) =>
                        updateSection(section.id, { repeatable: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Repeatable section (for participants, agenda, or decisions list)
                  </label>

                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    {section.fields.map((field) => (
                      <div
                        className="rounded-lg border border-slate-100 bg-[#fcfdfc] p-2.5"
                        key={field.id}
                      >
                        <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_170px_auto] md:items-center">
                          <input
                            className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-[17px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                            onChange={(event) => {
                              const label = event.target.value;
                              updateField(section.id, field.id, {
                                label,
                                key: sanitizeKey(label) || field.key,
                              });
                            }}
                            placeholder="Field label"
                            type="text"
                            value={field.label}
                          />
                          <input
                            className="h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-[17px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                            onChange={(event) =>
                              updateField(section.id, field.id, {
                                key: sanitizeKey(event.target.value),
                              })
                            }
                            placeholder="placeholder_key"
                            type="text"
                            value={field.key}
                          />
                          <select
                            className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-[17px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                            onChange={(event) =>
                              updateField(section.id, field.id, { fieldType: event.target.value })
                            }
                            value={field.fieldType}
                          >
                            {fieldTypeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white p-2 text-rose-700 hover:bg-rose-50"
                            onClick={() => removeField(section.id, field.id)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {field.fieldType === "table_rows" ? (
                          <input
                            className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[16px] text-[#1f3048] outline-none focus:border-[#124734] focus:ring-2 focus:ring-[#124734]/10"
                            onChange={(event) =>
                              updateField(section.id, field.id, {
                                columns: event.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="Columns (comma separated)"
                            type="text"
                            value={(field.columns ?? []).join(", ")}
                          />
                        ) : null}

                        <div className="mt-2 inline-flex items-center rounded-md bg-[#e9f5ef] px-2.5 py-1 text-[14px] font-semibold text-[#124734]">
                          {`{{${field.key || "placeholder"}}}`}
                        </div>
                      </div>
                    ))}
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[16px] font-semibold text-[#124734] hover:bg-[#f2f8f4]"
                      onClick={() => addField(section.id)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      Add Placeholder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-[30px] font-semibold text-[#1f3048]">Live Preview</h2>
          <p className="mt-1 text-[19px] text-[#607593]">
            Document view for MoM Team usage with template placeholders.
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-[#fcfdfd] p-4">
            <TemplateDocumentPreview template={draft} />
          </div>
        </article>
      </div>
    </section>
  );
}

function TemplatePreviewView({ onBack, onEdit, template }) {
  if (!template) {
    return (
      <section className="space-y-4">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">
            Template Preview
          </h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">
            Selected template was not found.
          </p>
        </div>
        <button
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
          onClick={onBack}
          type="button"
        >
          Back to Templates
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#124734]">
            Template Preview
          </h1>
          <p className="mt-2 text-[29px] text-[#5a6f8d]">{template.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[20px] font-semibold text-[#445a78] hover:bg-slate-50"
            onClick={onBack}
            type="button"
          >
            Back
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#124734] px-4 py-2 text-[20px] font-semibold text-white shadow-[0_10px_20px_rgba(18,71,52,0.2)] hover:bg-[#0f3a2b]"
            onClick={() => onEdit(template.id)}
            type="button"
          >
            Edit Template
          </button>
        </div>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[20px] font-semibold text-[#1f3048]">
              Type: <span className="font-normal text-[#4f6583]">{template.type}</span>
            </p>
            <p className="mt-0.5 text-[20px] font-semibold text-[#1f3048]">
              Sector: <span className="font-normal text-[#4f6583]">{template.sector}</span>
            </p>
          </div>
          <StatusChip status={template.status} />
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-[#fcfdfd] p-4">
          <TemplateDocumentPreview template={template} />
        </div>
      </article>
    </section>
  );
}

function TemplateDocumentPreview({ template }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[31px] font-semibold text-[#1f3048]">{template.name}</h3>
        <p className="mt-1 text-[19px] text-[#5c6f89]">{template.description}</p>
      </div>

      {template.sections.map((section) => (
        <div className="rounded-xl border border-slate-200 bg-white p-4" key={section.id}>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[24px] font-semibold text-[#1f3048]">{section.title}</p>
            {section.repeatable ? (
              <span className="rounded-md bg-[#edf5ff] px-2 py-0.5 text-[13px] font-semibold text-[#365f99]">
                Repeatable
              </span>
            ) : null}
          </div>

          <div className="mt-3 space-y-3">
            {section.fields.map((field) => (
              <TemplateFieldPreview field={field} key={field.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplateFieldPreview({ field }) {
  const fieldKey = field.key || sanitizeKey(field.label) || "placeholder";
  const token = `{{${fieldKey}}}`;

  if (field.fieldType === "paragraph_block" || field.fieldType === "long_text") {
    return (
      <div>
        <p className="text-[18px] font-semibold text-[#1f3048]">{field.label}:</p>
        <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-[#f9fbfa] px-3 py-2 text-[17px] text-[#516883]">
          {token}
        </div>
      </div>
    );
  }

  if (field.fieldType === "multi_line_list") {
    return (
      <div>
        <p className="text-[18px] font-semibold text-[#1f3048]">{field.label}:</p>
        <div className="mt-1 rounded-lg border border-dashed border-slate-300 bg-[#f9fbfa] p-2.5">
          {[1, 2, 3].map((index) => (
            <p className="text-[17px] text-[#516883]" key={index}>
              - {`{{${fieldKey}_${index}}}`}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (field.fieldType === "table_rows") {
    const columns = field.columns?.length
      ? field.columns
      : ["Column 1", "Column 2", "Column 3", "Column 4"];
    return (
      <div>
        <p className="text-[18px] font-semibold text-[#1f3048]">{field.label}:</p>
        <div className="mt-1 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full border-collapse">
            <thead className="bg-[#f6f9f7]">
              <tr>
                {columns.map((column) => (
                  <th
                    className="border-b border-slate-200 px-3 py-2 text-left text-[15px] font-semibold text-[#526887]"
                    key={column}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {columns.map((column) => (
                  <td className="px-3 py-2 text-[16px] text-[#5c6f89]" key={column}>
                    {`{{${sanitizeKey(column) || "value"}}}`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1 sm:grid-cols-[220px_1fr] sm:items-start">
      <p className="text-[18px] font-semibold text-[#1f3048]">{field.label}:</p>
      <div className="rounded-md bg-[#e9f5ef] px-2.5 py-1 text-[16px] font-semibold text-[#124734]">
        {token}
      </div>
    </div>
  );
}

function ConfirmModal({ title, description, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[30px] font-semibold text-[#1f3048]">{title}</h2>
          <button
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            onClick={onCancel}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-[21px] text-[#5c6f89]">{description}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[19px] font-semibold text-[#445a78] hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-xl bg-rose-600 px-4 py-2 text-[19px] font-semibold text-white hover:bg-rose-700"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }) {
  const style =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-200 text-slate-700";
  return (
    <span className={`rounded-md px-2.5 py-1 text-[16px] font-semibold uppercase ${style}`}>
      {status}
    </span>
  );
}

export default AdminDashboard;
