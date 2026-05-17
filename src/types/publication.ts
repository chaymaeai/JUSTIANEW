export type PublicationPubType =
  | "article"
  | "etude"
  | "bulletin"
  | "analyse"
  | "guide"
  | "jurisprudence"
  | "rapport";

export type PublicationStatus = "brouillon" | "revision" | "planifie" | "publie" | "archive";
export type PublicationAccess = "public" | "members" | "premium";
export type PublicationLanguage = "fr" | "ar" | "en";

export interface PublicationCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  publicationsCount?: number;
}

export interface PublicationTag {
  id: string;
  name: string;
  slug: string;
}

export interface PublicationAuthor {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
}

export interface PublicationListItem {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  pubType: PublicationPubType;
  pubTypeDisplay: string;
  category: PublicationCategory | null;
  tags: PublicationTag[];
  authorName: string;
  coverImage: string | null;
  coverAlt: string;
  language: PublicationLanguage;
  status: PublicationStatus;
  access: PublicationAccess;
  isFeatured: boolean;
  publishedAt: string | null;
  readingTime: number;
  viewsCount: number;
  hasPdf: boolean;
}

export interface PublicationDetail extends PublicationListItem {
  content: string;
  metaTitle: string;
  metaDescription: string;
  author: PublicationAuthor | null;
  authorBio: string;
  sharesCount: number;
  relatedPublications: PublicationListItem[];
  comments: PublicationComment[];
  commentsCount: number;
}

export type CommentModerationStatus = "en_attente" | "approuve" | "rejete" | "spam";

export interface PublicationComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  status: CommentModerationStatus;
  replies: PublicationComment[];
}

export interface PublicationListResult {
  items: PublicationListItem[];
  total: number;
  /** From DRF StandardPagination `pages` when present */
  pages?: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage: number | null;
  previousPage: number | null;
}

/** Short aliases */
export type PubType = PublicationPubType;
export type PubStatus = PublicationStatus;
export type PubAccess = PublicationAccess;
export type PubLanguage = PublicationLanguage;
export type Category = PublicationCategory;
export type Tag = PublicationTag;
export type Comment = PublicationComment;

export interface PublicationFilters {
  search?: string;
  type?: PublicationPubType | "";
  category?: string;
  tag?: string;
  language?: PublicationLanguage | "";
  page?: number;
}
