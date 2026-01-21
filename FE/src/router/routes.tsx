// src/router/router.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import Guard from "../components/common/Guard";

import Home from "../pages/home/Home";
import ArtistGo from "../pages/artistGo/ArtistGo";
import Search from "../pages/search/Search";
import Recover from "../pages/auth/Recover";

import Lounge from "../pages/lounge/Lounge";
import MyFeed from "../pages/lounge/MyFeed";
import MyCollection from "../pages/lounge/MyCollection";
import MyTaste from "../pages/lounge/MyTaste";
import MyQuiz from "../pages/lounge/MyQuiz";
import Feed from "../pages/feed/Feed";
import Profile from "../pages/profile/Profile";
import ProfileFeed from "../pages/profile/ProfileFeed";
import ProfileCollection from "../pages/profile/ProfileCollection";

import ArtworkDetail from "../pages/artwork/ArtworkDetail";

import PostDetail from "../pages/posts/PostDetail";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import NotFound from "../pages/notfound/NotFound";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      // ✅ 공개
      { path: "/", element: <Home /> },
      {path: "home", element: <Home /> },
      { path: "artist-go", element: <ArtistGo /> },
      { path: "search", element: <Search /> },
      { path: "recover", element: <Recover /> },

      // ✅ Auth (공개)
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },

      // 🔒 보호 (로그인 필요)
      {
        element: <Guard requireAuth />,
        children: [
          // ✅ 메인 혼합 피드
          {path: "feed", element: <Feed /> },

          // ✅ 게시글 상세
          { path: "posts/:id", element: <PostDetail /> },

          // ✅ Lounge (내 전용 공간)
          {
            path: "lounge",
            element: <Lounge />,
            children: [
              { index: true, element: <MyFeed /> }, //lounge
              { path: "feed", element: <MyFeed /> }, //lounge/feed
              { path: "collection", element: <MyCollection /> },
              { path: "taste", element: <MyTaste /> },
              { path: "quiz", element: <MyQuiz /> },
            ],
          },

          // Profile (타인이 보는 공개 프로필도 지금은 로그인 필요라고 했으니 여기 둠)
          {
            path: "profile/:id",
            element: <Profile />,
            children: [
              { index: true, element: <Navigate to="feed" relative="path" replace /> },
              { path: "feed", element: <ProfileFeed /> },
              { path: "collection", element: <ProfileCollection /> },
            ],
          },

          // Artwork Detail
          { path: "artworks/:id", element: <ArtworkDetail /> },
        ],
      },

      // 404
      { path: "*", element: <NotFound /> },
    ],
  },
];
