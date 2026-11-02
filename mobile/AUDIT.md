# Existing application audit

This audit describes the checked-in source, not a verification of the currently deployed server. The mobile build reuses the existing React application and its existing API; it does not provision a second database or accounts.

## Application and features

The web application is React, TypeScript, Vite, and Tailwind. It provides role-based dashboards and navigation for partners/directors, administrators, accounts/team leaders, staff, and clients. The source includes task assignment, status, comments and approvals; client records, discussions and approvals; GST compliance and income-tax registers; accounting control and document movement; billing, revenue and reports; inquiries; calendar and announcements; user settings, login history and notifications. Availability is role-dependent. Leave and salary are marked as coming soon in the sidebar; some other screens contain placeholder data. See `src/app/App.tsx`, `src/app/components/Sidebar.tsx`, and the feature documents under `docs/`.

The web UI already has a mobile drawer, responsive classes, and browser-history navigation. It uses browser file pickers and generates CSV/Excel downloads. The source has browser push notifications and geolocation support; native push and location behavior require separate device verification. No existing Android or iOS native project was found in the original application.

## Backend and account model

`src/app/services/api.ts` calls the Supabase Edge Function `make-server-0abfa7cf`; `supabase/functions/server/index.tsx` implements routes against Supabase. The project reference and public anonymous key are in `utils/supabase/info.tsx`. Some realtime/push code also uses Supabase. The checked-in server uses a service-role client. No server, database, configuration, deployment or existing web source is changed by this mobile project.

Login is a custom email/password endpoint. The returned user object is persisted in browser local storage as `kaps_user`; the API sends the public anonymous key as its bearer credential, and several actions pass an actor ID from that local storage. The source does not show a per-user authenticated session attached to each API request. The checked-in server performs some role checks, but review and enforce identity and authorization on every sensitive endpoint before distributing an app. A packaged mobile app does not make the anonymous key or local storage secret. The deployed server and database policies may differ from the checked-in source and were not verified here.

## Recovery and files

The existing forgot-password UI calls the server's send, verify and reset OTP endpoints. In the checked-in server, mobile OTP reports that it is not configured; email/SMS delivery is a TODO, and the send endpoint logs and returns a development OTP. Therefore this flow must not be considered production-ready until the backend is repaired and tested. The code also uses `Math.random()` for the code. The existing change-password screen is separate. Backend work is outside this mobile project and the user's permitted scope.

The GST workbook import reads a selected Excel file in the browser and sends its parsed contents to the API. The client document-upload component, by contrast, records a fabricated path and posts to a relative `/api/documents` endpoint; it does not upload file contents to storage. The client dashboard also contains sample document entries. A native file picker cannot make that underlying document workflow functional; it needs a real storage/API implementation. Existing exports create browser Blobs, and the mobile shell's download/share handling must be tested with the actual generated files on devices. PDF viewing, download and printing depend on the implemented shell and the source of the PDF; this repository does not provide a complete document storage workflow.

## Verification boundaries

No real account, customer record, OTP, external service, production data or database mutation was used in this audit. Device tests, production configuration, authorization review, recovery delivery, native notification behavior and app-store signing/release requirements remain separate work.
