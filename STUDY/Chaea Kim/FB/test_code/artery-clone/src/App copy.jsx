import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

/**
 * Artery-style landing scaffold (inspired by public descriptions/screenshots)
 * - Full-bleed hero
 * - Grid overlay
 * - Orbiting particles
 * - Minimal nav + scroll cue
 * - Work grid + modal
 */

const heroImage =
  "https://images.unsplash.com/photo-1520975958225-79f2f02d3e8b?auto=format&fit=crop&w=1600&q=80"; // replace with your asset

const CATEGORIES = ["All", "VFX", "Design", "Experiential", "Motion", "Digital"];

const WORK = [
  {
    id: "w1",
    title: "Spring Campaign",
    discipline: "Digital / Motion",
    year: "2026",
    cover:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
    description:
      "A minimal grid-led layout with bold typography and animated highlights.",
  },
  {
    id: "w2",
    title: "Brand Film Frames",
    discipline: "VFX / Editorial",
    year: "2025",
    cover:
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=1200&q=80",
    description:
      "Cinematic stills presented as a responsive tile system with reveal-on-hover.",
  },
  {
    id: "w3",
    title: "Product Sculpture",
    discipline: "3D / Design",
    year: "2026",
    cover:
      "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?auto=format&fit=crop&w=1200&q=80",
    description:
      "Orbiting micro-elements and a hero object with depth through motion parallax.",
  },
  {
    id: "w4",
    title: "Installation Teaser",
    discipline: "Experiential",
    year: "2024",
    cover:
      "https://images.unsplash.com/photo-1520975682031-a4a95717e162?auto=format&fit=crop&w=1200&q=80",
    description:
      "Grid-first editorial composition, with scroll-driven pacing and transitions.",
  },
];

function cn(...xs) {
  return xs.filter(Boolean).join(" ");
}

function GridOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
        opacity: 0.18,
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)
        `,
        backgroundSize: "120px 120px",
        mixBlendMode: "overlay",
      }}
    />
  );
}

function OrbitingDots({ count = 10 }) {
  const dots = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = 6 + (i % 4) * 3;
      const radius = 80 + i * 14;
      const duration = 6 + (i % 5) * 2;
      const delay = (i % 7) * 0.2;
      return { i, size, radius, duration, delay };
    });
  }, [count]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
      }}
    >
      {dots.map((d) => (
        <motion.div
          key={d.i}
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: d.duration,
            repeat: Infinity,
            ease: "linear",
            delay: d.delay,
          }}
          style={{
            position: "absolute",
            width: d.radius * 2,
            height: d.radius * 2,
            borderRadius: "999px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "100%",
              transform: "translate(-50%, -50%)",
              width: d.size,
              height: d.size,
              borderRadius: "999px",
              background: "rgba(255,255,255,0.85)",
              boxShadow: "0 0 24px rgba(255,255,255,0.25)",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function TopNav({ onMenu }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: "22px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "baseline" }}>
        <div style={{ fontWeight: 700, letterSpacing: "0.08em" }}>THE</div>
        <div style={{ fontWeight: 700, letterSpacing: "0.08em" }}>ARTERY</div>
        <div style={{ opacity: 0.6, fontSize: 12, letterSpacing: "0.12em" }}>
          / portfolio
        </div>
      </div>

      <button
        onClick={onMenu}
        style={{
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(0,0,0,0.2)",
          color: "rgba(255,255,255,0.92)",
          padding: "10px 12px",
          borderRadius: 999,
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, letterSpacing: "0.16em" }}>MENU</span>
        <span aria-hidden style={{ display: "grid", gap: 3 }}>
          <span style={{ width: 18, height: 2, background: "white" }} />
          <span style={{ width: 18, height: 2, background: "white", opacity: 0.7 }} />
        </span>
      </button>
    </div>
  );
}

function SideChrome({ category, setCategory }) {
  const idx = CATEGORIES.indexOf(category);
  const prev = CATEGORIES[Math.max(0, idx - 1)];
  const next = CATEGORIES[Math.min(CATEGORIES.length - 1, idx + 1)];

  return (
    <>
      {/* Left: scroll cue */}
      <div
        style={{
          position: "fixed",
          left: 22,
          bottom: 26,
          zIndex: 20,
          color: "rgba(255,255,255,0.75)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontSize: 12,
          letterSpacing: "0.22em",
          userSelect: "none",
        }}
      >
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          SCROLL
        </div>
        <div style={{ width: 1, height: 72, background: "rgba(255,255,255,0.35)" }} />
      </div>

      {/* Right: category picker */}
      <div
        style={{
          position: "fixed",
          right: 22,
          top: "40%",
          transform: "translateY(-50%)",
          zIndex: 20,
          color: "rgba(255,255,255,0.82)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          userSelect: "none",
          alignItems: "flex-end",
          minWidth: 160,
        }}
      >
        <button
          onClick={() => setCategory(prev)}
          disabled={idx === 0}
          style={{
            cursor: idx === 0 ? "not-allowed" : "pointer",
            background: "transparent",
            border: 0,
            color: "inherit",
            opacity: idx === 0 ? 0.25 : 0.75,
            letterSpacing: "0.12em",
          }}
        >
          ▲
        </button>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", opacity: 0.6 }}>
            CATEGORY
          </div>
          <div style={{ fontSize: 14, letterSpacing: "0.16em", fontWeight: 600 }}>
            {category.toUpperCase()}
          </div>
        </div>
        <button
          onClick={() => setCategory(next)}
          disabled={idx === CATEGORIES.length - 1}
          style={{
            cursor: idx === CATEGORIES.length - 1 ? "not-allowed" : "pointer",
            background: "transparent",
            border: 0,
            color: "inherit",
            opacity: idx === CATEGORIES.length - 1 ? 0.25 : 0.75,
            letterSpacing: "0.12em",
          }}
        >
          ▼
        </button>
      </div>
    </>
  );
}

function Modal({ item, onClose }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(10px)",
            display: "grid",
            placeItems: "center",
            padding: 22,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.22 }}
            style={{
              width: "min(980px, 100%)",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(20,20,20,0.85)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.55)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr" }}>
              <div style={{ position: "relative", minHeight: 420 }}>
                <img
                  alt={item.title}
                  src={item.cover}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,0.0), rgba(0,0,0,0.55))",
                  }}
                />
              </div>
              <div style={{ padding: 22, color: "rgba(255,255,255,0.9)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ opacity: 0.7, letterSpacing: "0.18em", fontSize: 12 }}>
                    {item.year} / {item.discipline}
                  </div>
                  <button
                    onClick={onClose}
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "transparent",
                      color: "rgba(255,255,255,0.9)",
                      borderRadius: 999,
                      padding: "8px 10px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
                <h2 style={{ marginTop: 14, marginBottom: 8, letterSpacing: "0.06em" }}>
                  {item.title}
                </h2>
                <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.55 }}>
                  {item.description}
                </p>

                <div style={{ marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 14 }}>
                  <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.16em" }}>
                    NOTES
                  </div>
                  <ul style={{ marginTop: 10, paddingLeft: 18, opacity: 0.82, lineHeight: 1.6 }}>
                    <li>Grid overlay + editorial spacing</li>
                    <li>Hover reveal → modal detail</li>
                    <li>Scroll-driven pacing (extendable)</li>
                  </ul>
                </div>

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      textDecoration: "none",
                      color: "rgba(255,255,255,0.92)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      padding: "10px 12px",
                      borderRadius: 999,
                      letterSpacing: "0.14em",
                      fontSize: 12,
                    }}
                  >
                    VIEW CASE
                  </a>
                  <a
                    href="#work"
                    style={{
                      textDecoration: "none",
                      color: "rgba(255,255,255,0.92)",
                      background: "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      padding: "10px 12px",
                      borderRadius: 999,
                      letterSpacing: "0.14em",
                      fontSize: 12,
                    }}
                  >
                    BACK TO GRID
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [active, setActive] = useState(null);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.92]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 40]);
  const vignette = useTransform(scrollYProgress, [0, 0.25], [0.35, 0.65]);

  const filtered = useMemo(() => {
    if (category === "All") return WORK;
    return WORK.filter((w) => w.discipline.toLowerCase().includes(category.toLowerCase()));
  }, [category]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060606",
        color: "white",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      <TopNav onMenu={() => setMenuOpen((v) => !v)} />
      <GridOverlay />
      <SideChrome category={category} setCategory={setCategory} />

      {/* HERO */}
      <section
        ref={heroRef}
        style={{
          position: "relative",
          height: "100vh",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <motion.div style={{ position: "absolute", inset: 0, y: heroY, scale: heroScale }}>
          <img
            alt="Hero"
            src={heroImage}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }}
          />
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.10), rgba(0,0,0,0.92) 60%)",
              opacity: vignette,
            }}
          />
        </motion.div>

        <div
          style={{
            position: "relative",
            zIndex: 15,
            height: "100%",
            display: "grid",
            alignItems: "center",
            padding: "0 6vw",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 18,
              maxWidth: 980,
            }}
          >
            <div style={{ opacity: 0.75, letterSpacing: "0.22em", fontSize: 12 }}>
              NEW YORK / MULTIDISCIPLINARY STUDIO
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                margin: 0,
                lineHeight: 0.95,
                letterSpacing: "0.02em",
                fontSize: "clamp(42px, 7vw, 92px)",
                fontWeight: 700,
              }}
            >
              GRID-LED
              <br />
              DIGITAL WORK
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              style={{
                margin: 0,
                maxWidth: 560,
                opacity: 0.8,
                lineHeight: 1.6,
                fontSize: 15,
              }}
            >
              Minimal composition, strong typography, and motion used as structure.
              Swap the hero asset with your own 3D render or connect real 3D via
              react-three-fiber.
            </motion.p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <a
                href="#work"
                style={{
                  textDecoration: "none",
                  color: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(0,0,0,0.25)",
                  padding: "12px 14px",
                  borderRadius: 999,
                  letterSpacing: "0.14em",
                  fontSize: 12,
                  backdropFilter: "blur(10px)",
                }}
              >
                VIEW WORK
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  textDecoration: "none",
                  color: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "transparent",
                  padding: "12px 14px",
                  borderRadius: 999,
                  letterSpacing: "0.14em",
                  fontSize: 12,
                }}
              >
                ABOUT
              </a>
            </div>
          </div>

          {/* Center "object" + orbiting dots (visual motif) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ position: "relative", width: "min(520px, 78vw)", aspectRatio: "1/1" }}>
              <OrbitingDots count={12} />
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                style={{
                  position: "absolute",
                  inset: "18%",
                  borderRadius: 22,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02))",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 24px 90px rgba(0,0,0,0.55)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.22em" }}>
                    ORBITING
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(36px, 4vw, 56px)",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      marginTop: 4,
                    }}
                  >
                    3D MODEL
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: "0.18em", marginTop: 6 }}>
                    (placeholder)
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Menu sheet */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                position: "fixed",
                top: 70,
                right: 22,
                zIndex: 50,
                width: "min(360px, calc(100vw - 44px))",
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(12,12,12,0.72)",
                backdropFilter: "blur(16px)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.18em" }}>
                NAVIGATION
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {["Work", "Studio", "Contact"].map((x) => (
                  <a
                    key={x}
                    href={x === "Work" ? "#work" : "#"}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      textDecoration: "none",
                      color: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      padding: "12px 12px",
                      borderRadius: 14,
                      letterSpacing: "0.10em",
                      fontSize: 13,
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    {x.toUpperCase()}
                  </a>
                ))}
              </div>

              <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.10)", paddingTop: 12 }}>
                <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.18em" }}>
                  CATEGORY
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      style={{
                        cursor: "pointer",
                        borderRadius: 999,
                        padding: "9px 12px",
                        border: "1px solid rgba(255,255,255,0.16)",
                        background: c === category ? "rgba(255,255,255,0.16)" : "transparent",
                        color: "rgba(255,255,255,0.9)",
                        letterSpacing: "0.12em",
                        fontSize: 11,
                      }}
                    >
                      {c.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* WORK */}
      <section id="work" style={{ position: "relative", padding: "70px 6vw 90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.22em" }}>SELECTED</div>
            <h2 style={{ margin: "10px 0 0", letterSpacing: "0.06em" }}>WORK</h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, opacity: 0.6, letterSpacing: "0.18em" }}>FILTER</div>
            <div style={{ fontSize: 13, opacity: 0.85, letterSpacing: "0.14em" }}>
              {category.toUpperCase()} / {filtered.length} ITEMS
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 14,
          }}
        >
          {filtered.map((w, i) => {
            const span = i % 7 === 0 ? 7 : i % 5 === 0 ? 6 : 5;
            return (
              <motion.button
                key={w.id}
                onClick={() => setActive(w)}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.03, 0.18) }}
                whileHover={{ scale: 1.01 }}
                style={{
                  gridColumn: `span ${span}`,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 18,
                  overflow: "hidden",
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                  position: "relative",
                  minHeight: 240,
                }}
              >
                <img
                  alt={w.title}
                  src={w.cover}
                  style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.78))",
                    opacity: 0.9,
                  }}
                />
                <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, opacity: 0.65, letterSpacing: "0.18em" }}>
                        {w.year} / {w.discipline}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 650, letterSpacing: "0.04em" }}>
                        {w.title}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: "0.18em" }}>OPEN ↗</div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </section>

      <footer style={{ padding: "30px 6vw 40px", borderTop: "1px solid rgba(255,255,255,0.08)", opacity: 0.8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ letterSpacing: "0.14em", fontSize: 12 }}>© {new Date().getFullYear()} / ARTERY-STYLE SCAFFOLD</div>
          <div style={{ letterSpacing: "0.14em", fontSize: 12, opacity: 0.7 }}>GRID / MOTION / TYPO</div>
        </div>
      </footer>

      <Modal item={active} onClose={() => setActive(null)} />
    </div>
  );
}
