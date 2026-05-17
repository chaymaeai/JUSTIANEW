import type {
  PublicationAuthor,
  PublicationCategory,
  PublicationComment,
  PublicationDetail,
  PublicationListItem,
  PublicationListResult,
  PublicationTag,
} from "@/types/publication";
import { getMediaUrl } from "@/utils/media";
import { api } from "./api";

type DrfPaged<T> = {
  count: number;
  pages?: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type CategoryApi = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  publications_count?: number;
};

type TagApi = { id: string; name: string; slug: string };

type ListApi = {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  excerpt?: string;
  pub_type: string;
  pub_type_display?: string;
  category: CategoryApi | null;
  tags?: TagApi[];
  author_name?: string;
  cover_image?: string | null;
  cover_alt?: string;
  language: string;
  status: string;
  access: string;
  is_featured?: boolean;
  published_at?: string | null;
  reading_time?: number;
  views_count?: number;
  has_pdf?: boolean;
};

type UserApi = {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
};

type CommentApi = {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  status: string;
  replies?: CommentApi[];
};

type DetailApi = ListApi & {
  content?: string;
  meta_title?: string;
  meta_description?: string;
  author?: UserApi | null;
  author_bio?: string;
  shares_count?: number;
  related_publications?: ListApi[];
  comments?: CommentApi[];
  comments_count?: number;
};

/** Absolute URL for PDF download (Bearer token via shared axios instance if used). */
export function getPublicationPdfUrl(slug: string): string {
  const base = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api").replace(/\/$/, "");
  return `${base}/publications/${slug}/pdf/`;
}

export function resolveMediaUrl(path: string | null | undefined): string | null {
  return getMediaUrl(path ?? null);
}

function parseDrfPageFromUrl(url: string | null): number | null {
  if (!url) return null;
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL(url, window.location.origin);
    const p = u.searchParams.get("page");
    if (!p) return null;
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function mapCategory(c: CategoryApi | null): PublicationCategory | null {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    color: c.color ?? "#00B2FF",
    icon: c.icon ?? "",
    publicationsCount: c.publications_count,
  };
}

function mapTag(t: TagApi): PublicationTag {
  return { id: t.id, name: t.name, slug: t.slug };
}

function mapAuthor(u: UserApi | null | undefined): PublicationAuthor | null {
  if (!u) return null;
  return {
    id: u.id,
    firstName: u.first_name ?? "",
    lastName: u.last_name ?? "",
    email: u.email,
    avatar: u.avatar ?? undefined,
  };
}

function mapCommentTree(row: CommentApi): PublicationComment {
  return {
    id: row.id,
    authorName: row.author_name,
    content: row.content,
    createdAt: row.created_at,
    status: row.status as PublicationComment["status"],
    replies: (row.replies ?? []).map(mapCommentTree),
  };
}

function mapListItem(row: ListApi): PublicationListItem {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle ?? "",
    excerpt: row.excerpt ?? "",
    pubType: row.pub_type as PublicationListItem["pubType"],
    pubTypeDisplay: row.pub_type_display ?? row.pub_type,
    category: mapCategory(row.category),
    tags: (row.tags ?? []).map(mapTag),
    authorName: row.author_name ?? "",
    coverImage: resolveMediaUrl(row.cover_image),
    coverAlt: row.cover_alt ?? "",
    language: row.language as PublicationListItem["language"],
    status: row.status as PublicationListItem["status"],
    access: row.access as PublicationListItem["access"],
    isFeatured: Boolean(row.is_featured),
    publishedAt: row.published_at ?? null,
    readingTime: row.reading_time ?? 0,
    viewsCount: row.views_count ?? 0,
    hasPdf: Boolean(row.has_pdf),
  };
}

function mapDetail(row: DetailApi): PublicationDetail {
  const base = mapListItem(row);
  return {
    ...base,
    content: row.content ?? "",
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    author: mapAuthor(row.author),
    authorBio: row.author_bio ?? "",
    sharesCount: row.shares_count ?? 0,
    relatedPublications: (row.related_publications ?? []).map(mapListItem),
    comments: (row.comments ?? []).map(mapCommentTree),
    commentsCount: row.comments_count ?? 0,
  };
}

export type ListPublicationsParams = {
  page?: number;
  pageSize?: number;
  type?: string;
  category?: string;
  tag?: string;
  language?: string;
  featured?: boolean;
  access?: string;
  search?: string;
  ordering?: string;
  /** Staff (admin / fournisseur) only — filters API list when authenticated */
  status?: string;
};

export type StaffPublicationWritePayload = {
  title: string;
  subtitle?: string;
  excerpt?: string;
  content: string;
  pub_type: string;
  category: string | null;
  language: string;
  status: string;
  access: string;
  is_featured?: boolean;
  is_newsletter?: boolean;
  author_name?: string;
  cover_alt?: string;
  meta_title?: string;
  meta_description?: string;
};

function staffWritePayloadToFormData(payload: StaffPublicationWritePayload): FormData {
  const fd = new FormData();
  fd.append("title", payload.title);
  if (payload.subtitle !== undefined) fd.append("subtitle", payload.subtitle);
  if (payload.excerpt !== undefined) fd.append("excerpt", payload.excerpt);
  fd.append("content", payload.content);
  fd.append("pub_type", payload.pub_type);
  if (payload.category) fd.append("category", payload.category);
  fd.append("language", payload.language);
  fd.append("status", payload.status);
  fd.append("access", payload.access);
  fd.append("is_featured", payload.is_featured ? "true" : "false");
  fd.append("is_newsletter", payload.is_newsletter ? "true" : "false");
  if (payload.author_name !== undefined) fd.append("author_name", payload.author_name);
  if (payload.cover_alt !== undefined) fd.append("cover_alt", payload.cover_alt);
  if (payload.meta_title !== undefined) fd.append("meta_title", payload.meta_title);
  if (payload.meta_description !== undefined) fd.append("meta_description", payload.meta_description);
  return fd;
}

function staffPartialPayloadToFormData(payload: Partial<StaffPublicationWritePayload>): FormData {
  const fd = new FormData();
  if (payload.title !== undefined) fd.append("title", payload.title);
  if (payload.subtitle !== undefined) fd.append("subtitle", payload.subtitle);
  if (payload.excerpt !== undefined) fd.append("excerpt", payload.excerpt);
  if (payload.content !== undefined) fd.append("content", payload.content);
  if (payload.pub_type !== undefined) fd.append("pub_type", payload.pub_type);
  if (payload.category !== undefined) {
    fd.append("category", payload.category ?? "");
  }
  if (payload.language !== undefined) fd.append("language", payload.language);
  if (payload.status !== undefined) fd.append("status", payload.status);
  if (payload.access !== undefined) fd.append("access", payload.access);
  if (payload.is_featured !== undefined) fd.append("is_featured", payload.is_featured ? "true" : "false");
  if (payload.is_newsletter !== undefined) fd.append("is_newsletter", payload.is_newsletter ? "true" : "false");
  if (payload.author_name !== undefined) fd.append("author_name", payload.author_name);
  if (payload.cover_alt !== undefined) fd.append("cover_alt", payload.cover_alt);
  if (payload.meta_title !== undefined) fd.append("meta_title", payload.meta_title);
  if (payload.meta_description !== undefined) fd.append("meta_description", payload.meta_description);
  return fd;
}

/** Staff-only: upload image for inline HTML; returns absolute URL. */
export async function uploadPublicationInlineImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const { data } = await api.post<{ url: string }>("/publications/upload-image/", fd);
  return data.url;
}

export async function listPublications(params?: ListPublicationsParams): Promise<PublicationListResult> {
  const { data } = await api.get<DrfPaged<ListApi>>("/publications/", {
    params: {
      page: params?.page,
      page_size: params?.pageSize,
      type: params?.type,
      category: params?.category,
      tag: params?.tag,
      language: params?.language,
      featured: params?.featured,
      access: params?.access,
      search: params?.search,
      ordering: params?.ordering,
      status: params?.status,
    },
  });
  return {
    items: data.results.map(mapListItem),
    total: data.count,
    pages: typeof data.pages === "number" ? data.pages : undefined,
    hasNext: Boolean(data.next),
    hasPrevious: Boolean(data.previous),
    nextPage: parseDrfPageFromUrl(data.next),
    previousPage: parseDrfPageFromUrl(data.previous),
  };
}

export async function listCategories(): Promise<PublicationCategory[]> {
  const { data } = await api.get<DrfPaged<CategoryApi> | CategoryApi[]>("/publications/categories/");
  if (Array.isArray(data)) {
    return data.map((c) => mapCategory(c)).filter((x): x is PublicationCategory => x !== null);
  }
  return data.results.map((c) => mapCategory(c)).filter((x): x is PublicationCategory => x !== null);
}

export async function getPublicationBySlug(slug: string): Promise<PublicationDetail> {
  const { data } = await api.get<DetailApi>(`/publications/${slug}/`);
  return mapDetail(data);
}

export async function createStaffPublication(
  payload: StaffPublicationWritePayload,
  options?: { coverFile?: File | null }
): Promise<string> {
  const cover = options?.coverFile ?? null;
  if (cover) {
    const fd = staffWritePayloadToFormData(payload);
    fd.append("cover_image", cover);
    const { data } = await api.post<{ slug: string }>("/publications/", fd);
    return data.slug;
  }
  const { data } = await api.post<{ slug: string }>("/publications/", {
    ...payload,
    category: payload.category || null,
  });
  return data.slug;
}

export async function updateStaffPublication(
  slug: string,
  payload: Partial<StaffPublicationWritePayload>,
  options?: { coverFile?: File | null }
): Promise<void> {
  const cover = options?.coverFile ?? null;
  if (cover) {
    const fd = staffPartialPayloadToFormData(payload);
    fd.append("cover_image", cover);
    await api.patch(`/publications/${slug}/`, fd);
    return;
  }
  const body = { ...payload };
  if (payload.category !== undefined) {
    body.category = payload.category || null;
  }
  await api.patch(`/publications/${slug}/`, body);
}

export async function publishStaffPublication(slug: string): Promise<void> {
  await api.post(`/publications/${slug}/publish/`);
}

/** Admin only — permanent deletion (associated comments removed, see backend CASCADE). */
export async function deleteStaffPublication(slug: string): Promise<void> {
  await api.delete(`/publications/${slug}/`);
}

export async function getRelatedPublications(slug: string): Promise<PublicationListItem[]> {
  try {
    const { data } = await api.get<ListApi[] | DrfPaged<ListApi>>(`/publications/${slug}/related/`);
    if (Array.isArray(data)) return data.map(mapListItem);
    return data.results.map(mapListItem);
  } catch {
    return [];
  }
}

export async function listPublicationComments(slug: string): Promise<PublicationComment[]> {
  const { data } = await api.get<CommentApi[] | DrfPaged<CommentApi>>(`/publications/${slug}/comments/`);
  if (Array.isArray(data)) return data.map(mapCommentTree);
  return data.results.map(mapCommentTree);
}

export async function createPublicationComment(
  slug: string,
  payload: { authorName: string; authorEmail: string; content: string; parent?: string | null }
): Promise<void> {
  await api.post(`/publications/${slug}/comments/`, {
    author_name: payload.authorName,
    author_email: payload.authorEmail,
    content: payload.content,
    parent: payload.parent ?? undefined,
  });
}

export async function subscribeNewsletter(payload: {
  email: string;
  firstName?: string;
  language?: string;
}): Promise<void> {
  await api.post("/publications/newsletter/subscribe/", {
    email: payload.email,
    first_name: payload.firstName ?? "",
    language: payload.language ?? "fr",
  });
}

export type PublicationStatsApi = {
  total: number;
  publie: number;
  brouillon: number;
  planifie: number;
  archive: number;
  total_views: number;
  total_shares: number;
  this_month: number;
  by_type: { pub_type: string; count: number; views: number | null }[];
  by_category: { category__name: string; category__slug: string; count: number }[];
  by_language: { language: string; count: number }[];
  top_5: ListApi[];
};

/** Requires fournisseur/admin JWT. */
export async function getPublicationStats(): Promise<PublicationStatsApi> {
  const { data } = await api.get<PublicationStatsApi>("/publications/stats/");
  return data;
}

export async function unsubscribeNewsletter(payload: { email?: string; token?: string }): Promise<void> {
  await api.post("/publications/newsletter/unsubscribe/", payload);
}

export async function moderatePublicationComment(
  commentId: string,
  status: "approuve" | "rejete" | "spam"
): Promise<void> {
  await api.post(`/publications/comments/${commentId}/moderate/`, { status });
}
