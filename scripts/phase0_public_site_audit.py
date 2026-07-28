#!/usr/bin/env python3
"""Run the Phase 0 auditor against public website files only."""

from __future__ import annotations

import phase0_site_audit as audit

# Repository implementation files and prototypes are not public landing pages.
audit.EXCLUDED_TOP_LEVEL.update({
    "docs",
    "resources",
    "scripts",
    "templates",
})

# Temporary root-page experiments should not affect public SEO totals.
audit.EXCLUDED_NAME_PARTS = audit.EXCLUDED_NAME_PARTS + (
    "index_temp",
    "_temp.html",
    "-temp.html",
)

if __name__ == "__main__":
    audit.main()
