import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, getApiErrorMessage } from "@/services/api";

interface Consultation {
  id: string;
  scheduled_at: string;
  duration: number;
  status: string;
  status_display: string;
  consultation_type: string;
  consultation_type_display: string;
  client_name: string;
  expert_name: string;
}

interface Availability {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
}

const STATUS_COLOR: Record<string, string> = {
  planifiee: "bg-cyan-100 border-cyan-300 text-cyan-800",
  en_cours:  "bg-blue-100 border-blue-300 text-blue-800",
  terminee:  "bg-emerald-100 border-emerald-300 text-emerald-800",
  annulee:   "bg-slate-200 border-slate-300 text-slate-700",
};

const STATUS_GRID: Record<string, string> = {
  planifiee: "bg-cyan-200 text-cyan-900",
  en_cours:  "bg-blue-200 text-blue-900",
  terminee:  "bg-emerald-200 text-emerald-900",
  annulee:   "bg-slate-200 text-slate-600",
};

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function getWeekDays(refDate: Date): Date[] {
  const start = new Date(refDate);
  start.setDate(refDate.getDate() - ((refDate.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getWeekLabel(date: Date) {
  const start = new Date(date);
  start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `Semaine du ${start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

function isSameDay(dateStr: string, refDate: Date) {
  return new Date(dateStr).toDateString() === refDate.toDateString();
}

function isSameMonth(dateStr: string, refDate: Date) {
  const d = new Date(dateStr);
  return d.getMonth() === refDate.getMonth() && d.getFullYear() === refDate.getFullYear();
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 08h → 18h

export default function FournisseurCalendar() {
  const [view, setView]                   = useState<"Semaine" | "Jour" | "Mois">("Semaine");
  const [refDate, setRefDate]             = useState(new Date());
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<Consultation | null>(null);
  const [savingAvail, setSavingAvail]     = useState(false);
  const [availMsg, setAvailMsg]           = useState("");
  const [error, setError]                 = useState<string | null>(null);
  const [showModal, setShowModal]         = useState(false);
  const [newConsult, setNewConsult]       = useState({
    demande: "", expert: "", scheduled_at: "", duration: 30, consultation_type: "visio",
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [availability, setAvailability] = useState<Availability>({
    monday: "09:00-18:00", tuesday: "09:00-18:00", wednesday: "09:00-18:00",
    thursday: "09:00-18:00", friday: "09:00-17:00",
  });

  useEffect(() => {
    loadConsultations();
    loadAvailability();
    loadClients();
  }, []);

  const loadConsultations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/consultations/", { params: { ordering: "scheduled_at", page_size: 100 } });
      setConsultations(res.data?.results ?? res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Erreur chargement consultations"));
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    try {
      const res = await api.get("/consultations/availability/");
      if (res.data?.slots?.length) {
        const days: Partial<Availability> = {};
        const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        res.data.slots.forEach((slot: any) => {
          const key = dayNames[slot.weekday] as keyof Availability;
          if (key) days[key] = `${slot.start_time}-${slot.end_time}`;
        });
        setAvailability(prev => ({ ...prev, ...days }));
      }
    } catch {}
  };

  const loadClients = async () => {
    try {
      const res = await api.get("/demandes/");
      const data = res.data?.results ?? res.data ?? [];
      setClients(data
        .filter((d: any) => d.status !== "annulee" && d.status !== "traitee")
        .map((d: any) => ({ id: d.id, name: `${d.reference} — ${d.client_name}` }))
      );
    } catch {}
  };

  const navigate = (dir: 1 | -1) => {
    const d = new Date(refDate);
    if (view === "Jour")    d.setDate(d.getDate() + dir);
    if (view === "Semaine") d.setDate(d.getDate() + dir * 7);
    if (view === "Mois")    d.setMonth(d.getMonth() + dir);
    setRefDate(d);
  };

  const goToday = () => setRefDate(new Date());

  const viewLabel = () => {
    if (view === "Semaine") return getWeekLabel(refDate);
    if (view === "Jour")    return fmtDate(refDate.toISOString());
    return refDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  };

  const saveAvailability = async () => {
    setSavingAvail(true);
    setAvailMsg("");
    try {
      const dayMap: Record<string, number> = { monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4 };
      const slots = Object.entries(availability).map(([day, range]) => {
        const [start, end] = range.split("-");
        return { weekday: dayMap[day], start_time: start, end_time: end };
      });
      await api.put("/consultations/availability/", { slots });
      setAvailMsg("✅ Disponibilités enregistrées !");
      setTimeout(() => setAvailMsg(""), 3000);
    } catch {
      setAvailMsg("❌ Erreur lors de l'enregistrement.");
    } finally {
      setSavingAvail(false);
    }
  };

  const createConsultation = async () => {
    try {
      const meRes = await api.get("/auth/me/");
      const expertId = meRes.data.id;
      const payload = {
        demande: newConsult.demande,
        expert: expertId,
        scheduled_at: new Date(newConsult.scheduled_at).toISOString(),
        duration: newConsult.duration,
        consultation_type: newConsult.consultation_type,
      };
      const res = await api.post("/consultations/", payload);
      setConsultations(prev => [...prev, res.data]);
      setNewConsult({ demande: "", expert: "", scheduled_at: "", duration: 30, consultation_type: "visio" });
      setShowModal(false);
      await loadConsultations();
    } catch (err: any) {
      alert(JSON.stringify(err.response?.data));
    }
  };

  const todayConsultations = consultations.filter(c => isSameDay(c.scheduled_at, new Date()));
  const weekDays = getWeekDays(refDate);
  const today = new Date().toDateString();

  // ── Vue Semaine en grille horaire ─────────────────────────
  const renderWeekGrid = () => (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header jours */}
        <div className="grid grid-cols-8 border-b border-slate-200 mb-1">
          <div className="py-2 text-xs text-slate-400 text-center">Heure</div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`py-2 text-center text-xs font-medium ${
                day.toDateString() === today ? "text-cyan-600 font-bold" : "text-slate-600"
              }`}
            >
              <p className="uppercase">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</p>
              <p className={`text-lg ${day.toDateString() === today ? "bg-cyan-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
                {day.getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Grille horaire */}
        {HOURS.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-slate-100 min-h-[56px]">
            <div className="text-xs text-slate-400 text-right pr-2 pt-1">{hour}:00</div>
            {weekDays.map((day) => {
              const dayConsults = consultations.filter((c) => {
                const d = new Date(c.scheduled_at);
                return isSameDay(c.scheduled_at, day) && d.getHours() === hour;
              });
              return (
                <div key={day.toISOString()} className="border-l border-slate-100 p-0.5 relative">
                  {dayConsults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className={`w-full text-left rounded p-1 text-xs mb-0.5 truncate ${STATUS_GRID[c.status] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      <p className="font-semibold truncate">{fmtTime(c.scheduled_at)}</p>
                      <p className="truncate">{c.client_name}</p>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Vue Jour ──────────────────────────────────────────────
  const renderDayView = () => {
    const dayConsults = consultations.filter(c => isSameDay(c.scheduled_at, refDate));
    return (
      <div>
        {HOURS.map((hour) => {
          const hourConsults = dayConsults.filter(c => new Date(c.scheduled_at).getHours() === hour);
          return (
            <div key={hour} className="flex gap-3 border-b border-slate-100 min-h-[56px] py-1">
              <span className="text-xs text-slate-400 w-12 text-right pt-1 shrink-0">{hour}:00</span>
              <div className="flex-1 space-y-1">
                {hourConsults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left rounded-lg border p-2 text-xs ${STATUS_COLOR[c.status] ?? "bg-slate-100"}`}
                  >
                    <p className="font-semibold">{fmtTime(c.scheduled_at)} — {c.client_name}</p>
                    <p>{c.consultation_type_display} · {c.status_display}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {dayConsults.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Aucune consultation ce jour</p>
        )}
      </div>
    );
  };

  // ── Vue Mois ──────────────────────────────────────────────
  const renderMonthView = () => {
    const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay);
    start.setDate(1 - offset);
    const days = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
    return (
      <div>
        <div className="grid grid-cols-7 mb-1">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = day.getMonth() === refDate.getMonth();
            const isToday = day.toDateString() === today;
            const dayConsults = consultations.filter(c => isSameDay(c.scheduled_at, day));
            return (
              <div
                key={day.toISOString()}
                onClick={() => { setRefDate(day); setView("Jour"); }}
                className={`min-h-[80px] rounded-lg border p-1 cursor-pointer hover:bg-slate-50 ${
                  isToday ? "border-cyan-400 bg-cyan-50" : "border-slate-200"
                } ${!inMonth ? "opacity-40" : ""}`}
              >
                <p className={`text-xs font-medium mb-1 ${isToday ? "text-cyan-600" : "text-slate-700"}`}>
                  {day.getDate()}
                </p>
                {dayConsults.slice(0, 2).map(c => (
                  <p key={c.id} className={`text-xs rounded px-1 truncate mb-0.5 ${STATUS_GRID[c.status] ?? "bg-slate-100"}`}>
                    {fmtTime(c.scheduled_at)} {c.client_name}
                  </p>
                ))}
                {dayConsults.length > 2 && (
                  <p className="text-xs text-slate-400">+{dayConsults.length - 2} autres</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      {error && (
        <div className="xl:col-span-12 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="space-y-4 xl:col-span-9">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex gap-2">
              {(["Semaine", "Jour", "Mois"] as const).map((v) => (
                <Button key={v} variant={view === v ? "default" : "outline"}
                  className={view === v ? "bg-cyan-500 text-white hover:bg-cyan-600" : ""}
                  onClick={() => setView(v)}>
                  {v}
                </Button>
              ))}
              {/* ✅ Bouton Aujourd'hui */}
              <Button variant="outline" onClick={goToday}>Aujourd'hui</Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{viewLabel()}</span>
              <Button size="icon" variant="outline" onClick={() => navigate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button className="bg-cyan-500 text-white hover:bg-cyan-600" onClick={() => setShowModal(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Nouvelle consultation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Planning ({view})</CardTitle>
            {/* ✅ Légende */}
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-cyan-200 inline-block"/> Planifiée</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-200 inline-block"/> En cours</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-200 inline-block"/> Terminée</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-slate-200 inline-block"/> Annulée</span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-sm text-slate-500 py-8">Chargement...</p>
            ) : view === "Semaine" ? renderWeekGrid()
              : view === "Jour" ? renderDayView()
              : renderMonthView()}
          </CardContent>
        </Card>
      </div>

      {/* ── Sidebar ── */}
      <div className="space-y-4 xl:col-span-3">
        <Card>
          <CardHeader><CardTitle>Aujourd'hui</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {todayConsultations.length === 0 ? (
              <p className="text-slate-400">Aucune consultation aujourd'hui</p>
            ) : (
              todayConsultations.map((c) => (
                <div key={c.id} className="rounded-md border border-slate-200 p-2 cursor-pointer hover:bg-slate-50"
                  onClick={() => setSelected(c)}>
                  <p className="font-medium">{fmtTime(c.scheduled_at)} — {c.client_name}</p>
                  <p className="text-xs text-slate-500">{c.consultation_type_display}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Disponibilités</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { key: "monday", label: "Lundi" },
              { key: "tuesday", label: "Mardi" },
              { key: "wednesday", label: "Mercredi" },
              { key: "thursday", label: "Jeudi" },
              { key: "friday", label: "Vendredi" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-slate-500 mb-0.5 block">{label}</label>
                <input
                  className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={availability[key as keyof Availability]}
                  onChange={(e) => setAvailability(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            {availMsg && (
              <p className={`text-xs ${availMsg.startsWith("✅") ? "text-emerald-600" : "text-red-600"}`}>
                {availMsg}
              </p>
            )}
            <Button className="w-full bg-cyan-500 text-white hover:bg-cyan-600"
              disabled={savingAvail} onClick={saveAvailability}>
              {savingAvail ? "Enregistrement..." : "Enregistrer disponibilités"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Modal Nouvelle consultation ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Nouvelle consultation</CardTitle>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Dossier</label>
                <select className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={newConsult.demande}
                  onChange={(e) => setNewConsult(prev => ({ ...prev, demande: e.target.value }))}>
                  <option value="">-- Choisir un dossier --</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Date & Heure</label>
                <input type="datetime-local"
                  className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={newConsult.scheduled_at}
                  onChange={(e) => setNewConsult(prev => ({ ...prev, scheduled_at: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Durée (minutes)</label>
                <select className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={newConsult.duration}
                  onChange={(e) => setNewConsult(prev => ({ ...prev, duration: Number(e.target.value) }))}>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Type</label>
                <select className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                  value={newConsult.consultation_type}
                  onChange={(e) => setNewConsult(prev => ({ ...prev, consultation_type: e.target.value }))}>
                  <option value="visio">Visioconférence</option>
                  <option value="telephone">Téléphone</option>
                  <option value="presentiel">Présentiel</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button className="bg-cyan-500 text-white hover:bg-cyan-600"
                  onClick={createConsultation}
                  disabled={!newConsult.demande || !newConsult.scheduled_at}>
                  Créer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Modal détail ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Détails consultation</CardTitle>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Client</p>
                  <p className="font-medium">{selected.client_name}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Type</p>
                  <p className="font-medium">{selected.consultation_type_display}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Date & Heure</p>
                  <p className="font-medium">{fmtDate(selected.scheduled_at)}</p>
                  <p className="text-slate-600">{fmtTime(selected.scheduled_at)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-400 mb-1">Durée</p>
                  <p className="font-medium">{selected.duration} min</p>
                </div>
              </div>
              <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${STATUS_COLOR[selected.status]}`}>
                Statut : {selected.status_display}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}