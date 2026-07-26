import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json(
        { verified: false, message: "Reference required" },
        { status: 400 },
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json(
        { verified: false, message: "Server configuration error" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      },
    );

    const data = await response.json();

    if (!data.status || data.data?.status !== "success") {
      return NextResponse.json(
        { verified: false, message: "Payment verification failed" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      verified: true,
      amount: data.data.amount,
      reference: data.data.reference,
      planId: data.data.metadata?.planId,
      paidAt: data.data.paid_at,
    });
  } catch (error: any) {
    return NextResponse.json(
      { verified: false, message: error.message },
      { status: 500 },
    );
  }
}
