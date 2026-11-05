import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Social share image (1200 x 630), generated from the supplied logo and the
 * brand colors. Served at /og and referenced by every page's Open Graph tags.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const logo = await readFile(path.join(process.cwd(), "public/images/brand/vortix-logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#ffffff", fontFamily: "sans-serif" }}>
        <div style={{ height: 12, width: "100%", display: "flex", background: "linear-gradient(90deg, #0a72ba, #0e8ba7, #12a594)" }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 88px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={432} height={136} alt="" />
          <div style={{ marginTop: 48, fontSize: 56, fontWeight: 800, color: "#1d3b47", lineHeight: 1.1, display: "flex", flexWrap: "wrap" }}>
            Smarter Healthcare Operations.&nbsp;<span style={{ color: "#0a72ba" }}>Better Business Outcomes.</span>
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 16 }}>
            {["DME Services", "Medical Billing"].map((t) => (
              <div key={t} style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#085e99", background: "#eaf4fa", borderRadius: 8, padding: "10px 22px" }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
