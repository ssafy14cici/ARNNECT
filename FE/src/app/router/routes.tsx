// src/app/router/routes.tsx
import type { RouteObject } from "react-router-dom";
import { Navigate, createBrowserRouter, redirect } from "react-router-dom";

import Guard from "./Guard";
import AppLayout from "../layouts/AppLayout";

import Home from "../../pages/home/Home";
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
import TicketQr from "../../pages/lounge/artist/TicketQr";
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

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      /* ---------------- Public ---------------- */
      { path: "/", element: <Home /> },
      { path: "home", element: <Home /> },
      { path: "search", element: <Search /> },
      { path: "guide", element: <Guide /> },

      // legal (canonical)
      { path: "legal/privacy", element: <PrivacyPolicy /> },
      { path: "legal/terms", element: <TermsOfService /> },

      // legal (legacy alias)
      { path: "privacy", element: <Navigate to="/legal/privacy" replace /> },
      { path: "terms", element: <Navigate to="/legal/terms" replace /> },

      /* -------------- Guest only (Auth) -------------- */
      {
        path: "auth",
        element: <Guard guestOnly redirectTo="/feed" />,
        children: [
          { path: "login", element: <Login /> },
          { path: "signup", element: <Signup /> },
        ],
      },

      /* ---------------- Protected ---------------- */
      {
        element: <Guard requireAuth />,
        children: [
          /* Feed */
          { path: "feed", element: <Feed /> },

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
          { path: "preference", element: <YourPreference /> },
          { path: "taste", element: <Taste /> },
          { path: "remind", element: <Quiz /> },
          { path: "analysis", element: <Taste /> },
          { path: "analysis/total", element: <Taste /> }, // placeholder

          /* Tickets (✅ index route에 children 달지 말기) */
          {
            path: "tickets",
            children: [
              // ✅ tickets/ index: artist only
              {
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
            ],
          },
        ],
      },

      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
