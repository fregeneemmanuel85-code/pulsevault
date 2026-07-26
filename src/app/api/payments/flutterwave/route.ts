import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PLANS } from '@/lib/plans';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    const { userId, planId, email, name } = await request.json();

    if (!userId || !planId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const plan = PLANS[planId];
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (plan.price === 0) {
      await updateDoc(doc(db, 'users', userId), {
        plan: planId,
        planStatus: 'active',
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, plan: planId });
    }

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: `pulsevault-${userId}-${planId}-${Date.now()}`,
        amount: plan.price,
        currency: plan.currency,
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?verify=true`,
        meta: { userId, planId },
        customer: { email, name: name || email },
        customizations: {
          title: `PulseVault ${plan.name} Plan`,
          description: `${plan.maxWebsites} websites, ${plan.checkIntervalMinutes}min checks`,
          logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.svg`,
        },
        payment_options: 'card,ussd,mobilemoney,mpesa',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Payment failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, paymentLink: data.data.link });
  } catch (error) {
    console.error('Flutterwave error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transaction_id');

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });

    const data = await response.json();

    if (!response.ok || data.status !== 'success') {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { meta } = data.data;
    const { userId, planId } = meta;

    await updateDoc(doc(db, 'users', userId), {
      plan: planId,
      planStatus: 'active',
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, plan: planId });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
