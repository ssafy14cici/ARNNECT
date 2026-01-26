// src/router/routes.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

import AppLayout from "../layouts/AppLayout";
import Guard from "../components/common/Guard";

import Home from "../pages/home/Home";
import ArtistGo from "../pages/asc/ASC";
import Search from "../pages/search/Search";
import Recover from "../pages/auth/Recover";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

import Feed from "../pages/feed/Feed";

import Lounge from "../pages/lounge/Lounge";
import CollectBook from "../pages/lounge/user/CollectBook";
import CollectBookScan from "../pages/lounge/user/CollectBookScan";
import CollectBookDetail from "../pages/lounge/user/CollectBookDetail";
import Taste from "../pages/lounge/user/Taste";
import Quiz from "../pages/lounge/user/Quiz";
import TicketQr from "../pages/lounge/artist/TicketQr";
import Portfolio from "../pages/lounge/artist/Portfolio";
import FanLetter from "../pages/lounge/artist/FanLetter";

import PostDetail from "../pages/posts/PostDetail";
import PostCreate from "../pages/posts/PostCreate";
import PostCreateRedirect from "../pages/posts/PostCreateRedirect";

import Profile from "../pages/profile/Profile";
import FeedTab from "../pages/profile/tabs/FeedTab";
import CollectionTab from "../pages/profile/tabs/CollectionTab";

import ArtworkDetail from "../pages/artwork/ArtworkDetail";
import NotFound from "../pages/notfound/NotFound";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      /* =========================
       * ✅ Public (비로그인 접근)
       * ========================= */
      { path: "/", element: <Home /> },
      { path: "home", element: <Home /> },
      { path: "artist-go", element: <ArtistGo /> },
      { path: "search", element: <Search /> },

      // 정책: recover를 로그인 상태에도 허용
      { path: "recover", element: <Recover /> },

      /* =========================
       * ✅ Guest Only (게스트만)
       * ========================= */
      {
        element: <Guard guestOnly redirectTo="/feed" />,
        children: [
          { path: "login", element: <Login /> },
          { path: "signup", element: <Signup /> },
        ],
      },

      /* =========================
       * 🔒 Protected (로그인 필요)
       * ========================= */
      {
        element: <Guard requireAuth />,
        children: [
          { path: "feed", element: <Feed /> },

          /* ---------- Posts ---------- */
          { path: "posts/create", element: <PostCreateRedirect /> },
          { path: "posts/create/artist", element: <PostCreate mode="ARTIST" /> },
          { path: "posts/create/user", element: <PostCreate mode="USER" /> },

          // ✅ 이거 하나만 남기기
          { path: "posts/:id", element: <PostDetail /> },


          /* ---------- Lounge ---------- */
          {
            path: "lounge",
            children: [
              // /lounge = 허브
              { index: true, element: <Lounge /> },

              // USER 전용
              {
                element: <Guard requireAuth requireRole={"general"} />,
                children: [
                  { path: "collectbook", element: <CollectBook /> },
                  { path: "collectbook/scan", element: <CollectBookScan /> }, 
                  { path: "collectbook/:id", element: <CollectBookDetail /> }, // ✅ 여기만 수정
                  { path: "taste", element: <Taste /> },
                  { path: "quiz", element: <Quiz /> },
                ],
              },

              // ARTIST 전용
              {
                element: <Guard requireAuth requireRole={"artist"} />,
                children: [
                  { path: "qr", element: <TicketQr /> },
                  { path: "portfolio", element: <Portfolio /> },
                  { path: "fanletter", element: <FanLetter /> },
                ],
              },

              // 선택: /lounge 로 들어왔는데 index 대신 특정 탭으로 보내고 싶으면 이걸 사용
              // { path: "*", element: <Navigate to="taste" replace /> },
            ],
          },

          /* ---------- Profile ---------- */
          {
            path: "profile/:id",
            element: <Profile />,
            children: [
              { index: true, element: <Navigate to="feed" relative="path" replace /> },
              { path: "feed", element: <FeedTab /> },
              { path: "collection", element: <CollectionTab /> },
            ],
          },

          /* ---------- Artworks ---------- */
          { path: "artworks/:id", element: <ArtworkDetail /> },
        ],
      },

      /* =========================
       * 404
       * ========================= */
      { path: "*", element: <NotFound /> },
    ],
  },
];
