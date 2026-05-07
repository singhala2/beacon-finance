import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { plaid, Products, CountryCode } from '@/lib/plaid';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const response = await plaid.linkTokenCreate({
    user: { client_user_id: session.user.id },
    client_name: 'Beacon',
    products: [Products.Transactions, Products.Investments],
    country_codes: [CountryCode.Us],
    language: 'en',
  });

  return NextResponse.json({
    link_token: response.data.link_token,
    expiration: response.data.expiration,
  });
}
