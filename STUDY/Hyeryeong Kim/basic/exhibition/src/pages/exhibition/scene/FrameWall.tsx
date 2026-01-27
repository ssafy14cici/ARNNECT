import Frame from "./Frame";

export type FrameItem = {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
};

type Props = {
  items: FrameItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export default function FrameWall({ items, selectedId, onSelect }: Props) {
  return (
    <group>
      {items.map((it) => (
        <Frame
          key={it.id}
          id={it.id}
          url={it.url}
          position={it.position}
          rotation={it.rotation}
          size={it.size}
          selected={selectedId === it.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
