// FE/src/features/posts/api.ts
import { http } from "../../shared/api/http";
import { createPost, setMe, type PostRole } from "../feed/mockData";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

type AuthorCtx = {
  id: string;
  name: string;
  role: PostRole;
};

export interface ReviewCreateReq {
  title: string;
  content: string;
  artworkId: number;
  tags: string[];
  imageFile: File;
  author: AuthorCtx;
}

export interface ArtworkCreateReq {
  title: string;
  description: string;
  field: string;
  genre: string;
  productionDate: number;
  size: string;
  tags: string[];
  imageFile: File;
  author: AuthorCtx;
}

function appendTags(fd: FormData, tags: string[]) {
  tags.forEach((t) => fd.append("tags", t));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("파일 읽기에 실패했습니다."));
    fr.readAsDataURL(file);
  });
}

export async function createReview(data: ReviewCreateReq) {
  if (USE_MOCK) {
    const dataUrl = await fileToDataUrl(data.imageFile);

    setMe({ id: data.author.id, name: data.author.name, role: data.author.role });

    const post = createPost({
      authorId: data.author.id,
      authorName: data.author.name,
      role: data.author.role,
      title: data.title,
      content: data.content,
      imageUrls: [dataUrl],
      tags: data.tags,
      meta: { kind: "review", artworkId: data.artworkId },
    });

    return { ok: true, id: post.id };
  }

  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("content", data.content);
  fd.append("artworkId", String(data.artworkId));
  appendTags(fd, data.tags);
  fd.append("image", data.imageFile);

  const res = await http.post("/api/v1/reviews", fd);
  return res.data;
}

export async function createArtwork(data: ArtworkCreateReq) {
  if (USE_MOCK) {
    const dataUrl = await fileToDataUrl(data.imageFile);

    setMe({ id: data.author.id, name: data.author.name, role: data.author.role });

    const post = createPost({
      authorId: data.author.id,
      authorName: data.author.name,
      role: data.author.role,
      title: data.title,
      content: data.description || "(작품 설명 없음)",
      imageUrls: [dataUrl],
      tags: data.tags,
      meta: {
        kind: "artwork",
        field: data.field,
        genre: data.genre,
        productionDate: data.productionDate,
        size: data.size,
      },
    });

    return { ok: true, id: post.id };
  }

  const fd = new FormData();
  fd.append("title", data.title);
  fd.append("description", data.description);
  fd.append("field", data.field);
  fd.append("genre", data.genre);
  fd.append("productionDate", String(data.productionDate));
  fd.append("size", data.size);
  appendTags(fd, data.tags);
  fd.append("image", data.imageFile);

  const res = await http.post("/api/v1/artworks", fd);
  return res.data;
}

// ✅ legacy compat (features/feed/api.ts에서 참조)
export const __mock = {} as any;
