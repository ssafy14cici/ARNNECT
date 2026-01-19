import { useEffect, useState } from "react";
import Hero from "../../components/main/Hero";
import AboutSection from "../../components/main/AboutSection";
import ShowcaseStage from "../../components/main/ShowcaseStage";
import HerRingLoader from "../../components/main/HerRingLoader";

export default function MainPage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const t = Math.min((Date.now() - start) / 1200, 1); // 1.2초
      setProgress(t * 100);
      if (t >= 1) {
        setLoading(false);
        window.clearInterval(id);
      }
    }, 30);

    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      {loading ? <HerRingLoader progress={progress} /> : null}
      <Hero />
      <AboutSection />
      <ShowcaseStage />
    </>
  );
}
