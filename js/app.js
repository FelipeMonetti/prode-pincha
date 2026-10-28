// Punto de entrada de la app
// Maneja: mostrar login o app, navegación entre secciones
import { loginWithGoogle, logout, getCurrentPlayer, onAuthChange } from './auth.js';

// Referencias al DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const playerName = document.getElementById('player-name');
const navButtons = document.querySelectorAll('.nav-btn');

// --- Login / Logout ---

btnLogin.addEventListener('click', loginWithGoogle);
btnLogout.addEventListener('click', logout);

// --- Navegación entre secciones ---

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.section;

    // Actualizar botón activo
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Mostrar sección correspondiente
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`section-${target}`).classList.remove('hidden');
  });
});

// --- Cambio de sesión ---
// Se ejecuta cuando el usuario se loguea o desloguea

onAuthChange(async (event, session) => {
  if (session) {
    // Hay sesión activa — mostrar la app
    const player = await getCurrentPlayer();

    if (player) {
      // El usuario está registrado como jugador
      playerName.textContent = player.name;
      loginScreen.classList.add('hidden');
      appScreen.classList.remove('hidden');

      // TODO: cargar partidos y tabla
    } else {
      // Logueado pero no es un jugador registrado
      alert('Tu cuenta no está registrada como jugador del prode.');
      loginScreen.classList.remove('hidden');
      appScreen.classList.add('hidden');
    }
  } else {
    // No hay sesión — mostrar login
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});
