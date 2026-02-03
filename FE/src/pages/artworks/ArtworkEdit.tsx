// FE/src/pages/artworks/ArtworkEdit.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { http } from "../../shared/api/http";
import ArtworkForm from "../../features/artworks/ui/ArtworkForm";
import { updateArtwork, deleteArtwork } from "../../features/artworks/api";
import { FIXED_FIELD_ID } from "../../features/artworks/model/constants";
import type { ArtworkUpdateReq } from "../../features/artworks/model/types";

type Detail = {
  title?: string;
  description?: string;
  genreId?: number;
  productionDate?: string; // "YYYY-MM-DD"
  size?: string;
  tags?: string[];
};

export default function ArtworkEdit() {
  const nav = useNavigate();
  const { artworkId = "" } = useParams<{ artworkId: string }>();

  const [loading, setLoading] = useState(false);
  const [initial, setInitial] = useState<Detail | null>(null);

  const normalizedId = useMemo(() => String(artworkId).trim(), [artworkId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!normalizedId) return;
      setLoading(true);
      try {
        const res = await http.get(`/api/v1/artworks/${normalizedId}`);
        const payload = (res && typeof res === "object" && "data" in res) ? (res as any).data : res;

        // ⚠️ 여기 매핑은 실제 DetailArtworkResponse 필드명에 맞춰 조정 필요
        const d: Detail = {
          title: payload?.title ?? "",
          description: payload?.description ?? "",
          genreId: payload?.genreId ?? undefined,
          productionDate: payload?.productionDate ?? "", // LocalDate면 보통 "YYYY-MM-DD"
          size: payload?.size ?? "",
          tags: payload?.tags ?? [],
        };

        if (!cancelled) setInitial(d);
      } catch (e) {
        console.error(e);
        if (!cancelled) setInitial(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedId]);

  const onSave = async (form: any) => {
    // form을 ArtworkUpdateReq로 맞춰서 들어오게(ArtworkForm 수정 후)
    const req: ArtworkUpdateReq = {
      title: form.title,
      description: form.description,
      fieldId: FIXED_FIELD_ID,
      genreId: form.genreId,
      productionDate: form.productionDate,
      size: form.size,
      tags: form.tags,
      image: form.image, // 선택
    };

    setLoading(true);
    try {
      await updateArtwork(normalizedId, req);
      alert("수정되었습니다.");
      nav(-1);
    } catch (e) {
      console.error(e);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      await deleteArtwork(normalizedId);
      alert("삭제되었습니다.");
      nav(-1);
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!initial && !loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "120px 24px" }}>
        <h2 style={{ margin: 0 }}>Artwork Edit</h2>
        <p style={{ marginTop: 12 }}>작품 정보를 불러오지 못했습니다.</p>
        <button type="button" onClick={() => nav(-1)} style={{ marginTop: 16 }}>
          뒤로
        </button>
      </div>
    );
  }

  return (
    <div className="post-create-page theme-artist">
      <div className="pc-container">
        <header className="pc-header" style={{ display: "flex", justifyContent: "space-between" }}>
          <h1 className="pc-title">Edit Artwork</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onDelete} disabled={loading}>
              삭제
            </button>
            <button type="button" onClick={() => nav(-1)} disabled={loading}>
              닫기
            </button>
          </div>
        </header>

        {/* ✅ ArtworkForm이 edit 모드/initial 지원하게 수정되어 있어야 함 */}
        <ArtworkForm submitting={loading} onSubmit={onSave} initial={initial as any} />
      </div>
    </div>
  );
}
