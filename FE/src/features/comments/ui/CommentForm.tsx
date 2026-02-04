import { useState } from "react";

type Props = {
  onAdd: (text: string) => void | Promise<void>;
  placeholder?: string;
  isReply?: boolean;
  disabled?: boolean;
};

export const CommentForm = ({ onAdd, placeholder, isReply = false, disabled = false }: Props) => {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (disabled || submitting) return;

    const value = text.trim();
    if (!value) return;

    try {
      setSubmitting(true);
      await onAdd(value);
      setText("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comment-form">
      <input
        className="comment-input"
        value={text}
        disabled={disabled || submitting}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder ?? (isReply ? "Write a reply..." : "Share your thoughts...")}
      />
      <button
        type="button"
        className="comment-submit-btn"
        disabled={disabled || submitting}
        onClick={submit}
      >
        {submitting ? "..." : isReply ? "Reply" : "Post"}
      </button>
    </div>
  );
};
