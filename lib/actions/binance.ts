'use server';

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase/server';
import { encryptSecret } from '@/lib/crypto/kms';
import { verifyBinanceAccount } from '@/lib/binance/client';
import { FormState } from './types';

export async function connectBinanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const apiKey = (formData.get('apiKey') as string)?.trim();
  const apiSecret = (formData.get('apiSecret') as string)?.trim();

  const fieldErrors: Record<string, string> = {};
  if (!apiKey || apiKey.length < 20) fieldErrors.apiKey = 'That doesn\'t look like a valid Binance API key.';
  if (!apiSecret || apiSecret.length < 20) fieldErrors.apiSecret = 'That doesn\'t look like a valid Binance secret key.';
  if (Object.keys(fieldErrors).length) return { status: 'error', fieldErrors };

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'error', message: 'Session expired — please log in again.' };

  let verified;
  try {
    verified = await verifyBinanceAccount(apiKey, apiSecret);
  } catch (e: any) {
    // Surface Binance's own rejection reason (bad key, withdraw permission, IP restriction, etc.)
    return { status: 'error', fieldErrors: { apiKey: e.message } };
  }

  if (!verified.canTrade) {
    return { status: 'error', fieldErrors: { apiKey: 'This key does not have trading permission enabled.' } };
  }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('users')
    .update({
      binance_api_key_enc: encryptSecret(apiKey),
      binance_secret_enc: encryptSecret(apiSecret),
      binance_verified_capital_usdt: verified.usdtBalance,
      binance_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { status: 'error', message: 'Could not save your connection. Please try again.' };

  return { status: 'success', message: `Connected. Verified balance: ${verified.usdtBalance.toFixed(2)} USDT.` };
}
