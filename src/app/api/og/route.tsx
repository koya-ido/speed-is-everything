import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);

    const clearCount = (searchParams.get("c") || "0").slice(0, 10);
    const remainingTime = (searchParams.get("r") || "0").slice(0, 10);
    const average = (searchParams.get("avg") || "0").slice(0, 10);
    const rank = (searchParams.get("rank") || "NORMAL").slice(0, 20);
    const device = (searchParams.get("d") || "PC").slice(0, 10);

    let rankColor = "#00f3ff";
    let rankTitle = "SPEED AGENT";
    let rankBadge = "NORMAL";

    if (rank === "GODLIKE") {
      rankColor = "#ffd700";
      rankTitle = "⚡ GODLIKE REFLEX ⚡";
      rankBadge = "GODLIKE";
    } else if (rank === "EXCELLENT") {
      rankColor = "#ff64ff";
      rankTitle = "★ HYPER REFLEX ★";
      rankBadge = "EXCELLENT";
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#050505",
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(0, 243, 255, 0.15), transparent 70%), radial-gradient(circle at 100% 100%, rgba(188, 19, 254, 0.15), transparent 60%)",
            padding: "50px 60px",
            fontFamily: "sans-serif",
            color: "#ffffff",
            position: "relative",
            border: "12px solid #111116",
          }}
        >
          {/* Top Brand Bar */}
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: "#00ff66",
                  boxShadow: "0 0 15px #00ff66",
                }}
              />
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  letterSpacing: "0.25em",
                  color: "#ffffff",
                }}
              >
                SPEED IS EVERYTHING
              </span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.2em",
                color: "#6b7280",
                textTransform: "uppercase",
              }}
            >
              MISSION REPORT // {device}
            </div>
          </div>

          {/* Center Main Stage */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "-10px",
            }}
          >
            {/* Rank Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 24px",
                borderRadius: "9999px",
                border: `2px solid ${rankColor}`,
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                boxShadow: `0 0 25px ${rankColor}40`,
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: "0.2em",
                  color: rankColor,
                }}
              >
                {rankTitle}
              </span>
            </div>

            {/* Clear Count Main Numbers */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
              <span
                style={{
                  fontSize: 120,
                  fontWeight: 900,
                  color: "#ffffff",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                  textShadow: "0 0 40px rgba(0, 243, 255, 0.5)",
                }}
              >
                {clearCount}
              </span>
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#00f3ff",
                  letterSpacing: "0.1em",
                }}
              >
                CLEARED
              </span>
            </div>
          </div>

          {/* Bottom Stats Grid */}
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              gap: "24px",
            }}
          >
            {/* Stat 1: Avg Speed */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "18px 24px",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#9ca3af",
                  letterSpacing: "0.15em",
                  marginBottom: "4px",
                }}
              >
                AVG REACTION
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: "#00ff66",
                  textShadow: "0 0 15px rgba(0, 255, 102, 0.6)",
                }}
              >
                {average} ms
              </span>
            </div>

            {/* Stat 2: Remaining Time */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "18px 24px",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#9ca3af",
                  letterSpacing: "0.15em",
                  marginBottom: "4px",
                }}
              >
                REMAINING
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: "#00f3ff",
                  textShadow: "0 0 15px rgba(0, 243, 255, 0.6)",
                }}
              >
                {remainingTime} ms
              </span>
            </div>

            {/* Stat 3: Rank Category */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "18px 24px",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#9ca3af",
                  letterSpacing: "0.15em",
                  marginBottom: "4px",
                }}
              >
                RANK RATING
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: rankColor,
                  textShadow: `0 0 15px ${rankColor}80`,
                }}
              >
                {rankBadge}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response("Failed to generate OG image", { status: 500 });
  }
}
