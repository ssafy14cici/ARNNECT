import { http } from "../../../shared/api/http";
import { isObject, pickEnvelopeData } from "./utils";
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

function unwrapAxiosData(res: unknown): unknown {
  // axios는 보통 { data: ... } 형태
  return isObject(res) && "data" in res ? (res as { data: unknown }).data : res;
}

export async function fetchArtworkDetail(artworkId: string): Promise<ArtworkDetailData | null> {
  const res = await http.get(`${ARTWORK_DETAIL_PATH}/${artworkId}`);
  const payload = unwrapAxiosData(res);
  return mapArtworkDetail(payload);
}

export async function fetchReviewsByArtworkId(artworkId: number): Promise<ReviewSummary[]> {
  const res = await http.get(`${REVIEWS_BY_ARTWORK_PATH}?artworkId=${encodeURIComponent(String(artworkId))}`);
  const payload = unwrapAxiosData(res);
  return mapReviewList(payload);
}

export async function toggleFavoriteOnServer(artworkId: number): Promise<FavoriteToggleResult> {
  const res = await http.post(FAVORITES_TOGGLE_PATH, { artworkId });
  const payload = unwrapAxiosData(res);
  return parseFavoriteToggleResult(payload);
}

/**
 * 댓글 목록: BE 쿼리 파라미터가 흔히 2~3가지 형태로 갈려서,
 * 후보 URL을 순차로 시도해서 “하나라도 성공”하면 그 결과를 씀.
 */
export async function fetchArtworkComments(artworkId: number): Promise<LocalComment[]> {
  const tryUrls = [
    `${COMMENTS_PATH}?target=${encodeURIComponent(COMMENT_TARGET_TYPE)}&id=${encodeURIComponent(String(artworkId))}`,
    `${COMMENTS_PATH}?targetType=${encodeURIComponent(COMMENT_TARGET_TYPE)}&targetId=${encodeURIComponent(String(artworkId))}`,
    `${COMMENTS_PATH}?targetType=${encodeURIComponent(COMMENT_TARGET_TYPE)}&targetId=${encodeURIComponent(String(artworkId))}&page=0&size=200`,
  ];

  let lastErr: unknown = null;

  for (const url of tryUrls) {
    try {
      const res = await http.get(url);
      const payload = unwrapAxiosData(res);
      return mapCommentResponseList(payload);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr;
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

  const payload = unwrapAxiosData(res);
  return mapSingleComment(payload);
}

export async function updateCommentOnServer(commentId: string, content: string): Promise<void> {
  await http.put(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`, { content });
}

export async function deleteCommentOnServer(commentId: string): Promise<void> {
  await http.delete(`${COMMENTS_PATH}/${encodeURIComponent(commentId)}`);
}
