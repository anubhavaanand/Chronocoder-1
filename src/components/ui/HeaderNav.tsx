"use client";

/**
 * Header navigation that collapses to a disclosure on small screens (#321).
 *
 * `page.tsx` is a server component and the links live there, so the state
 * stays in this small client island instead of marking the whole page client.
 * Below `md` the desktop row is hidden and a button reveals the same links in
 * a stacked panel; the button carries `aria-expanded`/`aria-controls` so the
 * state is announced.
 */

import { useState } from "react";

const LINKS = [
  { href: "#mentors", label: "Mentors" },
  { href: "#features", label: "How it works" },
  { href: "https://github.com/anubhavaanand/Chronocoder-1", label: "GitHub" },
] as const;

const linkClass =
  "hover:text-[oklch(94%_0.006_265)] transition-colors duration-150";

export function HeaderNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="hidden md:flex items-center gap-8 text-sm"
      >
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{ color: "var(--fg-mid)" }}
            className={linkClass}
            {...(link.href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
          className="flex items-center justify-center w-9 h-9 rounded-md border border-[color:var(--fg-mid)] text-[color:var(--fg-mid)] hover:text-[oklch(94%_0.006_265)] transition-colors"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            {open ? "✕" : "☰"}
          </span>
        </button>

        {open && (
          <nav
            id="mobile-nav"
            aria-label="Primary mobile"
            className="absolute right-0 top-full mt-2 min-w-40 rounded-lg border border-[color:var(--fg-mid)] bg-[color:var(--bg)] p-2 shadow-lg"
          >
            <ul className="flex flex-col gap-1 text-sm">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    style={{ color: "var(--fg-mid)" }}
                    className="block px-3 py-2 rounded hover:bg-[color:var(--fg-mid)]/10 transition-colors"
                    {...(link.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </>
  );
}