import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/services/api";
import { createExpert, listExperts } from "@/services/expertAdminService";
import { Navigate } from "react-router-dom";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

type TeamMember = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  specializations?: string[];
  is_available?: boolean;
};

export default function FournisseurEquipe() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadExperts = async () => {
      try {
        const response = await listExperts();
        // Gérer les réponses paginées ou les listes directes
        const expertsList = Array.isArray(response) ? response : response?.results || [];
        setMembers(expertsList);
      } catch (e) {
        console.error("Erreur lors du chargement des experts:", e);
        setError("Erreur lors du chargement des experts");
      } finally {
        setIsLoading(false);
      }
    };
    loadExperts();
  }, []);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    company: "",
    specializations: "",
    years_experience: "0",
    languages: "fr,ar",
  });

  if (user?.role !== "admin") {
    return <Navigate to="/fournisseur/dashboard" replace />;
  }

  const handleChange =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const onCreateExpert = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");
    setError("");
    setIsSubmitting(true);
    try {
      const created = await createExpert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        company: form.company.trim(),
        years_experience: Number(form.years_experience || "0"),
        specializations: form.specializations
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        languages: form.languages
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
      });
      setMembers((prev) => [created as TeamMember, ...prev]);
      setSuccess("Expert cree avec succes.");
      setForm((prev) => ({ ...prev, password: "", email: "" }));
    } catch (e) {
      setError(getApiErrorMessage(e, "Creation impossible."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Equipe (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateExpert}>
            <Input placeholder="Prenom" value={form.first_name} onChange={handleChange("first_name")} required />
            <Input placeholder="Nom" value={form.last_name} onChange={handleChange("last_name")} required />
            <Input type="email" placeholder="Email expert" value={form.email} onChange={handleChange("email")} required />
            <Input type="password" placeholder="Mot de passe temporaire" value={form.password} onChange={handleChange("password")} required />
            <Input placeholder="Telephone" value={form.phone} onChange={handleChange("phone")} />
            <Input placeholder="Cabinet / Societe" value={form.company} onChange={handleChange("company")} />
            <Input placeholder="Specialites (rgpd,droit_affaires,...)" value={form.specializations} onChange={handleChange("specializations")} />
            <Input placeholder="Langues (fr,ar,en)" value={form.languages} onChange={handleChange("languages")} />
            <Input type="number" min={0} placeholder="Annees experience" value={form.years_experience} onChange={handleChange("years_experience")} />
            <div className="md:col-span-2">
              <Button type="submit" className="bg-cyan text-white hover:bg-cyan/90" disabled={isSubmitting}>
                {isSubmitting ? "Creation..." : "Ajouter expert"}
              </Button>
            </div>
            {success ? <p className="text-sm text-emerald-600 md:col-span-2">{success}</p> : null}
            {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experts ajoutes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? <p className="text-sm text-slate-500">Aucun expert cree depuis cette session.</p> : null}
          {members.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div>
                <p className="font-medium">{member.first_name} {member.last_name}</p>
                <p className="text-xs text-slate-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={member.is_available ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {member.is_available ? "Disponible" : "Indisponible"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
