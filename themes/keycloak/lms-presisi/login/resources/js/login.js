const toggle = document.getElementById('togglePassword');
const password = document.getElementById('password');

if (toggle && password) {
  toggle.addEventListener('click', () => {
    const isPassword = password.getAttribute('type') === 'password';
    password.setAttribute('type', isPassword ? 'text' : 'password');
    toggle.textContent = isPassword ? 'Tutup' : 'Lihat';
  });
}
