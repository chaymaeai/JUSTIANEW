import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/pages/client/DashboardContext";
import type { Consultation } from "@/types/client";

function getMonthGrid(base: Date) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(base.getFullYear(), base.getMonth(), 1 - offset);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatTime(dateStr: string | undefined | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ✅ Initiales pour l'avatar
function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName ?? "?")[0]}${(lastName ?? "")[0] ?? ""}`.toUpperCase();
}

export default function ClientMeetings() {
  const { consultations } = useDashboard();
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetings, setMeetings] = useState<Consultation[]>([]);
  const monthGrid = useMemo(() => getMonthGrid(monthDate), [monthDate]);
  const from = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().slice(0, 10);

  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const response = await fetch(`/api/meetings?clientId=demo-client&from=${from}&to=${to}`);
        if (!response.ok) throw new Error("request_failed");
        const data = (await response.json()) as Consultation[];
        setMeetings(data.filter((c) => c && c.scheduledAt));
      } catch {
        setMeetings(
          consultations.filter(
            (c) => c && c.scheduledAt && (c.status === "planifiee" || c.status === "en_cours")
          )
        );
      }
    };
    loadMeetings();
  }, [consultations, from, to]);

  const byDate = useMemo(() => {
    const map = new Map<string, Consultation[]>();
    meetings.forEach((meeting) => {
      const day = meeting.scheduledAt?.slice(0, 10);
      if (!day) return;
      map.set(day, [...(map.get(day) || []), meeting]);
    });
    return map;
  }, [meetings]);

  const selectedMeetings = useMemo(
    () => byDate.get(selectedDate) ?? meetings,
    [byDate, selectedDate, meetings]
  );

  const today = new Date().toISOString().slice(0, 10);

  // ✅ Compteur RDV du mois
  const monthCount = meetings.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Mes rendez-vous</CardTitle>
        {/* ✅ Compteur RDV */}
        <Badge className="bg-cyan-100 text-cyan-700 text-sm px-3 py-1">
          {monthCount} RDV ce mois
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
              }
            >
              Prev
            </Button>
            <p className="font-semibold capitalize">
              {monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
              }
            >
              Next
            </Button>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs uppercase text-slate-500">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day) => {
              const iso = day.toISOString().slice(0, 10);
              const inMonth = day.getMonth() === monthDate.getMonth();
              const hasMeetings = (byDate.get(iso) || []).length > 0;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedDate(iso)}
                  className={`relative h-10 rounded border text-sm ${
                    iso === selectedDate
                      ? "border-cyan bg-cyan/10"
                      : iso === today
                      ? "border-cyan"
                      : "border-slate-200 dark:border-slate-700"
                  } ${inMonth ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}
                >
                  {day.getDate()}
                  {hasMeetings && (
                    <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <Link to="/consultation" className="text-sm font-medium text-cyan hover:underline">
              Planifier un nouveau rendez-vous →
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {selectedDate
              ? `Rendez-vous du ${new Date(selectedDate).toLocaleDateString("fr-FR")}`
              : "Tous les rendez-vous"}
          </p>

          {/* ✅ Message vide */}
          {selectedMeetings.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
              📅 Aucun rendez-vous ce jour
            </div>
          )}

          {selectedMeetings.map((meeting) => {
            const startTime = formatTime(meeting.scheduledAt);
            const endTime =
              meeting.scheduledAt && meeting.duration
                ? formatTime(
                    new Date(
                      new Date(meeting.scheduledAt).getTime() + meeting.duration * 60000
                    ).toISOString()
                  )
                : "";
            const specialization =
              (meeting.expert?.specialization?.[0] ?? "").replace(/_/g, " ");

            return (
              <div
                key={meeting.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                {/* ✅ Heure + Statut */}
                <div className="mb-3 flex items-center justify-between">
                  <Badge className="bg-slate-100 text-slate-700">
                    {startTime} {endTime ? `- ${endTime}` : ""}
                  </Badge>
                  <Badge
                    className={
                      meeting.status === "en_cours"
                        ? "bg-emerald-100 text-emerald-700"
                        : meeting.status === "planifiee"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {meeting.status === "en_cours"
                      ? "Confirmé ✅"
                      : meeting.status === "planifiee"
                      ? "En attente ⏳"
                      : "Annulé ❌"}
                  </Badge>
                </div>

                {/* ✅ Avatar + Infos expert */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">
                    {getInitials(meeting.expert?.firstName, meeting.expert?.lastName)}
                  </div>
                  <div>
                    <p className="font-semibold">
                      Me. {meeting.expert?.firstName ?? "—"} {meeting.expert?.lastName ?? ""}
                    </p>
                    {specialization && (
                      <p className="text-xs text-slate-500 capitalize">{specialization}</p>
                    )}
                  </div>
                </div>

                {/* ✅ Bouton Rejoindre uniquement si en_cours */}
                {meeting.status === "en_cours" && meeting.meetingUrl && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="bg-cyan-500 text-white hover:bg-cyan-600"
                      onClick={() => window.open(meeting.meetingUrl, "_blank", "noopener,noreferrer")}
                    >
                      Rejoindre la consultation
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}