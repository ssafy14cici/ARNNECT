// FE/src/features/comments/ui/CommentsSection.tsx
import { useEffect, useMemo, useState } from "react";
import { commentsApi, subscribeCommentsUpdated } from "../api";
import type { Comment, CommentId, CommentTargetType, ProfilePathFn } from "../model/types";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { useAuthStore } from "../../auth/store";
import { USE_MOCK } from "../../../shared/config/env";

type Props = {
  targetType: CommentTargetType;
  targetId: number;
  profilePath: ProfilePathFn;
};

export default function CommentsSection({ targetType, targetId, profilePath }: Props) {
  const me = useAuthStore((s) => s.user);
  const isLoggedIn = !!me?.memberUuid;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const disabled = useMemo(() => (!USE_MOCK ? !isLoggedIn : false), [isLoggedIn]);

  const load = async () => {
    setLoading(true);
    try {
      const list = await commentsApi.list(targetType, targetId);
      setComments(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsub = subscribeCommentsUpdated(load);
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId]);

  const onDelete = async (id: CommentId) => {
    if (disabled) return alert("로그인 후 이용해주세요.");
    await commentsApi.remove(id);
  };

  const onUpdate = async (id: CommentId, content: string) => {
    if (disabled) return alert("로그인 후 이용해주세요.");
    await commentsApi.update(id, { content });
  };

  const onAddReply = async (parentId: CommentId, content: string) => {
    if (disabled) return alert("로그인 후 이용해주세요.");
    await commentsApi.create({ targetType, targetId, content, parentId });
  };

  const onAddRoot = async (content: string) => {
    if (disabled) return alert("로그인 후 이용해주세요.");
    await commentsApi.create({ targetType, targetId, content, parentId: null });
  };

  return (
    <section className="comments-section">
      <CommentForm
        onAdd={onAddRoot}
        placeholder={disabled ? "로그인 후 댓글을 작성할 수 있어요." : "Share your thoughts..."}
        disabled={disabled || loading}
      />

      <CommentList
        comments={comments}
        onDelete={onDelete}
        onUpdate={onUpdate}
        onAddReply={onAddReply}
        profilePath={profilePath}
      />
    </section>
  );
}
