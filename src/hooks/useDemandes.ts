import { useCallback, useState } from "react";
import type { DemandeListParams } from "@/types/api";
import type { Demande } from "@/types/client";
import { getApiErrorMessage } from "@/services/api";
import * as demandeService from "@/services/demandeService";

export function useDemandes(initialParams?: DemandeListParams) {
  const [data, setData] = useState<Demande[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams?.page ?? 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (params?: DemandeListParams) => {
      setLoading(true);
      setError(null);
      try {
        const res = await demandeService.listDemandes({ ...initialParams, ...params });
        setData(res.data);
        setTotal(res.total);
        if (params?.page != null) setPage(params.page);
      } catch (e) {
        setError(getApiErrorMessage(e));
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [initialParams]
  );

  const getOne = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await demandeService.getDemande(id);
    } catch (e) {
      setError(getApiErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (payload: Parameters<typeof demandeService.createDemande>[0]) => {
      setLoading(true);
      setError(null);
      try {
        const created = await demandeService.createDemande(payload);
        setData((prev) => [created, ...prev]);
        return created;
      } catch (e) {
        const msg = getApiErrorMessage(e);
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const update = useCallback(async (id: string, payload: Parameters<typeof demandeService.updateDemande>[1]) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await demandeService.updateDemande(id, payload);
      setData((prev) => prev.map((d) => (d.id === id ? updated : d)));
      return updated;
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await demandeService.deleteDemande(id);
      setData((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    demandes: data,
    total,
    page,
    loading,
    error,
    fetchList,
    getOne,
    create,
    update,
    remove,
    setPage,
  };
}

export type UseDemandesReturn = ReturnType<typeof useDemandes>;
