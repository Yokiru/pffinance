import React, { useEffect } from "react";

import AdminAccessGate from "./components/AdminAccessGate";

const App: React.FC = () => {
  useEffect(() => {
    document.title = "PJFinance Admin";
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, []);

  return <AdminAccessGate />;
};

export default App;
