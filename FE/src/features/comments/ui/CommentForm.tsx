// FE/src/features/artwork/ui/comments/CommentForm.tsx

import { useState } from "react";

type Props = {
  onAdd: (text: string) => void;
  placeholder?: string;
  isReply?: boolean;
};

export const CommentForm = ({ onAdd, placeholder, isReply = false }: Props) => {
  const [text, setText] = useState("");

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText("");
  };

  return (
    <div className="comment-form">
      <input
        className="comment-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={placeholder ?? (isReply ? "Write a reply..." : "Share your thoughts...")}
      />
      <button className="comment-submit-btn" onClick={submit}>
        {isReply ? "Reply" : "Post"}
      </button>
    </div>
  );
};