import type { RouteObject } from "react-router-dom";
import Home from "../pages/home/Home";
import AppLayout from "../layouts/AppLayout";
import ArtistGo from "../pages/artistGo/ArtistGo";
import Search from "../pages/search/Search";
import Feed from "../pages/feed/Feed";
import Lounge from "../pages/lounge/Lounge";
import Profile from "../pages/profile/Profile";
import ArtworkDetail from "../pages/artwork/ArtworkDetail";
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import NotFound from "../pages/notfound/NotFound";
import Recover from "../pages/auth/Recover";
import Guard from "../components/common/Guard";
import MyFeed from "../pages/lounge/MyFeed";
import MyCollection from "../pages/lounge/MyCollection";
import MyTaste from "../pages/lounge/MyTaste";
import MyQuiz from "../pages/lounge/MyQuiz";
import ProfileCollection from "../pages/profile/ProfileCollection";
import ProfileFeed from "../pages/profile/ProfileFeed";

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/artist-go", element: <ArtistGo /> },
      { path: "/search", element: <Search /> },
      { path: "/feed", element: <Feed /> },
      { path: "/recover", element: <Recover /> },


      // ✅ 로그인 필요(상세/라운지/프로필 등) :contentReference[oaicite:3]{index=3}
      {
        element: <Guard requireAuth />,
        children: [
          // { path: "/lounge", element: <Lounge /> },
           {
            path: "/lounge",
            element: <Lounge />, // 레이아웃 역할
            children: [
              { path: "feed", element: <MyFeed /> },
              { path: "collection", element: <MyCollection /> },
              { path: "taste", element: <MyTaste /> },
              { path: "quiz", element: <MyQuiz /> },
              // 기본 진입
              { index: true, element: <MyFeed /> },
            ],
          },
          // ✅ 공개 프로필(2탭)
          {
            path: "/profile/:id",
            element: <Profile />,
            children: [
              { path: "feed", element: <ProfileFeed /> },
              { path: "collection", element: <ProfileCollection /> },
              { index: true, element: <ProfileFeed /> },
            ],
          },
          { path: "/artworks/:id", element: <ArtworkDetail /> },
        ],
      },

      // Auth
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },

      { path: "*", element: <NotFound /> },
    ],
  },
];
