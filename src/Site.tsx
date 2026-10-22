import { useEffect } from "react";
import App from "./App";
import { ApplicationsPage } from "./applications/ApplicationsPage";
import { SiteHeader } from "./site/SiteHeader";
import { useRoute } from "./site/useRoute";

/**
 * The simulation stays mounted while another page is shown, so a map being edited or a search
 * being inspected is still there on return. It is paused when hidden (see App's `active`).
 */
export default function Site() {
  const { page, section } = useRoute();
  useEffect(() => {
    if (page === "simulation") window.scrollTo(0, 0);
  }, [page]);
  return (
    <div className="site">
      <SiteHeader page={page} />
      <div hidden={page !== "simulation"}>
        <App active={page === "simulation"} />
      </div>
      {page === "applications" && <ApplicationsPage section={section} />}
    </div>
  );
}
