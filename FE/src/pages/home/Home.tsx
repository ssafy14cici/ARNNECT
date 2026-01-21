// src/pages/home/Home.tsx
import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";

import Hero from "../../components/main/Hero";
import AboutSection from "../../components/main/AboutSection";
import ShowcaseStage from "../../components/main/ShowcaseStage";
import HerRingLoader from "../../components/main/HerRingLoader";

import { preloadImages, fetchWithProgress } from "../../utils/networkProgress";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [progress, setProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const navigate = useNavigate();

  useEffect(() => {
    let imgP = 0;
    let apiP = 0;

    const updateTotal = () => {
      // 가중치: 이미지 70% + API 30%
      const total = Math.round(imgP * 0.7 + apiP * 0.3);
      setProgress(total);
    };

    (async () => {
      // 1) 프리로드할 이미지 (public 기준)
      const images = [
        "/art/a1.jpg",
        "/art/a2.jpg",
        "/art/a3.jpg",
        "/art/a4.jpg",
        "/art/a5.jpg",
        "/art/a6.jpg",
        "/art/a7.jpg",
        "/art/a8.jpg",
      ];

      const imgTask = preloadImages(images, (p: number) => {
        imgP = p;
        updateTotal();
      });

      // 2) API 로딩 (지금은 더미)
      const apiTask = fetchWithProgress("/api/home", {}, (p: number) => {
        apiP = p;
        updateTotal();
      }).catch(() => {
        apiP = 100;
        updateTotal();
      });

      await Promise.all([imgTask, apiTask]);

      setProgress(100);
      setTimeout(() => setIsReady(true), 200);
    })();
  }, []);

  if (!isReady) {
    return (
      <HerRingLoader
        progress={progress}
        bg="#F8F6F2"
        stroke="#2B2A28"
        size={180}
      />
    );
  }

  return (
    <>
      <Hero />
      <AboutSection />
      <ShowcaseStage />
    </>
  );
}
