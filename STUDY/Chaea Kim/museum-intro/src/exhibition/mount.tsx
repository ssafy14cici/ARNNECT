// src/exhibition/mount.tsx
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { ExhibitionOverlay } from "./ExhibitionOverlay";
import "./exhibition.css";

export type ExhibitionMount = {
  show: (onRequestClose: () => void) => void;
  hide: () => void;
  unmount: () => void;
};

export function mountExhibition(rootEl: HTMLElement): ExhibitionMount {
  const root: Root = createRoot(rootEl);

  let open = false;
  let closeCb: () => void = () => {};

  const render = () => {
    root.render(<ExhibitionOverlay open={open} onRequestClose={() => closeCb()} />);
  };

  render();

  return {
    show: (onRequestClose) => {
      open = true;
      closeCb = onRequestClose;
      render();
    },
    hide: () => {
      open = false;
      render();
    },
    unmount: () => root.unmount(),
  };
}
