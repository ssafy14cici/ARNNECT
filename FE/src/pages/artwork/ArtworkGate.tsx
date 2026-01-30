// FE/src/pages/artwork/ArtworkGate.tsx
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import ArtworkDetail from "./ArtworkDetail";
import FeedDetail from "../feed/FeedDetail";

// Search가 쓰는 작품 데이터 (경로는 너 프로젝트 기준으로 맞춰줘)
import { artworks as rawArtworks } from "../../features/artwork/data";

type Artwork = { id: string };

export default function ArtworkGate() {
  const { id = "" } = useParams();

  const isArtworkId = useMemo(() => {
    const list = rawArtworks as unknown as Artwork[];
    return list.some((a) => String(a.id) === String(id));
  }, [id]);

  // ✅ 작품이면 기존 ArtworkDetail
  if (isArtworkId) return <ArtworkDetail />;

  // ✅ 아니면(=uuid 등) 로컬 포스트 디테일(FeedDetail)
  return <FeedDetail />;
}
