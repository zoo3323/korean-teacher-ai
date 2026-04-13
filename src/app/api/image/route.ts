import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url", { status: 400 });
  }

  // Vercel Blob URL만 허용
  if (!url.includes("blob.vercel-storage.com")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
