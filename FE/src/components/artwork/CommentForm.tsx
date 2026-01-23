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
    <div
      style={{
        display: "flex",
        gap: 8,
        padding: "8px 12px",
        background: "#f9f9f9",
        borderRadius: 12,
        border: "1px solid #f0f0f0",
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={placeholder ?? (isReply ? "답글을 입력하세요..." : "댓글을 입력하세요...")}
        style={{
          flex: 1,
          padding: "10px",
          background: "transparent",
          border: "none",
          outline: "none",
        }}
      />
      <button
        onClick={submit}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontWeight: "600",
          whiteSpace: "nowrap",
        }}
      >
        등록
      </button>
    </div>
  );
};
