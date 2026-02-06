// FE/src/app/router/routes.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate, createBrowserRouter, redirect, Outlet } from "react-router-dom";

import { useAuthStore } from "../../features/auth/store";
import Guard from "./Guard";
import AppLayout from "../layouts/AppLayout";

import ScrollToTop from "../../shared/utils/ScrollToTop";

import Home from "../../pages/home/Home";
import HomePC from "../../pages/home/HomePC";
import HomeMobile from "../../pages/home/HomeMobile";
import Hall from "../../pages/hall";

import Search from "../../pages/search/Search";
import Guide from "../../pages/guide/Guide";
import YourPreference from "../../pages/yourpreference/YourPreference";
import YourPreferenceSelect from "../../pages/yourpreference/YourPreferenceSelect";
import YourPreferenceResult from "../../pages/yourpreference/YourPreferenceResult";

import Login from "../../pages/auth/Login";
import Signup from "../../pages/auth/Signup";

import Feed from "../../pages/feed/Feed";

import Lounge from "../../pages/lounge/Lounge";
import LoungeIndex from "../../pages/lounge/LoungeIndex";

import CollectBook from "../../pages/lounge/user/collectbook/CollectBook";
import CollectBookScan from "../../pages/lounge/user/collectbook/CollectBookScan";
import CollectBookDetail from "../../pages/lounge/user/collectbook/CollectBookDetail";
import Analysis from "../../pages/lounge/user/Analysis";
import RemindQuiz from "../../pages/lounge/user/RemindQuiz";

import QrEntry from "../../pages/lounge/artist/qr/QrEntry";
import TicketQr from "../../pages/lounge/artist/qr/TicketQr";

import Portfolio from "../../pages/lounge/artist/Portfolio";
import FanLetter from "../../pages/lounge/artist/FanLetter";
import FanLetterCompose from "../../pages/fanLetter/FanLetterCompose";
import MyFanLetters from "../../pages/fanLetter/MyFanLetters";

import Profile from "../../pages/profile/Profile";
import FeedTab from "../../pages/profile/tabs/FeedTab";
import CollectionTab from "../../pages/profile/tabs/CollectionTab";
import PortfolioTab from "../../pages/profile/tabs/PortfolioTab";
import Exhibit from "../../pages/exhibit/Exhibit";

import ArtworkCreate from "../../pages/artworks/ArtworkCreate";
import ArtworkEdit from "../../pages/artworks/ArtworkEdit";
import ArtworkDetail from "../../pages/artworks/ArtworkDetail";

import ReviewCreate from "../../pages/reviews/ReviewCreate";
import ReviewEdit from "../../pages/reviews/ReviewEdit";
import ReviewDetail from "../../pages/reviews/ReviewDetail";

import NotFound from "../../pages/notfound/NotFound";
import PrivacyPolicy from "../../pages/legal/PrivacyPolicy";
import TermsOfService from "../../pages/legal/TermsOfService";

const KEY_PREF_USED = "arnnect_pref_used_v1";
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK) === "true";

function preferenceOnceLoader() {
  const { isLoggedIn } = useAuthStore.getState();
  if (isLoggedIn) return null;

  // ✅ mock이면 localStorage, 아니면 sessionStorage(탭 기준 1회)
  const storage = USE_MOCK ? localStorage : sessionStorage;
  const used = storage.getItem(KEY_PREF_USED) === "true";
  if (used) throw redirect("/login");

  return null;
}

// ✅ 전역 ScrollToTop을 라우터 컨텍스트 내부에서 1회 렌더
function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          /* ---------------- Public ---------------- */
          { path: "/", element: <Home />, handle: { navVariant: "home" } },
          { path: "/home/pc", element: <HomePC />, handle: { navVariant: "home" } },
          { path: "/home/mobile", element: <HomeMobile />, handle: { navVariant: "home-mobile" } },

          { path: "search", element: <Search /> },
          { path: "guide", element: <Guide /> },

          { path: "main-hall", element: <HomePC /> },
          { path: "hall", element: <Hall /> },

          // 임시 전시장
          { path: "exhibit", element: <Exhibit /> },
          // 작가 전시장
          { path: "exhibit/:artistId", element: <Exhibit /> },

          // 로그인하면 회원가입을 막기
          {
            element: <Guard guestOnly redirectTo="/hall" />,
            children: [
              { path: "login", element: <Login /> },
              { path: "signup", element: <Signup /> },
            ],
          },

          { path: "feed", element: <Feed /> },

          {
            path: "preference",
            loader: preferenceOnceLoader,
            element: <Outlet />,
            children: [
              { index: true, element: <YourPreference /> }, // /preference
              { path: "select", element: <YourPreferenceSelect /> }, // /preference/select
              { path: "result", element: <YourPreferenceResult /> }, // /preference/result
            ],
          },

          { path: "legal/privacy", element: <PrivacyPolicy /> },
          { path: "legal/terms", element: <TermsOfService /> },

          { path: "privacy", element: <Navigate to="/legal/privacy" replace /> },
          { path: "terms", element: <Navigate to="/legal/terms" replace /> },

          /* ---------------- Protected ---------------- */
          {
            element: <Guard requireAuth />,
            children: [
              /* ---------------- Artworks ---------------- */
              {
                path: "artworks",
                children: [
                  // ✅ create (artist only)
                  {
                    path: "create",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <ArtworkCreate /> }],
                  },

                  // (호환) /artworks/new -> /artworks/create
                  { path: "new", element: <Navigate to="/artworks/create" replace /> },

                  // detail
                  { path: ":artworkId", element: <ArtworkDetail /> },

                  // edit (artist only)
                  {
                    path: ":artworkId/edit",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <ArtworkEdit /> }],
                  },
                ],
              },

              /* ---------------- Reviews ---------------- */
              {
                path: "reviews",
                children: [
                  // ✅ create (general only)
                  {
                    path: "create",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <ReviewCreate /> }],
                  },

                  // (호환) /reviews/new -> /reviews/create
                  { path: "new", element: <Navigate to="/reviews/create" replace /> },

                  // detail
                  { path: ":reviewId", element: <ReviewDetail /> },

                  // edit (general only)
                  {
                    path: ":reviewId/edit",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <ReviewEdit /> }],
                  },
                ],
              },

              /* ---------------- Members(Profile) ---------------- */
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

              /* Preference  Remind / Analysis (canonical) */
              { path: "Analysis", element: <Analysis /> },
              { path: "RemindQuiz", element: <RemindQuiz /> },

              /* Tickets (canonical) */
              {
                path: "tickets",
                children: [
                  {
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <QrEntry /> }],
                  },
                  {
                    path: "issue",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <TicketQr /> }],
                  },
                  {
                    path: "scan",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <CollectBookScan /> }],
                  },
                  {
                    path: "portfolio",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <Portfolio /> }],
                  },
                ],
              },

              /* CollectBook (canonical) */
              {
                path: "collectbook",
                element: <Guard requireRole="general" />,
                children: [
                  { index: true, element: <CollectBook /> },
                  { path: ":id", element: <CollectBookDetail /> },
                ],
              },

              /* Fanletters (canonical) */
              {
                path: "fanletters",
                element: <Guard requireRole="artist" />,
                children: [{ index: true, element: <FanLetter /> }],
              },

              /* -------------- Legacy routes (점진 이관) -------------- */
              {
                path: "profile/:id",
                loader: ({ params }) => redirect(`/members/${params.id ?? "me"}`),
              },

              // ✅ posts 계열 페이지는 삭제. "예전 링크"만 새 경로로 보내기.
              {
                path: "posts",
                children: [
                  { path: "create", loader: () => redirect("/members/me") },
                  { path: "create/artist", loader: () => redirect("/artworks/create") },
                  { path: "create/user", loader: () => redirect("/reviews/create") },

                  // 예전 posts/:id는 어디로 보낼지 확정 전이면 feed로 유지
                  { path: ":id", loader: () => redirect("/feed") },
                ],
              },

              /* ---------------- Lounge (B안: 내부 렌더링) ---------------- */
              {
                path: "lounge",
                element: <Lounge />,
                children: [
                  { index: true, element: <LoungeIndex /> },

                  // general
                  {
                    path: "collectbook",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <CollectBook /> }],
                  },
                  {
                    path: "collectbook/scan",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <CollectBookScan /> }],
                  },
                  {
                    path: "collectbook/:id",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <CollectBookDetail /> }],
                  },
                  {
                    path: "Analysis",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <Analysis /> }],
                  },
                  {
                    path: "RemindQuiz",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <RemindQuiz /> }],
                  },
                  {
                    path: "my-fanletters",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <MyFanLetters /> }],
                  },

                  // artist
                  {
                    path: "ticket",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <QrEntry /> }],
                  },
                  {
                    path: "qr/issue",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <TicketQr /> }],
                  },
                  {
                    path: "portfolio",
                    // 일반 유저 홀에서 전시장 진입을 위해 주석처리?
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <Portfolio /> }],
                  },
                  {
                    path: "fan-letter",
                    element: <Guard requireRole="artist" />,
                    children: [{ index: true, element: <FanLetter /> }],
                  },

                  // fanletter compose (general)
                  {
                    path: "fanletters/compose/:id",
                    element: <Guard requireRole="general" />,
                    children: [{ index: true, element: <FanLetterCompose /> }],
                  },
                ],
              },
            ],
          },

          { path: "*", element: <NotFound /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
