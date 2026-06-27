import React, { useEffect } from "react";

import AdminAccessGate from "./components/AdminAccessGate";
import PublicProfileStatusPage from "./components/PublicProfileStatusPage";

export type Page = "dashboard" | "customers" | "savings";

export type DateRange = {
  start: Date;
  end: Date;
};

const App: React.FC = () => {
  const statusToken =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("status")?.trim() ?? "";

  useEffect(() => {
    document.title = "PJFinance Admin";
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, []);

  if (statusToken) {
    return <PublicProfileStatusPage shareToken={statusToken} />;
  }

  return <AdminAccessGate />;
};

export default App;
