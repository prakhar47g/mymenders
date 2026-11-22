import { dangerouslyDeleteByTag } from '@vercel/functions';

export const PUBLIC_MENDERS_CACHE_TAG = 'public-menders';

export async function purgePublicMendersCache(action, menderId) {
  try {
    await dangerouslyDeleteByTag(PUBLIC_MENDERS_CACHE_TAG);
  } catch (error) {
    console.error('Failed to purge the public mender list cache', { action, menderId, error });
  }
}
