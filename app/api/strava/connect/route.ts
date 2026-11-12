import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { appUrl, createState, getAuthorizeUrl } from "@/lib/strava";

// Inicia o OAuth do Strava. O state leva o userId do Clerk assinado (validado no callback).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(`${appUrl()}/entrar`);
  return NextResponse.redirect(getAuthorizeUrl(createState(userId)));
}
