# Mobile bridge behavior and limits

The mobile entry installs `src/bridge.ts` only on Capacitor native platforms. The existing web application is not modified. Android's system Back button uses the web application's browser history, then offers to exit at its root. The native WebView supplies the file picker for the existing GST workbook import; a real device must confirm the formats and provider apps available.

CSV and Excel exports made through browser Blob links are captured before their object URLs are revoked, placed in the app's private cache, and offered to the system share sheet so the user can save or open them. An explicit HTTP(S) download link is fetched and shared; a direct HTTPS `.pdf` link is similarly offered to the share sheet, falling back to a browser when the server blocks the fetch. Downloads depend on network availability, cross-origin policy, and any server authentication. Cached exports may contain sensitive data and remain until the operating system clears app cache; they are shared only with the recipient selected by the user. The bridge does not implement an automatic public Downloads folder.

External HTTP(S) links open in the browser, and `mailto:`, `tel:`, and `sms:` links are handed to a suitable installed app. Unsupported popup schemes are not forwarded to native handlers. Availability of an email, dialer, or messaging app varies by device.

On Android, **More actions → Print page** opens the system print dialog for the current web view. `MobilePrintPlugin` is registered in the included `MainActivity`. The selected printer or Android's Save as PDF destination determines the output. To print a downloaded PDF, open it in a PDF viewer that supports printing. iOS printing is not implemented by this bridge. Validate layout and large exports on real devices; a successful web build alone does not validate native file selection, sharing, or print behavior.

The bridge does not add document storage or an email/SMS OTP provider. See the project audit for existing backend and document limitations. Password reset remains the existing application's flow; do not expose a development OTP in the mobile UI.
