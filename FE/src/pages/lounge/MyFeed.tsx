import { useNavigate } from "react-router-dom";

type Item = {
  id: string;
  imageUrl: string;
  title: string;
};

const items: Item[] = [
  { id: "1", imageUrl: "/art/a1.jpg", title: "Artwork 1" },
  { id: "2", imageUrl: "/art/a2.jpg", title: "Artwork 2" },
  { id: "3", imageUrl: "/art/a3.jpg", title: "Artwork 3" },
  { id: "4", imageUrl: "/art/a4.jpg", title: "Artwork 4" },
];

export default function MyFeed() {
  const nav = useNavigate();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 18,
      }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => nav(`/artworks/${it.id}`)}
          style={{
            border: "none",
            padding: 0,
            borderRadius: 18,
            overflow: "hidden",
            cursor: "pointer",
          }}
        >
          <img
            src={it.imageUrl}
            alt={it.title}
            style={{
              width: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
            //   filter: "grayscale(1)",
            }}
          />
        </button>
      ))}
    </div>
  );
}
