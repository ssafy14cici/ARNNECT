import { useState } from "react";

export const CommentForm = ({ onAdd, placeholder, isReply = false }: any) => {
  const [text, setText] = useState("");
  return (
    <div style={{ 
      display: "flex", gap: 8, padding: "8px 12px", 
      background: "#f9f9f9", borderRadius: 12, border: "1px solid #f0f0f0" 
    }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, padding: "10px", background: "transparent", border: "none", outline: "none" }}
      />
      <button 
        onClick={() => { if(text.trim()) { onAdd(text); setText(""); } }}
        style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}
      >
        등록
      </button>
    </div>
  );
};