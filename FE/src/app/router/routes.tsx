// FE/src/app/router/routes.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate, createBrowserRouter } from "react-router-dom";

import Guard from "../../components/common/Guard";
import AppLayout from "../layouts/AppLayout";

import Guide from "../../pages/guide/Guide";
import Home from "../../pages/home/Home";
import Search from "../../pages/search/Search";

import Login from "../../pages/auth/Login";
import Signup from "../../pages/auth/Signup";

import Feed from "../../pages/feed/Feed";
import FeedDetail from "../../pages/feed/FeedDetail";

import Lounge from "../../pages/lounge/Lounge";
import LoungeIndex from "../../pages/lounge/LoungeIndex";
import CollectBook from "../../pages/lounge/user/collectbook/CollectBook";
import CollectBookScan from "../../pages/lounge/user/collectbook/CollectBookScan";
import CollectBookDetail from "../../pages/lounge/user/collectbook/CollectBookDetail";
import Taste from "../../pages/lounge/user/Taste";
import Quiz from "../../pages/lounge/user/Quiz";
import TicketQr from "../../pages/lounge/artist/TicketQr";
import Portfolio from "../../pages/lounge/artist/Portfolio";
import FanLetter from "../../pages/lounge/artist/FanLetter";

import PostCreate from "../../pages/posts/PostCreate";
import PostCreateRedirect from "../../pages/posts/PostCreateRedirect";

import Profile from "../../pages/profile/Profile";
import FeedTab from "../../pages/profile/tabs/FeedTab";
import CollectionTab from "../../pages/profile/tabs/CollectionTab";
import PortfolioTab from "../../pages/profile/tabs/PortfolioTab";

import ArtworkDetail from "../../pages/artwork/ArtworkDetail";
import NotFound from "../../pages/notfound/NotFound";

import PrivacyPolicyContent from "../../components/legal/PrivacyPolicyContent";
import TermsOfServiceContent from "../../components/legal/TermsOfServiceContent";

import YourPreference from "../../pages/yourpreference/YourPreference";

// ✅ 추가: artworks 게이트 컴포넌트(아래에 코드 제공)
import ArtworkGate from "../../pages/artwork/ArtworkGate";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      /* =========================
       * Public
       * ========================= */
      { path: "/", element: <Home /> },
      { path: "home", element: <Home /> },
      { path: "search", element: <Search /> },
      { path: "guide", element: <Guide /> },
      { path: "preference", element: <YourPreference /> },
      { path: "privacy", element: <PrivacyPolicyContent /> },
      { path: "terms", element: <TermsOfServiceContent /> },

      /* =========================
       * Guest Only
       * ========================= */
      {
        element: <Guard guestOnly redirectTo="/feed" />,
        children: [
          { path: "login", element: <Login /> },
          { path: "signup", element: <Signup /> },
        ],
      },

      /* =========================
       * Protected
       * ========================= */
      {
        element: <Guard requireAuth />,
        children: [
          { path: "feed", element: <Feed /> },

          // ✅ 핵심: artworks는 게이트로 단일화 (중복 제거)
          { path: "artworks/:id", element: <ArtworkGate /> },

          // ✅ posts는 일단 FeedDetail로 연결(유저 글 디테일용)
          { path: "posts/:id", element: <FeedDetail /> },

          /* ---------- Posts ---------- */
          { path: "posts/create", element: <PostCreateRedirect /> },
          { path: "posts/create/artist", element: <PostCreate mode="ARTIST" /> },
          { path: "posts/create/user", element: <PostCreate mode="USER" /> },

          /* ---------- Lounge ---------- */
          {
            path: "lounge", // ✅ "/lounge" -> "lounge"
            element: <Lounge />,
            children: [
              { index: true, element: <LoungeIndex /> },

              {
                path: "collectbook",
                element: <Guard requireRole="general" />,
                children: [
                  { index: true, element: <CollectBook /> },
                  { path: "scan", element: <CollectBookScan /> },
                  { path: ":id", element: <CollectBookDetail /> },
                ],
              },

              {
                path: "taste",
                element: <Guard requireRole="general" />,
                children: [{ index: true, element: <Taste /> }],
              },
              {
                path: "quiz",
                element: <Guard requireRole="general" />,
                children: [{ index: true, element: <Quiz /> }],
              },

              {
                path: "ticket",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <TicketQr /> }],
              },
              {
                path: "portfolio",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <Portfolio /> }],
              },
              {
                path: "fan-letter",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <FanLetter /> }],
              },
            ],
          },

          /* ---------- Profile ---------- */
          {
            path:  "profile/:type",
            element: <Profile />,
            children: [
              { index: true, element: <Navigate to="feed" relative="path" replace /> },
              { path: "feed", element: <FeedTab /> },
              { path: "collection", element: <CollectionTab /> },
              { path: "portfolio", element: <PortfolioTab /> },
            ],
          },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
