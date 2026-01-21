// src/data/mockFeeds.ts

export interface Feed {
  id: number;
  title: string;
  artist: string;
  artistProfile: string;
  thumbnail: string;
  likes: number;
  views: number;
  createdAt: string;
}

export const mockFeeds: Feed[] = [
  {
    id: 1,
    title: "봄날의 풍경",
    artist: "김예술",
    artistProfile: "https://i.pravatar.cc/150?img=1",
    thumbnail: "https://picsum.photos/seed/art1/400/300",
    likes: 234,
    views: 1205,
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    title: "도시의 밤",
    artist: "이작가",
    artistProfile: "https://i.pravatar.cc/150?img=2",
    thumbnail: "https://picsum.photos/seed/art2/400/300",
    likes: 567,
    views: 2890,
    createdAt: "2024-01-14"
  },
  {
    id: 3,
    title: "추상의 세계",
    artist: "박화가",
    artistProfile: "https://i.pravatar.cc/150?img=3",
    thumbnail: "https://picsum.photos/seed/art3/400/300",
    likes: 189,
    views: 945,
    createdAt: "2024-01-13"
  },
  {
    id: 4,
    title: "바다의 속삭임",
    artist: "최미술",
    artistProfile: "https://i.pravatar.cc/150?img=4",
    thumbnail: "https://picsum.photos/seed/art4/400/300",
    likes: 421,
    views: 1678,
    createdAt: "2024-01-12"
  },
  {
    id: 5,
    title: "숲속의 정령",
    artist: "정아티스트",
    artistProfile: "https://i.pravatar.cc/150?img=5",
    thumbnail: "https://picsum.photos/seed/art5/400/300",
    likes: 892,
    views: 3456,
    createdAt: "2024-01-11"
  },
  {
    id: 6,
    title: "황혼의 기억",
    artist: "강드로잉",
    artistProfile: "https://i.pravatar.cc/150?img=6",
    thumbnail: "https://picsum.photos/seed/art6/400/300",
    likes: 312,
    views: 1534,
    createdAt: "2024-01-10"
  },
  {
    id: 7,
    title: "빛과 그림자",
    artist: "윤페인팅",
    artistProfile: "https://i.pravatar.cc/150?img=7",
    thumbnail: "https://picsum.photos/seed/art7/400/300",
    likes: 654,
    views: 2341,
    createdAt: "2024-01-09"
  },
  {
    id: 8,
    title: "꿈의 조각",
    artist: "임크리에이터",
    artistProfile: "https://i.pravatar.cc/150?img=8",
    thumbnail: "https://picsum.photos/seed/art8/400/300",
    likes: 445,
    views: 1876,
    createdAt: "2024-01-08"
  },
  {
    id: 9,
    title: "시간의 흐름",
    artist: "한아트",
    artistProfile: "https://i.pravatar.cc/150?img=9",
    thumbnail: "https://picsum.photos/seed/art9/400/300",
    likes: 723,
    views: 2987,
    createdAt: "2024-01-07"
  },
  {
    id: 10,
    title: "영혼의 울림",
    artist: "오작품",
    artistProfile: "https://i.pravatar.cc/150?img=10",
    thumbnail: "https://picsum.photos/seed/art10/400/300",
    likes: 289,
    views: 1234,
    createdAt: "2024-01-06"
  },
  {
    id: 11,
    title: "자연의 선율",
    artist: "서예술가",
    artistProfile: "https://i.pravatar.cc/150?img=11",
    thumbnail: "https://picsum.photos/seed/art11/400/300",
    likes: 567,
    views: 2145,
    createdAt: "2024-01-05"
  },
  {
    id: 12,
    title: "우주의 신비",
    artist: "신창작",
    artistProfile: "https://i.pravatar.cc/150?img=12",
    thumbnail: "https://picsum.photos/seed/art12/400/300",
    likes: 834,
    views: 3421,
    createdAt: "2024-01-04"
  }
];