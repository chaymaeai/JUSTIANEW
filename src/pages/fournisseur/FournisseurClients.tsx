import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, getApiErrorMessage } from "@/services/api";

type StaffClient = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  company: string;
  is_verified: boolean;
  created_at: string;
  demandes_count: number;
};

type ClientDemande = {
  id: string;
  reference: string;
  domain_display: string;
  status_display: string;
  created_at: string;
};

export default function FournisseurClients() {
  const { id } = useParams();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<StaffClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StaffClient | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [clientDemandes, setClientDemandes] = useState<ClientDemande[]>([]);

  // ✅ Hook 1 — charger la liste
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get("/auth/staff/clients/");
        if (!cancelled) setClients(data?.results ?? data ?? []);
      } catch (e) {
        if (!cancelled) setError(getApiErrorMessage(e, "Impossible de charger les clients."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ✅ Hook 2 — charger le détail quand id change
  useEffect(() => {
    if (!id) {
      setDetail(null);
      setClientDemandes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      setError(null);
      try {
        const found = clients.find((c) => c.id === id);
        if (found && !cancelled) {
          setDetail(found);
        } else {
          const { data } = await api.get(`/auth/staff/clients/${id}/`);
          if (!cancelled) setDetail(data);
        }
        const demandesRes = await api.get("/demandes/", {
          params: { client: id, page_size: 20 },
        });
        if (!cancelled) {
          setClientDemandes(demandesRes.data?.results ?? demandesRes.data ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null);
          setError(getApiErrorMessage(e, "Client introuvable."));
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, clients]);

  // ✅ Hook 3 — useMemo TOUJOURS appelé, peu importe id
  const filtered = useMemo(
    () => clients.filter((item) => {
      const q = query.toLowerCase();
      return (
        item.full_name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        (item.company && item.company.toLowerCase().includes(q))
      );
    }),
    [clients, query]
  );

  // ✅ Les return conditionnels APRÈS tous les hooks
  if (id) {
    if (detailLoading) {
      return <p className="p-8 text-center text-sm text-slate-500">Chargement du profil...</p>;
    }
    if (!detail) {
      return (
        <div className="space-y-3 p-4">
          <p className="text-sm text-red-600">{error ?? "Client introuvable."}</p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/fournisseur/clients">← Retour</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <CardHeader><CardTitle>Fiche client</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan/15 text-xl font-semibold text-cyan">
              {detail.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <p className="text-lg font-semibold">{detail.full_name}</p>
            <div className="space-y-1 text-slate-600">
              <p>📧 {detail.email}</p>
              {detail.phone && <p>📞 {detail.phone}</p>}
              {detail.company && <p>🏢 {detail.company}</p>}
            </div>
            <Badge className={detail.is_verified ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
              {detail.is_verified ? "✓ Email vérifié" : "✗ Non vérifié"}
            </Badge>
            <div className="rounded-lg border border-slate-200 p-3 text-xs text-slate-500">
              <p>Inscrit le {new Date(detail.created_at).toLocaleDateString("fr-FR")}</p>
              <p className="mt-1">{detail.demandes_count} demande(s) au total</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={!detail.phone}
                onClick={() => window.location.href = `tel:${detail.phone}`}>
                Appeler
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => window.location.href = `mailto:${detail.email}`}>
                Email
              </Button>
            </div>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/fournisseur/clients">← Retour à la liste</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader><CardTitle>Demandes de {detail.full_name}</CardTitle></CardHeader>
          <CardContent>
            {clientDemandes.length === 0 ? (
              <p className="text-sm text-slate-500">Aucune demande pour ce client.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Référence</th>
                    <th className="px-3 py-2">Domaine</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clientDemandes.map((demande) => (
                    <tr key={demande.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-medium">{demande.reference}</td>
                      <td className="px-3 py-3">{demande.domain_display}</td>
                      <td className="px-3 py-3">
                        <Badge variant="outline">{demande.status_display}</Badge>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {new Date(demande.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link to="/fournisseur/demandes">Voir</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Vue Liste ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <h2 className="text-lg font-semibold">Clients</h2>
          <Input
            className="max-w-md"
            placeholder="Rechercher nom, email, societe..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <p className="text-xs text-slate-500">Clients avec compte email verifie</p>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Chargement des clients...</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Telephone</th>
                  <th className="px-4 py-3">Societe</th>
                  <th className="px-4 py-3">Demandes</th>
                  <th className="px-4 py-3">Inscription</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                      Aucun client pour le moment.
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <Fragment key={client.id}>
                      <tr className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{client.full_name}</td>
                        <td className="px-4 py-3">{client.email}</td>
                        <td className="px-4 py-3">{client.phone || "—"}</td>
                        <td className="px-4 py-3">{client.company || "—"}</td>
                        <td className="px-4 py-3">{client.demandes_count}</td>
                        <td className="px-4 py-3">
                          {new Date(client.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpanded((prev) => (prev === client.id ? null : client.id))}
                            >
                              {expanded === client.id ? "Replier" : "Apercu"}
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/fournisseur/clients/${client.id}`}>Profil</Link>
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {expanded === client.id && (
                        <tr className="border-t border-slate-100 bg-slate-50/60">
                          <td className="px-4 py-4" colSpan={7}>
                            <div className="grid gap-4 text-sm sm:grid-cols-3">
                              <div>
                                <p className="font-medium text-slate-700">Email</p>
                                <p className="text-slate-500">{client.email}</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">Téléphone</p>
                                <p className="text-slate-500">{client.phone || "—"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">Société</p>
                                <p className="text-slate-500">{client.company || "—"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">Demandes</p>
                                <p className="text-slate-500">{client.demandes_count} demande(s)</p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">Inscrit le</p>
                                <p className="text-slate-500">
                                  {new Date(client.created_at).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">Statut email</p>
                                <Badge className={client.is_verified
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                                }>
                                  {client.is_verified ? "✓ Vérifié" : "✗ Non vérifié"}
                                </Badge>
                              </div>
                              <div className="sm:col-span-3 flex gap-2 pt-2 border-t border-slate-200 mt-2">
                                <Button size="sm" variant="outline"
                                  onClick={() => window.location.href = `mailto:${client.email}`}>
                                  📧 Envoyer un email
                                </Button>
                                {client.phone && (
                                  <Button size="sm" variant="outline"
                                    onClick={() => window.location.href = `tel:${client.phone}`}>
                                    📞 Appeler
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" asChild>
                                  <Link to={`/fournisseur/clients/${client.id}`}>
                                    Voir le profil complet →
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}