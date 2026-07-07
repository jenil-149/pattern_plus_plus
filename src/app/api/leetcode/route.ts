import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://leetcode.com/",
        "Origin": "https://leetcode.com",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "x-csrftoken": "null",
      },
      body: JSON.stringify(body),
      // Bypass Next.js fetch cache — always fetch fresh from LeetCode
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `LeetCode returned status ${response.status}` },
        { status: response.status }
      );
    }

    const json = await response.json();
    return NextResponse.json(json);
  } catch (err) {
    console.error("LeetCode proxy error:", err);
    return NextResponse.json(
      { error: "Failed to reach LeetCode API" },
      { status: 502 }
    );
  }
}
