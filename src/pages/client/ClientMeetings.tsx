import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/pages/client/DashboardContext";
import type { Consultation } from "@/types/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function getInitials(firstName?: string, lastName?: string) {
  return `${(firstName ?? "?")[0]}${(lastName ?? "")[0] ?? ""}`.toUpperCase();
}

// ─── Créneaux disponibles ────────────────────────────────────────────────────

const ALL_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00",
  "14:00", "14:30", "15:00", "15:30", "16:00",
];

// Simule des créneaux déjà pris selon le jour (en production : appel API)
function getAvailableSlots(iso: string): string[] {
  // Bloque aléatoirement quelques créneaux de façon déterministe par date
  const seed = iso.split("-").reduce((acc, v) => acc + Number(v), 0);
  return ALL_SLOTS.filter((_, i) => (seed + i) % 5 !== 0);
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function ClientMeetings() {
  const { consultations } = useDashboard();
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingState, setBookingState] = useState<"idle" | "confirming" | "confirmed">("idle");
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

  const availableSlots = useMemo(() => getAvailableSlots(selectedDate), [selectedDate]);

  const today = new Date().toISOString().slice(0, 10);
  const monthCount = meetings.length;

  // Réinitialise le créneau et l'état de réservation quand la date change
  const handleSelectDate = (iso: string) => {
    setSelectedDate(iso);
    setSelectedSlot(null);
    setBookingState("idle");
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) return;
    setBookingState("confirming");
    // Simule un appel API
    setTimeout(() => setBookingState("confirmed"), 800);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Mes rendez-vous</CardTitle>
        <Badge className="bg-cyan-100 text-cyan-700 text-sm px-3 py-1">
          {monthCount} RDV ce mois
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* ── Ligne 1 : Calendrier + Créneaux ─────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">

          {/* Calendrier mensuel */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="mb-4 flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
              >
                ‹
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
                ›
              </Button>
            </div>

            {/* En-têtes jours */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs uppercase text-slate-500">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            {/* Grille jours */}
            <div className="grid grid-cols-7 gap-1">
              {monthGrid.map((day) => {
                const iso = day.toISOString().slice(0, 10);
                const inMonth = day.getMonth() === monthDate.getMonth();
                const hasMeetings = (byDate.get(iso) ?? []).length > 0;
                const isPast = iso < today;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isPast && iso !== today}
                    onClick={() => handleSelectDate(iso)}
                    className={cn(
                      "relative h-10 rounded border text-sm transition-colors",
                      isPast && iso !== today
                        ? "cursor-not-allowed border-transparent text-slate-300 dark:text-slate-700"
                        : iso === selectedDate
                        ? "border-cyan bg-cyan/10 font-semibold"
                        : iso === today
                        ? "border-cyan font-semibold text-cyan"
                        : "border-slate-200 hover:border-cyan/50 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800",
                      inMonth ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-600"
                    )}
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

          {/* Créneaux horaires */}
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                Créneaux disponibles —{" "}
                <span className="font-normal text-slate-500">
                  {new Date(selectedDate).toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </span>
              </p>

              {availableSlots.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400 dark:border-slate-700">
                  Aucun créneau disponible ce jour.
                </p>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  {ALL_SLOTS.map((slot) => {
                    const available = availableSlots.includes(slot);
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!available}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setBookingState("idle");
                        }}
                        className={cn(
                          "rounded-lg border py-2 text-sm font-medium transition-colors",
                          !available
                            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700"
                            : isSelected
                            ? "border-cyan bg-cyan/10 text-cyan"
                            : "border-slate-200 bg-white hover:border-cyan/60 hover:bg-cyan/5 dark:border-slate-700 dark:bg-slate-800"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bandeau info visioconférence */}
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
              <span className="mt-0.5 shrink-0 text-base" aria-hidden="true">🎥</span>
              <p className="leading-relaxed">
                La consultation se déroulera par visioconférence.{" "}
                <span className="font-medium">Le lien sera envoyé par email.</span>
              </p>
            </div>

            {/* Bouton de confirmation */}
            {selectedSlot && bookingState !== "confirmed" && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                  Créneau sélectionné :{" "}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {new Date(selectedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {selectedSlot}
                  </span>
                </p>
                <Button
                  className="w-full bg-cyan text-white hover:bg-cyan/90"
                  onClick={handleConfirmBooking}
                  disabled={bookingState === "confirming"}
                >
                  {bookingState === "confirming" ? "Confirmation en cours..." : "Confirmer ce créneau"}
                </Button>
              </div>
            )}

            {/* Confirmation réussie */}
            {bookingState === "confirmed" && (
              <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-300">
                <span className="mt-0.5 shrink-0" aria-hidden="true">✅</span>
                <p>
                  Rendez-vous confirmé le{" "}
                  <span className="font-medium">
                    {new Date(selectedDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à {selectedSlot}
                  </span>. Un email de confirmation vous a été envoyé.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Ligne 2 : Liste des RDV du jour sélectionné ──────────────────── */}
        <div className="space-y-3">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {selectedDate
              ? `Rendez-vous du ${new Date(selectedDate).toLocaleDateString("fr-FR")}`
              : "Tous les rendez-vous"}
          </p>

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