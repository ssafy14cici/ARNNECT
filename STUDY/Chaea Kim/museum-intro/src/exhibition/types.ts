// src/exhibition/types.ts

export type RoomSet = {
  back: string[];
  left: string[];
  right: string[];
  slide: {
    nameLines: [string, string];
    title: string;
    roomLabel: string;
    date: string;
  };
  subject?: string;
  location?: string;
};

export type Side = "back" | "left" | "right";

export type OpenArtworkPayload = {
  roomIndex: number;
  side: Side;
  src: string;
};

export type ExhibitionOptions = {
  defaultRooms: RoomSet[];
  onExit: () => void;
  onOpenArtwork?: (payload: OpenArtworkPayload) => void;
};

export type ExhibitionApi = {
  show(): void;
  hide(): void;
  setRooms(rooms: RoomSet[]): void;
};
