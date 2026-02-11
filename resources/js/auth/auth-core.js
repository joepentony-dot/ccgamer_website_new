import { supabase } from './supabase-client.js';

function clean(value) {
  return String(value ?? '').trim();
}

export async function registerUser(email, password) {
  const safeEmail = clean(email);
  const safePassword = clean(password);

  if (!safeEmail || !safePassword) {
    return { error: { message: 'Email and password are required.' } };
  }

  return supabase.auth.signUp({
    email: safeEmail,
    password: safePassword
  });
}

export async function loginUser(email, password) {
  const safeEmail = clean(email);
  const safePassword = clean(password);

  if (!safeEmail || !safePassword) {
    return { error: { message: 'Email and password are required.' } };
  }

  return supabase.auth.signInWithPassword({
    email: safeEmail,
    password: safePassword
  });
}

export async function logoutUser() {
  return supabase.auth.signOut();
}

export async function sendPasswordReset(email, redirectTo) {
  const safeEmail = clean(email);

  if (!safeEmail) {
    return { error: { message: 'Email is required.' } };
  }

  return supabase.auth.resetPasswordForEmail(safeEmail, {
    redirectTo
  });
}

export async function updatePassword(newPassword) {
  const safePassword = clean(newPassword);

  if (!safePassword) {
    return { error: { message: 'New password is required.' } };
  }

  return supabase.auth.updateUser({
    password: safePassword
  });
}

export async function getCurrentUser() {
  return supabase.auth.getUser();
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
