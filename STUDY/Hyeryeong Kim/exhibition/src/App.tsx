import { Routes, Route, Navigate } from "react-router-dom";
import ExhibitionPage from "./pages/ExhibitionPage";

export default function App() {
  return (
    <Routes>
      <Route path="/exhibition" element={<ExhibitionPage />} />
      <Route path="*" element={<Navigate to="/exhibition" replace />} />
    </Routes>
  );
}
