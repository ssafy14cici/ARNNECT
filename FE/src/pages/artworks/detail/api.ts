// FE/src/pages/artworks/detail/api.ts
import { http } from "../../../shared/api/http";
import { isObject } from "./utils";
import {
  mapArtworkDetail,
  mapCommentResponseList,
  mapReviewList,
  parseFavoriteToggleResult,
  mapSingleComment,
  type ArtworkDetailData,
  type LocalComment,
  type ReviewSummary,
  type FavoriteToggleResult,
} from "./mappers";

const ARTWORK_DETAIL_PATH = "/api/v1/artworks";
const REVIEWS_BY_ARTWORK_PATH = "/api/v1/reviews";
const FAVORITES_TOGGLE_PATH = "/api/v1/favorites";
const COMMENTS_PATH = "/api/v1/comments";

const COMMENT_TARGET_TYPE = "ARTWORK" as const;

// -----------------------------
// helpers: axios + envelope unwrap
// -----------------------------
function unwrapAxiosData(res: unknown): unknown {
  // axios response면 res.data
  return isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
}

type ApiEnvelopeLike = {
  success: boolean;
  data: unknown;
  message?: unknown;
  code?: unknown;
};

function isEnvelope(v: unknown): v is ApiEnvelopeLike {
  return isObject(v) && "success" in v && "data" in v;
}

function toStr(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

/**
 * ✅ 서버가 envelope({success,data,message})로 주는 경우:
 * - success=false면 여기서 throw 해서 "null(작품없음)"로 오해하지 않게 함
 * - success=true면 data만 반환
 * ✅ envelope 아니면 그대로 반환
 */
function unwrapApiPayload(res: unknown): unknown {
  const raw = unwrapAxiosData(res);

  if (isEnvelope(raw)) {
    if (raw.success === false) {
      const msg = toStr(raw.message, "서버 오류가 발생했습니다.");
      const code = toStr(raw.code, "");
      throw new Error(code ? `${code}: ${msg}` : msg);
    }
    return raw.data;
  }

  return raw;
}

// -----------------------------
// Artwork Detail
// -----------------------------
const ARTWORK_DETAIL_CANDIDATES = [
  (id: string) => `${ARTWORK_DETAIL_PATH}/${id}`,
  (id: string) => `${ARTWORK_DETAIL_PATH}/${id}/detail`,
  (id: string) => `${ARTWORK_DETAIL_PATH}/detail/${id}`,
] as const;

export async function fetchArtworkDetail(artworkId: string): Promise<ArtworkDetailData | null> {
  let lastErr: unknown = null;

  for (const makeUrl of ARTWORK_DETAIL_CANDIDATES) {
    const url = makeUrl(artworkId);

    try {
      const res = await http.get(url);
      const payload = unwrapApiPayload(res);
      return mapArtworkDetail(payload);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("작품 상세 조회 실패");
}

// -----------------------------
// Reviews
// -----------------------------
export async function fetchReviewsByArtworkId(artworkId: number): Promise<ReviewSummary[]> {
  const res = await http.get(
    `${REVIEWS_BY_ARTWORK_PATH}?artworkId=${encodeURIComponent(String(artworkId))}`,
  );
  const payload = unwrapApiPayload(res);
  return mapReviewList(payload);
}

// -----------------------------
// Favorite Toggle
// -----------------------------
export async function toggleFavoriteOnServer(artworkId: number): Promise<FavoriteToggleResult> {
  const res = await http.post(FAVORITES_TOGGLE_PATH, { artworkId });
  const payload = unwrapApiPayload(res);
  return parseFavoriteToggleResult(payload);
}

/**
 * ✅ 댓글 목록(확정 스펙)
 * GET /api/v1/comments?targetId={targetId}&targetType=ARTWORK
 *
 * + 혹시 서버가 예전 파라미터도 유지 중이면 fallback
 */
export async function fetchArtworkComments(artworkId: number): Promise<LocalComment[]> {
  const tryCalls: Array<() => Promise<LocalComment[]>> = [
    // ✅ 1순위: 확정 스펙
    async () => {
      const res = await http.get(COMMENTS_PATH, {
        params: {
          targetId: artworkId,
          targetType: COMMENT_TARGET_TYPE,
        },
      });
      const payload = unwrapApiPayload(res);
      return mapCommentResponseList(payload);
    },

    // fallback (필요 없으면 지워도 됨)
    async () => {
      const url = `${COMMENTS_PATH}?target=${encodeURIComponent(COMMENT_TARGET_TYPE)}&id=${encodeURIComponent(
        String(artworkId),
      )}`;
      const res = await http.get(url);
      const payload = unwrapApiPayload(res);
      return mapCommentResponseList(payload);
    },
    async () => {
      const url = `${COMMENTS_PATH}?targetType=${encodeURIComponent(COMMENT_TARGET_TYPE)}&targetId=${encodeURIComponent(
        String(artworkId),
      )}`;
      const res = await http.get(url);
      const payload = unwrapApiPayload(res);
      return mapCommentResponseList(payload);
    },
  ];

  let lastErr: unknown = null;

  for (const call of tryCalls) {
    try {
      return await call();
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("댓글 목록 조회 실패");
}

export async function createCommentOnServer(args: {
  artworkId: number;
  content: string;
  parentCommentId?: number | null;
}): Promise<LocalComment | null> {
  const res = await http.post(COMMENTS_PATH, {
    targetType: COMMENT_TARGET_TYPE,
    targetId: args.artworkId,
    content: args.content,
    parentCommentId: args.parentCommentId ?? null,
  });

  const payload = unwrapApiPayload(res);
  return mapSingleComment(payload);
}

export async function updateCommentOnServer(commentId: string, content: string): Promise<void> {
  // 서버가 envelope로 응답해도, 에러면 throw되게 처리하려면 unwrapApiPayload를 적용하려면
  // res를 받아서 unwrapApiPayload(res) 호출하면 됨. (PUT이 바디 없이 끝나면 지금처럼 둬도 OK)
  const res = await http.put(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`, { content });
  unwrapApiPayload(res);
}

export async function deleteCommentOnServer(commentId: string): Promise<void> {
  const res = await http.delete(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`);
  unwrapApiPayload(res);
}
