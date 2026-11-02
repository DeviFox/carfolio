import Script from "next/script";

const GA_ID = "G-BJ6HFQK0P9";

/**
 * Google tag (gtag.js). SPA route changes are tracked by GA4 enhanced
 * measurement ("page changes based on browser history events"), so no
 * manual page_view hits are sent here.
 */
export function GoogleTag() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
