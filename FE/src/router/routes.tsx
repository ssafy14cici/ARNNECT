// src/router/router.tsx
import type { RouteObject } from "react-router-dom";

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

      // ✅ Auth (게스트만 접근 가능)
      {
        element: <Guard guestOnly redirectTo="/feed" />,
        children: [
          { path: "login", element: <Login /> },
          { path: "signup", element: <Signup /> },
          // 필요하면 recover도 게스트 전용으로 같이 묶어도 됨
          // { path: "recover", element: <Recover /> },
        ],
      },

      // recover를 로그인 상태에서도 허용할지 정책에 따라 여기(공개)로 둘 수도 있음
      { path: "recover", element: <Recover /> },


      // 🔒 보호 (로그인 필요)
      {
        element: <Guard requireAuth />,
        children: [
          // ✅ 메인 혼합 피드
          {path: "feed", element: <Feed /> },
          
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
              { index: true, element: <ProfileFeed /> },
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
