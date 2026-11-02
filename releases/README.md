# Setup releases

## Current: Workspace 0.3 / schema 2

**Download the current packages from [`v0.3.0/`](v0.3.0/):**

- [Online ZIP](v0.3.0/ASH-Nexus-Online-Setup-win64-py311.zip)
- [Offline ZIP](v0.3.0/ASH-Nexus-Offline-Setup-win64-py311.zip)
- [New workflows and safe schema-1 upgrade (Persian)](../docs/WORKSPACE_V03_FA.md)

Both include 200 print configurations, 160 vocabulary entries and the new persisted
workspaces. Each archive has a neighboring SHA-256 checksum file.

## Previous installer edition — retained, not overwritten

The ZIPs directly in this directory (outside `v0.3.0/`) are the previous delivered
installer edition, with 20 templates and schema 1. They do **not** contain the new
workspace upgrade. They remain available to avoid silently replacing an earlier
release/restore tool.

## Requirements and limits

Extract the complete selected ZIP, then run `Setup.cmd` for a **fresh** installation.
These are browser-wizard ZIPs, **not standalone Setup.exe files**. Both require
preinstalled Windows x64 CPython 3.11 x64 with pip/venv. The offline ZIP contains
19 dependency wheels but no Python runtime installer. Online means dependency
download, not cloud hosting or multi-site synchronization. Both use local setup
activation; optional issuer-signed licensing is a separate build configuration.

Do not point Setup at a nonempty existing hospital installation. For schema 1,
stop the old server, back up, and use the explicit **new-file-only** migration in
the linked guide. Startup never upgrades a live database implicitly. The old source
database remains intact. Native Windows installation/COM shortcuts/physical printers
and clinical use still require separate validation.
