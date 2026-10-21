import { NAV_ITEMS, type Page } from "./routes";

/** Brand and primary navigation, shared by every page. */
export function SiteHeader({ page }: { page: Page }) {
  return (
    <header className="site-header">
      <a className="brand" href="#/">
        AERIS <span className="title-sep">/</span> <span className="title-sub">Inside A*</span>
      </a>
      <nav aria-label="Primary">
        <ul className="site-nav">
          {NAV_ITEMS.map((item) => (
            <li key={item.page}>
              <a href={item.href} aria-current={item.page === page ? "page" : undefined}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
