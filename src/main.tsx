
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import ExportPage from "./ExportPage";
import ExportPrintPage from "./ExportPrintPage";
import { AdminAdmissionApp } from "./admission/admin/AdminAdmissionApp";
import { StudentCalendarScreen } from "./admission/student/CalendarScreen";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <BrowserRouter>
    <Routes>
      <Route path="/admin/admission/*" element={<AdminAdmissionApp />} />
      <Route path="/student/calendar" element={<StudentCalendarScreen />} />
      <Route path="/export/print" element={<ExportPrintPage />} />
      <Route path="/export" element={<ExportPage />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
  
