import type { RouteObject } from "react-router-dom";

import Intro from "./views/Intro";
import Battle from "./views/Battle";
import Analysis from "./views/Analysis";
import Result from "./views/Result";

export const yourTasteRoutes: RouteObject = {
  path: "yourtaste",
  children: [
    { index: true, element: <Intro /> },
    { path: "battle", element: <Battle /> },
    { path: "analysis", element: <Analysis /> },
    { path: "result", element: <Result /> },
  ],
};
