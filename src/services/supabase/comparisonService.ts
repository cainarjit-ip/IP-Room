import { supabase, isValidUUID, getAuthenticatedSessionUser } from '../../lib/supabase';

/**
 * Fetch comparison list room IDs for the authenticated user.
 * Strictly checks for authenticated session and valid UUID identifiers.
 */
export const getUserComparisonRoomIds = async (userId: string | null | undefined): Promise<string[]> => {
  if (!isValidUUID(userId)) {
    return [];
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('comparison_lists')
      .select('room_id')
      .eq('user_id', userId as string);

    if (error) {
      return [];
    }

    return (data || []).map((row: any) => row.room_id);
  } catch {
    return [];
  }
};

/**
 * Toggle room in comparison list in Supabase
 */
export const toggleComparisonItem = async (
  userId: string | null | undefined,
  roomId: string,
  isCurrentlyCompared: boolean
): Promise<boolean> => {
  if (!isValidUUID(userId) || !isValidUUID(roomId)) {
    return false;
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return false;
  }

  try {
    if (isCurrentlyCompared) {
      const { error } = await supabase
        .from('comparison_lists')
        .delete()
        .eq('user_id', userId as string)
        .eq('room_id', roomId);
      return !error;
    } else {
      const { error } = await supabase
        .from('comparison_lists')
        .upsert(
          { user_id: userId as string, room_id: roomId } as any,
          { onConflict: 'user_id,room_id' }
        );
      return !error;
    }
  } catch (err: any) {
    console.warn('Exception in toggleComparisonItem:', err?.message);
    return false;
  }
};

/**
 * Clear comparison list for user
 */
export const clearUserComparisons = async (userId: string | null | undefined): Promise<boolean> => {
  if (!isValidUUID(userId)) {
    return false;
  }

  const authUser = await getAuthenticatedSessionUser();
  if (!authUser || authUser.id !== userId) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('comparison_lists')
      .delete()
      .eq('user_id', userId as string);
    return !error;
  } catch (err) {
    console.warn('Exception in clearUserComparisons:', err);
    return false;
  }
};
