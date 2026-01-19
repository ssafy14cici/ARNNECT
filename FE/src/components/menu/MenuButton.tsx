import { useUIStore } from "../../stores/uiStore";

export default function MenuButton() {
  const toggleMenu = useUIStore((s) => s.toggleMenu);

  return (
    <button className="menu-btn" onClick={toggleMenu} aria-label="Open menu">
      ☰
    </button>
  );
}
