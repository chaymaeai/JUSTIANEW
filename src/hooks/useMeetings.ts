import { useCallback, useState } from "react";
import type { Meeting } from "@/types/api";
import { getApiErrorMessage } from "@/services/api";
import * as meetingService from "@/services/meetingService";

export function useMeetings(initial?: { page?: number; pageSize?: number; from?: string; to?: string }) {
  const [data, setData] = useState<Meeting[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (params?: Parameters<typeof meetingService.listMeetings>[0]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await meetingService.listMeetings({ ...initial, ...params });
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
      return await meetingService.getMeeting(id);
    } catch (e) {
      setError(getApiErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: Parameters<typeof meetingService.createMeeting>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const m = await meetingService.createMeeting(payload);
      setData((prev) => [m, ...prev]);
      return m;
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: Parameters<typeof meetingService.updateMeeting>[1]) => {
    setLoading(true);
    setError(null);
    try {
      const m = await meetingService.updateMeeting(id, payload);
      setData((prev) => prev.map((x) => (x.id === id ? m : x)));
      return m;
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
      await meetingService.deleteMeeting(id);
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
    meetings: data,
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
