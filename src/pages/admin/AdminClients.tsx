import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, getApiErrorMessage } from "@/services/api";

interface Client {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_type: "physique" | "morale";
  company?: string;
  is_verified: boolean;
  created_at: string;
  demandes_count?: number;
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/auth/staff/clients/");
      setClients(response.data || []);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Erreur lors du chargement des clients"));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    `${client.first_name} ${client.last_name} ${client.email} ${client.company || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Clients</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {clients.length} client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des clients</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Rechercher par nom, email ou entreprise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Chargement des clients...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Aucun client trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Nom</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Entreprise</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Vérification</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Dossiers</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-300">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {client.first_name} {client.last_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 dark:text-slate-300">{client.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {client.profile_type === "morale" ? "Entreprise" : "Particulier"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 dark:text-slate-300">{client.company || "—"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            client.is_verified
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {client.is_verified ? "Vérifié" : "En attente"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 dark:text-slate-300">{client.demandes_count || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-600 dark:text-slate-300">
                          {new Date(client.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
