import type { RouteObject } from "react-router-dom";
// import RootLayout from "../layouts/RootLayout";

// import Home from "../pages/home/Home";
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
import MainPage from "../pages/main/MainPage";
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <MainPage /> },
      { path: "/artist-go", element: <ArtistGo /> },
      { path: "/search", element: <Search /> },
      { path: "/feed", element: <Feed /> },
      { path: "/recover", element: <Recover /> },


      // ✅ 로그인 필요(상세/라운지/프로필 등) :contentReference[oaicite:3]{index=3}
      {
        element: <Guard requireAuth />,
        children: [
          { path: "/lounge", element: <Lounge /> },
          { path: "/profile/:id", element: <Profile /> },
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
