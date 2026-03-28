import React from "react";

import CatalogPanel from "../components/CatalogPanel";

export default function CoursesPage(props) {
  return (
    <main className="page-shell mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <CatalogPanel {...props} />
    </main>
  );
}
