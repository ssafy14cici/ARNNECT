// src/app/router/routes.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate, createBrowserRouter, redirect } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store";
import Guard from "./Guard";
import AppLayout from "../layouts/AppLayout";

import Home from "../../pages/home/Home";
import HomePC from "../../pages/home/HomePC";
import HomeMobile from "../../pages/home/HomeMobile";

import Search from "../../pages/search/Search";
import Guide from "../../pages/guide/Guide";
import YourPreference from "../../pages/yourpreference/YourPreference";

import Login from "../../pages/auth/Login";
import Signup from "../../pages/auth/Signup";

import Feed from "../../pages/feed/Feed";

import Lounge from "../../pages/lounge/Lounge";
import LoungeIndex from "../../pages/lounge/LoungeIndex";

import CollectBook from "../../pages/lounge/user/collectbook/CollectBook";
import CollectBookScan from "../../pages/lounge/user/collectbook/CollectBookScan";
import CollectBookDetail from "../../pages/lounge/user/collectbook/CollectBookDetail";
import Taste from "../../pages/lounge/user/Taste";
import Quiz from "../../pages/lounge/user/Quiz";

import QrEntry from "../../pages/lounge/artist/qr/QrEntry";
import TicketQr from "../../pages/lounge/artist/qr/TicketQr";

import Portfolio from "../../pages/lounge/artist/Portfolio";
import FanLetter from "../../pages/lounge/artist/FanLetter";

import PostDetail from "../../pages/posts/PostDetail";
import PostCreate from "../../pages/posts/PostCreate";
import PostCreateRedirect from "../../pages/posts/PostCreateRedirect";

import Profile from "../../pages/profile/Profile";
import FeedTab from "../../pages/profile/tabs/FeedTab";
import CollectionTab from "../../pages/profile/tabs/CollectionTab";
import PortfolioTab from "../../pages/profile/tabs/PortfolioTab";

import ArtworkDetail from "../../pages/artwork/ArtworkDetail";
import NotFound from "../../pages/notfound/NotFound";

import PrivacyPolicy from "../../pages/legal/PrivacyPolicy";
import TermsOfService from "../../pages/legal/TermsOfService";


const KEY_PREF_USED = "arnnect_pref_used_v1";

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

function preferenceOnceLoader() {
  // 로그인 상태면 항상 허용
  const { isLoggedIn } = useAuthStore.getState();
  if (isLoggedIn) return null;

  // mock 모드에서만 "1회 사용" 제한을 로컬로 관리
  if (USE_MOCK) {
    const used = localStorage.getItem(KEY_PREF_USED) === "true";
    if (used) {
      // 이미 사용했는데 로그인 안함 -> 로그인으로
      throw redirect("/login");
    }
  }

  // real 모드에서는(백엔드 붙기 전) 일단 막지 않거나,
  // 추후 백엔드에서 "이미 취향분석 완료" 판단해서 막는 식으로 확장
  return null;
}


export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      /* ---------------- Public ---------------- */
      { path: "/", element: <Home />, handle: { navVariant: "home" } },
      { path: "/home/pc", element: <HomePC />, handle: { navVariant: "home" } },
      { path: "/home/mobile", element: <HomeMobile />, handle: { navVariant: "home" } },
      { path: "search", element: <Search /> },
      { path: "guide", element: <Guide /> },

      // ✅ auth는 Public
      { path: "login", element: <Login /> },
      { path: "signup", element: <Signup /> },

      // ✅ Feed는 Public로 빼기
      { path: "feed", element: <Feed /> },

      // ✅ Preference는 Public + loader로 1회 제한
      { path: "preference", element: <YourPreference />, loader: preferenceOnceLoader },


      // legal (canonical)
      { path: "legal/privacy", element: <PrivacyPolicy /> },
      { path: "legal/terms", element: <TermsOfService /> },

      // legal (legacy alias)
      { path: "privacy", element: <Navigate to="/legal/privacy" replace /> },
      { path: "terms", element: <Navigate to="/legal/terms" replace /> },

      /* ---------------- Protected ---------------- */
      {
        element: <Guard requireAuth />,
        children: [

          /* Create entry (role에 따라 분기) */
          { path: "create", element: <PostCreateRedirect /> },

          /* Artworks */
          {
            path: "artworks",
            children: [
              {
                path: "new",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <PostCreate mode="ARTIST" /> }],
              },
              { path: ":artworkId", element: <ArtworkDetail /> },
            ],
          },

          /* Reviews */
          {
            path: "reviews",
            children: [
              {
                path: "new",
                element: <Guard requireRole="general" />,
                children: [{ index: true, element: <PostCreate mode="USER" /> }],
              },
              { path: ":reviewId", element: <PostDetail /> },
            ],
          },

          /* Members(Profile) */
          {
            path: "members",
            children: [
              { index: true, element: <Navigate to="me" replace /> },
              {
                path: ":memberUuid", // memberUuid = "me" 허용
                element: <Profile />,
                children: [
                  { index: true, element: <Navigate to="feed" replace /> },
                  { path: "feed", element: <FeedTab /> },
                  { path: "collection", element: <CollectionTab /> },
                  { path: "portfolio", element: <PortfolioTab /> },
                ],
              },
            ],
          },

          /* Preference / Taste / Remind / Analysis */
          { path: "taste", element: <Taste /> },
          { path: "remind", element: <Quiz /> },
          { path: "analysis", element: <Taste /> },
          { path: "analysis/total", element: <Taste /> }, // placeholder

          /* Tickets */
          {
            path: "tickets",
            children: [
              // ✅ tickets/ : artist only -> QrEntry
              {
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <QrEntry /> }],
              },

              // ✅ tickets/issue : artist only -> TicketQr
              {
                path: "issue",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <TicketQr /> }],
              },

              // ✅ tickets/scan: general only
              {
                path: "scan",
                element: <Guard requireRole="general" />,
                children: [{ index: true, element: <CollectBookScan /> }],
              },

              // ✅ tickets/portfolio: artist only
              {
                path: "portfolio",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <Portfolio /> }],
              },
            ],
          },


          /* CollectBook */
          {
            path: "collectbook",
            element: <Guard requireRole="general" />,
            children: [
              { index: true, element: <CollectBook /> },
              { path: ":id", element: <CollectBookDetail /> },
            ],
          },

          /* Fanletters */
          {
            path: "fanletters",
            element: <Guard requireRole="artist" />,
            children: [{ index: true, element: <FanLetter /> }],
          },

          /* -------------- Legacy routes (점진 이관) -------------- */
          // ✅ 컴포넌트 대신 loader redirect로 처리 (Fast Refresh 룰 해결)
          {
            path: "profile/:id",
            loader: ({ params }) => redirect(`/members/${params.id ?? "me"}`),
          },

          {
            path: "posts",
            children: [
              { path: "create", loader: () => redirect("/create") },
              { path: "create/artist", loader: () => redirect("/create") },
              { path: "create/user", loader: () => redirect("/create") },
              { path: ":id", loader: () => redirect("/feed") },
            ],
          },

          /* Lounge: UX 허브는 유지하되 canonical로 redirect */
          {
            path: "lounge",
            element: <Lounge />,
            children: [
              { index: true, element: <LoungeIndex /> },

              { path: "collectbook", element: <Navigate to="/collectbook" replace /> },
              { path: "collectbook/scan", element: <Navigate to="/tickets/scan" replace /> },

              { path: "taste", element: <Navigate to="/taste" replace /> },
              { path: "quiz", element: <Navigate to="/remind" replace /> },

              { path: "ticket", element: <Navigate to="/tickets" replace /> },
              { path: "portfolio", element: <Navigate to="/tickets/portfolio" replace /> },
              { path: "fan-letter", element: <Navigate to="/fanletters" replace /> },
              { path: "qr", element: <Navigate to="/tickets" replace /> },
              { path: "qr/issue", element: <Navigate to="/tickets/issue" replace /> },

            ],
          },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
