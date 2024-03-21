import { auth } from "@clerk/nextjs";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { checkApiLimit, incrementApiLimit } from "@/lib/api-limit";
import { checkSubscription } from "@/lib/subscription";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI docs: https://platform.openai.com/docs/api-reference/images/create?lang=node.js
// Must be of
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { prompt, amount = 1, resolution = "512x512" } = body;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }
    if (!amount) {
      return new NextResponse("Amount is required", { status: 400 });
    }
    if (!resolution) {
      return new NextResponse("Resolution is required", { status: 400 });
    }
    const freeTrial = await checkApiLimit();
    const isPro = await checkSubscription();
    if (!freeTrial && !isPro) {
      return new NextResponse("Free trial has expired.", { status: 403 });
    }
    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt,
      n: parseInt(amount, 10),
      size: resolution,
    });
    await incrementApiLimit();
    return NextResponse.json(response.data);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
