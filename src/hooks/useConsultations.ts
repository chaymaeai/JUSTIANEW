import { useCallback, useState } from "react";
import type { Consultation } from "@/types/client";
import { getApiErrorMessage } from "@/services/api";
import * as consultationService from "@/services/consultationService";

export function useConsultations(initial?: { demandeId?: string; page?: number; pageSize?: number }) {
  const [data, setData] = useState<Consultation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (params?: { demandeId?: string; page?: number; pageSize?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await consultationService.listConsultations({ ...initial, ...params });
        setData(res.data);
        setTotal(res.total);
      } catch (e) {
        setError(getApiErrorMessage(e));
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [initial]
  );

  const getOne = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await consultationService.getConsultation(id);
    } catch (e) {
      setError(getApiErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Parameters<typeof consultationService.createConsultation>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const c = await consultationService.createConsultation(payload);
      setData((prev) => [c, ...prev]);
      return c;
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: Parameters<typeof consultationService.updateConsultation>[1]) => {
    setLoading(true);
    setError(null);
    try {
      const c = await consultationService.updateConsultation(id, payload);
      setData((prev) => prev.map((x) => (x.id === id ? c : x)));
      return c;
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
      await consultationService.deleteConsultation(id);
      setData((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    consultations: data,
    total,
    loading,
    error,
    fetchList,
    getOne,
    create,
    update,
    remove,
  };
}
