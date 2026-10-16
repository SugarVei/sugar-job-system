# 热门公司附图修正核对

final result: passed

## Source and implementation

The user's latest attached image is the source of truth. The earlier directory/dropdown design is superseded.

- Original source: C:/Temp/codex-clipboard-bd04eeed-d371-4a59-8570-3ab4df407b10.png
- Preserved source: design-qa-assets/corrected-target.png
- Working preview: http://127.0.0.1:4187/hot-companies-preview.html?layout=side-panel
- Desktop screenshot: design-qa-assets/corrected-desktop.png
- Full comparison, source left and implementation right: design-qa-assets/corrected-comparison-full.png
- Focused panel comparison at original density: design-qa-assets/corrected-comparison-panel.png
- Mobile screenshots: design-qa-assets/corrected-mobile-cards.png and corrected-mobile-panel.png
- Desktop source, CSS viewport and output are all 1487 x 1058, device scale 1. No density normalization was needed. Focused panel crops are 344 x 834 each.
- Comparison state: light warm surface, expanded app sidebar, first page, scroll top 0, discovery panel expanded and Resume selected, no file selected.

## Comparison history

1. [P1, resolved] The previous implementation used the wrong visual target. Replaced the list and discovery popover with the attached two-column card layout and a persistent right-side discovery panel. Default mode is Resume; AI and Excel switch within the same panel.
2. [P2, resolved] The first corrected render had the content about 25px too low. Reduced header/status-strip spacing and adjusted main padding. Final panel is x=1129, y=199.66, width=344, height=834, against the source panel around x=1127, y=197. First card is x=318, y=389.66, width=380.5, height=137. Source card is around x=316, y=388, width=381, height=136.
3. [P2, resolved] Early panel labels were too small and the upload icon lacked the reference's text lines. Increased tab, description, consent, option and primary-action text; used the existing outline FileText library icon. Final upload well is 302 x 180; primary action is 302 x 48. Recaptured and compared both full view and focused panel after this change.

No remaining actionable P0/P1/P2 findings in the reviewed states.

## Required fidelity surfaces

- Typography: system sans-serif with Chinese UI fallbacks, 34px page title, 27px panel title, 18px tool title, 16px company names and main action. Platform font rasterization differs from the generated reference; the hierarchy and wrapping have been checked.
- Spacing/layout: five separated status totals, search plus filter button, three aligned selectors, two company columns, right panel 344px wide, persistent pagination, segmented AI/Resume/Excel modes. Panel geometry and first-card position closely match the attached target. Existing sidebar navigation remains functional, with its account and footer arrangement styled for this module.
- Color/tokens: the user approved the attached layout and then requested colors to follow the selected site theme. Company cards use stable name-based tint slots. All six presets update card surfaces, initials, panel, tabs, selected preferences, pagination and focus colors. Custom palettes reuse the existing five card slots and contrast-safe foregrounds. Recruitment status colors retain their meaning. The reference black primary action is retained.
- Images/icons: preserved the source application's native company-initial avatars with its existing initialOf helper and stable paletteSlot mapping, matching the attached design's text-avatar treatment. Icons come from the installed outline library. No generated corporate logos or approximated brand marks are introduced. Unused logo assets from the superseded concept were archived outside the worktree.
- Copy/content: matches 发现公司, AI / 简历 / Excel, 通过简历找公司, 上传简历, 匹配偏好, 开始匹配 and administrator-only Excel messaging. Consent and account-private results remain in place. Existing additional preferences are available through 更多. The application uses its catalog and audit data instead of copying fictional company counts or dates from the source image.

## Interaction evidence

Checked in the isolated Playwright browser previously authorized by the user:

- Responsive layouts at 320, 390, 768, 1280 and 1487px; no horizontal document overflow. A fresh mobile load starts with discovery collapsed. Opening it uses a single inline panel.
- Administrator has AI, Resume and Excel tabs. Ordinary user has only AI and Resume. End-key navigation selects the last available tab.
- AI search returns the in-memory example candidate. Prompt survives tab changes and panel collapse/reopen.
- Resume selection, 科技 preference, required consent, and mocked upload/parse/match/save flow completed with one displayed recommendation.
- Actual XLSX fixture parsing, change-preview dialog, cancel, collapse/reopen and preserved file selection. Evidence: design-qa-assets/corrected-excel-confirm.png.
- Next page changes page index to 1; empty-search/reset returns to page 0. Full pages remain bounded to 48 cards. Direct-page selection and numbered controls remain available.
- All existing website, evidence, applied-record and private-delete handlers remain connected to the card actions.
- Browser console: zero errors in final checks. Existing xlsx-js-style stream compatibility warning remains; the workbook parser flow passed.

## Validation and scope

- Production build passed after the final font/icon adjustment. Existing chunk-size and JSZip import warnings remain.
- Targeted ESLint passed on changed TSX components.
- Existing standardCompanyImport, standardCompanyWorkbook and standardCatalogAdmin tests plus customPalette tests: 25 passed.
- git diff --check passed.
- Preview uses a fake Supabase origin and in-memory API/storage/database responses. It does not sign in to a real account, call paid AI, or write production data.
- Release target: existing GitHub main to the sugarvresume production project, https://www.sugarv.mom/. Production asset and browser verification follows the push; simulated API checks do not prove real-account writes or live AI matching.

## Accepted P3 differences

- Current navigation includes the existing 求职小镇 entry and current theme/command controls; none were removed to mimic the illustrative image.
- Company names, counts and audit dates differ because the existing catalog is used. The preview is explicitly labelled as example data.
- Small platform-dependent font and icon-weight differences remain.

## Completion checklist

- [x] Latest attached image is the sole layout target.
- [x] Corrected two-column cards plus right discovery panel.
- [x] Functional modes, collapse/reopen, persistent selections and administrator checks.
- [x] Source and final screenshots reviewed together at the same viewport/state.
- [x] Required typography, layout, palette, assets and copy checks complete.
- [x] Build, lint, 25 relevant tests and local interaction checks pass.

## Theme follow-up verification (2026-10-16)

- Checked every preset through the existing theme switcher; all six produced distinct card, initial, panel and selected-tab colors.
- Applied a five-color custom palette through the actual palette-studio iframe bridge. Multiple company card hues and readable matching foregrounds appeared; custom selection persisted after reload.
- Verified no document overflow at 320, 390, 768, 1280 and 1487px.
- Browser console: no errors.
- Evidence: design-qa-assets/theme-blue.png and design-qa-assets/theme-custom.png.
- AI and resume result cards and the compact Excel upload area also inherit the selected theme. Shared components preserve their normal appearance outside the compact panel.

## Sidebar restoration requested after release (2026-10-16)

- The user requested the original sidebar with the avatar/account control at the bottom. Removed all HotCompanies-specific sidebar sizing, reordering, avatar, typography and footer overrides.
- The shared sidebar CSS is once again authoritative: 248px expanded and 64px collapsed, with navigation above the AI settings/logout/account footer. The account is the last item at the bottom.
- At 1487 x 1058: sidebar width 248, footer y=887, account y=991 with height 55 and 12px bottom inset.
- Checked account dialog open/close, collapse/expand, and 390/1280/1487px without horizontal overflow. The company card and discovery panel design and theme tokens remain in place.
- Evidence: design-qa-assets/restored-sidebar.png. Build and whitespace checks passed.
