import { useParams } from "react-router-dom";

export default function PostCreate() {
  const { writerRole } = useParams<{ writerRole: "user" | "artist" }>();

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>
        {writerRole === "artist" ? "예술가 글쓰기" : "유저 글쓰기"}
      </h2>

      {writerRole === "artist" ? (
        <div>TODO: 예술가 글쓰기 폼(가이드/필드)</div>
      ) : (
        <div>TODO: 유저 글쓰기 폼(가이드/필드)</div>
      )}
    </div>
  );
}
