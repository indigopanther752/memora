const authForm = document.getElementById('auth-form');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const messageEl = document.getElementById('message');

authForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  });
  if (error && messageEl) messageEl.textContent = error.message;
});

signupBtn?.addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signUp({
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  });
  if (messageEl) {
    messageEl.textContent = error ? error.message : 'Check your email to confirm!';
  }
});

logoutBtn?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  const isLoginPage = window.location.pathname.endsWith('login.html');

  if (session && isLoginPage) {
    window.location.href = 'index.html';
  } else if (!session && !isLoginPage) {
    window.location.href = 'login.html';
  }
});

const statusTitle = document.getElementById('mood-status-title');
if (statusTitle) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  statusTitle.textContent = `Choose a mood to update ${today}.`;

  document.querySelectorAll('.mood-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chosenMood = btn.dataset.mood;
      statusTitle.textContent = `Mood updated to "${chosenMood}" for ${today}!`;
    });
  });
}