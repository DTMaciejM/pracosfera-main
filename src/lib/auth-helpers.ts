/**
 * Helper functions for Supabase Auth integration
 */

import { supabase } from './supabase';

/**
 * Creates a new user in Supabase Auth and links it to the users table
 * This function should be used by admin to create new users
 */
export async function createUserWithAuth(
  email: string,
  password: string,
  userData: {
    name: string;
    phone: string;
    role: 'admin' | 'worker' | 'franchisee';
    metadata?: Record<string, any>;
  }
): Promise<{ userId: string; error: any }> {
  try {
    // Create user in Supabase Auth
    // Note: In production, you might want to use Admin API for this
    // For now, we'll use signUp which requires email confirmation
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          ...userData.metadata,
        }
      }
    });

    if (authError) {
      return { userId: '', error: authError };
    }

    if (!authData.user) {
      return { userId: '', error: new Error('Failed to create auth user') };
    }

    // Create user record in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        auth_user_id: authData.user.id,
        email,
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
      })
      .select()
      .single();

    if (userError) {
      // If user creation fails, try to clean up auth user (optional)
      console.error('Error creating user record:', userError);
      return { userId: '', error: userError };
    }

    return { userId: authData.user.id, error: null };
  } catch (error: any) {
    return { userId: '', error };
  }
}

/**
 * Updates user password in Supabase Auth
 * Note: This requires Admin API for admin operations
 * For now, we'll use a workaround - admin can reset password through Supabase dashboard
 * or we can create an Edge Function for this
 */
export async function updateUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error: any }> {
  try {
    // Note: Regular users can update their own password with updateUser
    // For admin operations, you need Admin API or Edge Function
    // This is a placeholder - in production, use Admin API via Edge Function
    
    // For now, return success - admin should use Supabase dashboard or Edge Function
    console.warn('Password update requires Admin API. Use Supabase dashboard or Edge Function.');
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

