# AG-Claw Mobile Audit

This audit captures the state of the AG-Claw temporary web shell on small screens after the April 2026 mobile pass.

## What Was True Before This Pass

- mobile-specific components already existed in `web/components/mobile/`
- keyboard-aware viewport tracking already existed in `web/hooks/useViewportHeight.ts`
- the root shell still rendered the desktop sidebar, desktop header, and desktop composer on all screen sizes
- the mobile file viewer existed but was not connected to the main page flow

## What This Pass Wired Up

- `web/components/chat/ChatLayout.tsx` now switches to `MobileHeader`, `MobileSidebar`, and `MobileInput` when the screen is below the mobile breakpoint
- the main shell now uses visual viewport height on mobile so the page tracks the on-screen keyboard more cleanly
- `web/components/mobile/MobileInput.tsx` now forwards buddy-aware chat props instead of dropping them
- the mobile file viewer overlay is now connected to the active file-viewer tab state
- `web/app/layout.tsx` now exports viewport metadata with `viewportFit: cover` for safer mobile rendering

## Mobile Status After This Pass

Working now:

- mobile navigation drawer
- mobile header actions for buddy and settings
- keyboard-aware mobile composer spacing
- mobile file-viewer overlay for active tabs
- safe-area-aware viewport configuration

Still partial:

- the research workbench is still a dense desktop-first surface
- the settings dialog is still designed primarily for larger screens
- mobile file editing is preview-only in the overlay
- no mobile-specific E2E coverage is checked in yet
- no installable PWA metadata or offline behavior is configured yet

Still missing:

- dedicated native mobile application
- touch-optimized research/orchestration flows
- mobile notification and background sync model

## Recommended Next Mobile Steps

1. Add Playwright viewport coverage for phone and tablet breakpoints.
2. Split `ResearchWorkbench` into stacked mobile sections instead of the current dense panel layout.
3. Convert the shell into a real PWA with manifest, icons, and install/offline strategy.
4. Decide whether a native wrapper is actually needed after the PWA pass.