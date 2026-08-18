/**
 * Initializes Google Tag (gtag.js) and Microsoft Clarity dynamically
 * from environment variables (VITE_GTAG_ID and VITE_CLARITY_ID).
 */
export function initAnalytics() {
  if (typeof window === "undefined") return;

  const gtagId = import.meta.env.VITE_GTAG_ID;
  if (gtagId && !document.getElementById("gtag-script")) {
    const script = document.createElement("script");
    script.id = "gtag-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", gtagId);
  }

  const clarityId = import.meta.env.VITE_CLARITY_ID;
  if (clarityId && !window.clarity) {
    (function (c, l, a, r, i, t, y) {
      c[a] =
        c[a] ||
        function () {
          (c[a].q = c[a].q || []).push(arguments);
        };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + encodeURIComponent(i);
      y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
  }
}
