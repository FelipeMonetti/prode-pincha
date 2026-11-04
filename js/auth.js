// Autenticación con Google via Supabase Auth
import { supabase } from './supabase.js';

// Login con Google — redirige a Google OAuth
export async function loginWithGoogle() {
  console.log('loginWithGoogle() llamado');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });

  console.log('signInWithOAuth resultado:', JSON.stringify({ data, error }));

  if (error) {
    console.error('Error en login:', error.message);
    alert('Error al iniciar sesión: ' + error.message);
  } else if (data?.url) {
    console.log('Redirigiendo a:', data.url);
    window.location.href = data.url;
  } else {
    console.warn('No hubo error pero tampoco URL de redirección');
  }
}

// Logout
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error en logout:', error.message);
  }
}

// Obtener el usuario actual (null si no hay sesión)
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Obtener el player de la tabla players que corresponde al usuario logueado
export async function getCurrentPlayer() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  return player;
}

// Escuchar cambios de sesión (login/logout)
// callback recibe (event, session) — event: 'SIGNED_IN', 'SIGNED_OUT', etc.
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange(callback);
}
