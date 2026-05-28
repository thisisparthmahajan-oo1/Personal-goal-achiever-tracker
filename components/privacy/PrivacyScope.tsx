"use client";

import { usePrivacy } from "./PrivacyProvider";

/**
 * Wraps a region in a privacy scope tied to a specific goal id. The nearest
 * data-privacy ancestor wins (via the --priv-blur custom property), so a goal
 * revealed on the dashboard stays revealed on its detail page, and vice versa.
 */
export function PrivacyScope({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { isHidden } = usePrivacy();
  return (
    <div data-privacy={isHidden(id) ? "hidden" : "visible"} className={className}>
      {children}
    </div>
  );
}
