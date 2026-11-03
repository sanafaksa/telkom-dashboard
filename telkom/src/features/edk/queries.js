import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { edkApi } from './api';

export const useEdkSummary = (by, filters) =>
  useQuery({
    queryKey: ['edk', 'summary', by, filters],
    queryFn: () => edkApi.summary(by, filters),
    placeholderData: keepPreviousData, // tabel tidak berkedip kosong saat ganti filter
  });

export const useEdkCards = (filters) =>
  useQuery({
    queryKey: ['edk', 'cards', filters],
    queryFn: () => edkApi.cards(filters),
    placeholderData: keepPreviousData,
  });

export const useEdkOptions = (uploadId) =>
  useQuery({
    queryKey: ['edk', 'options', uploadId ?? 'active'],
    queryFn: () => edkApi.options(uploadId),
  });

export const useEdkTopCustomers = (filters, { enabled = true, ...opts } = {}) =>
  useQuery({
    queryKey: ['edk', 'top', filters, opts],
    queryFn: () => edkApi.topCustomers(filters, opts),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useEdkUploads = () =>
  useQuery({
    queryKey: ['edk', 'uploads'],
    queryFn: edkApi.uploads,
  });

export function useUploadEdk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, reportDate }) => edkApi.upload(file, reportDate),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edk'] }),
  });
}

export function useActivateEdk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => edkApi.activate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['edk'] }),
  });
}

export const useAuditLogs = (page = 1) =>
  useQuery({
    queryKey: ['edk', 'audit', page],
    queryFn: () => edkApi.auditLogs(page),
    placeholderData: keepPreviousData,
  });