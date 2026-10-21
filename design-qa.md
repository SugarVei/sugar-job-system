# Offer management readability and status colors

final result: passed

## Release update: 2026-10-21

- User requested another font-size increase and authorized production publication.
- Rebased onto current main `1c6a271` to retain its job-town removal.
- Increased all Offer-owned CSS font sizes by another 2px: body/inputs/buttons 18px, company headings and metric values 22px, summary values 28px (26px mobile), labels 17px, status pills 16px, deadline 19px (17px mobile), helper text 15–16px.
- Summary cards now have a 152px minimum height (144px mobile); fields use 50px minimum height and action buttons 48px. Mobile actions use a three-column grid with more width for the longer details label.
- New evidence: `D:/Users/86181/Documents/简历/outputs/offer-readability-release-20261021/`. The same seven viewport widths, centered summary, exact date format, five state colors, filters, comparison, details and mobile form checks passed; 18px input type was asserted. Browser page and console errors: zero. Existing demo-mode and stream warnings remain.
- `npm run lint`, `npm run build`, and `git diff --check` passed after this update.
- Production release uses the existing GitHub main-branch deployment integration. The Vercel connector returned 403/404 for deployment inspection and the CLI had no saved credentials; production verification therefore checks GitHub deployment statuses and the actual HTML-linked public JS/CSS.

## Scope and visual truth

- Selected concept: `C:/Users/86181/.codex/generated_images/01a15c71-4763-7f30-a362-c856c463c318/exec-be4c65ad-69ee-417c-8fff-7531ee7152f5.png` (1605 × 980 pixels).
- User-approved typography specification: helper text 13–14px, labels 15px, body/controls 16px, company headings 20px; centered pastel summary cards and saturated state badges.
- Latest correction: deadline displays use date only, for example `2026.10.12`; times remain available in the edit form.
- Existing global navigation, theme picker, search, companion and account controls remain the existing app's components. The concept's review-only status palette and preview heading are not shipped as product UI.

## Rendered evidence

- Local sample preview: `http://127.0.0.1:5191/`; real component code served by Vite at `http://127.0.0.1:5190/`.
- Primary screenshot: `D:/Users/86181/Documents/简历/outputs/offer-readability-20261020/offers-desktop-1920.png` (1920 × 1080, CSS viewport 1920 × 1080, deviceScaleFactor 1).
- Content comparison screenshot: `D:/Users/86181/Documents/简历/outputs/offer-readability-20261020/offers-content-1605.png` (1473 × 546 pixels, CSS viewport 1605 × 980, deviceScaleFactor 1).
- Full-view combined comparison: `D:/Users/86181/Documents/简历/outputs/offer-readability-20261020/design-comparison.png`.
- Focused summary comparison: `D:/Users/86181/Documents/简历/outputs/offer-readability-20261020/design-comparison-summary.png`.
- Normalization: crop the concept to app content `(36,121)-(1574,807)`, excluding its heading and review-only palette; normalize to the implementation's 1473px content width. Both are DPR 1. The real app uses the explicitly approved CSS text sizes rather than inferring CSS sizes from generated-image lettering. Its existing shell and denser content height are intentional.
- Other screenshots in the same output directory: `offers-1440.png`, `offers-390.png`, `offers-320.png`, `offers-sidebar-expanded.png`, `offers-comparison.png`, `offers-details.png`, `offers-create-desktop.png`, `offers-edit-desktop.png`, `offers-create-mobile.png`, `offers-create-mobile-bottom.png`, `offers-mobile-record.png`.
- State: two isolated sample records based on the preview; pending count 1, accepted 0, ended 1, highest package 314000. This does not read or write the production account.

## Comparison history and findings

1. Initial rendered review: six centered pastel summary cards, enlarged body/control type and amber/red sample badges preserved the target's hierarchy. Chinese deadlines were replaced by numeric deadlines as requested. No core composition changes needed.
2. [P2, fixed] The existing animated page container bounded the details drawer to the card grid; its lower content was clipped. Moved the drawer into a body portal and added Escape dismissal. The post-fix `offers-details.png` shows the panel filling the 1080px viewport, and the browser assertion verifies its full viewport height.
3. Screenshot capture correction: initial captures caught CSS entrance animations mid-frame; final captures disable finite animations. Color checks finish native color transitions before sampling. These were capture problems rather than style defects.
4. Preview infrastructure correction: the local sample proxy now forwards Vite's WebSocket upgrades. Placeholder account-profile reads are fulfilled with empty test responses. Final UI run has zero page errors and zero console errors. Remaining warnings are the explicit missing-Supabase demo-mode notice and the pre-existing browser-externalized `stream` dependency warning.

No actionable P0/P1/P2 design findings remain within Offer management.

## Required fidelity surfaces

- Typography: retain the existing DM Sans/system/PingFang/Microsoft YaHei stack. Summary labels 15px, values 26px, hints 14px, numeric deadline 17px desktop / 15px mobile. Company headings 20px, body/buttons/inputs 16px, metric labels/status badges 14px. Form sections/labels 15px and modal headings 22px. More generous line heights and darker helper copy preserve readability.
- Spacing/layout: centered summary cards use 140px minimum height, 14px gaps and six / three / two responsive columns. Record cards use 24px desktop / 20px mobile padding, a divider before actions and wrapping action groups. Date and time can wrap only between their complete parts.
- Colors/tokens: preserve six pastel surfaces and existing custom-palette hooks. Statuses map consistently across records, details, comparison and form selection: amber `#fbbf24` / dark brown `#422006`, blue `#2563eb`, green `#15803d`, red `#dc2626`, purple `#7c3aed`, with white text for the last four. Solid text contrast ratios are 8.730, 5.169, 5.016, 4.829 and 5.699 respectively; all exceed 4.5:1. This is not a full accessibility certification.
- Image/asset quality: the selected content has no raster assets requiring generation. All page text and cards remain real editable UI; existing product icons and companion assets are retained.
- Copy/content: preserve business labels, actions, sample totals, filters and sorting. All displayed Offer deadlines use the numeric format; native date/time editing controls retain their standard browser input behavior. No preview legend or design instructions leak into the production page.

## Checks and interaction evidence

- `npm run lint`: passed.
- `npm run build`: passed after final source changes; pre-existing bundle-size and mixed JSZip import warnings remain.
- `git diff --check`: passed.
- Browser: regular Playwright with installed Chromium headless shell. The in-app Browser bootstrap was blocked by its missing `26.1013.40934/scripts/browser-service.mjs`; the selected browser was not a user requirement.
- Seven tested widths: 1920, 1440, 1280, 1024, 768, 390, 320px; no document, summary or record/action/metric horizontal overflow.
- Status filter -> one rejected record -> reset -> select two records -> compare -> return to list -> details -> edit status through all five colors -> cancel -> new Offer with enlarged AI importer -> mobile form scrolling -> persistent save/cancel footer -> Escape -> expanded-sidebar layout.
- Numeric date assertion: date only, exactly `2026.10.12` in the summary.
- Final browser run: 22 assertions passed, no runtime or console errors (including the final error-health assertion).

## Remaining limits and follow-up polish

- UI checks use isolated sample data. Authenticated production persistence, external AI/OCR APIs and cross-device native rendering were not tested or changed.
- The existing global companion can float over content on narrow screens; its behavior belongs to the app shell and is outside this Offer-only change.
- The shared page title/navigation retain their original sizes. Only Offer-owned content and its form/detail/comparison surfaces are enlarged.
- Build and browser evidence are local; this branch has not been deployed.

## Implementation checklist

- [x] Center all six statistics cards and enlarge the agreed type scale.
- [x] Keep numeric deadlines complete across responsive widths.
- [x] Use five distinct, legible saturated state colors throughout Offer surfaces.
- [x] Enlarge the importer, form, detail and comparison text.
- [x] Keep detail content reachable with a full viewport drawer.
- [x] Run local lint/build, browser interaction checks and visual comparisons.
