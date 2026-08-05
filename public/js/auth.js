/**
 * PharmaOrder Authentication & Password Handler
 */
const Auth = {
  currentUser: null,

  init() {
    this.setupThemeToggle();
    this.setupLocalLoginForm();
    this.setupChangePasswordForm();
    this.checkExistingSession();

    window.addEventListener('auth:unauthorized', () => {
      this.logout('Session expired. Please sign in again.');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      this.logout('Logged out successfully.');
    });
  },

  setupThemeToggle() {
    const savedTheme = localStorage.getItem('pharma_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('pharma_theme', newTheme);
      });
    }
  },

  setupLocalLoginForm() {
    const form = document.getElementById('localLoginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('adminUser').value;
      const password = document.getElementById('adminPass').value;
      const loadingElem = document.getElementById('loginLoading');
      const errorElem = document.getElementById('authErrorMsg');

      if (loadingElem) loadingElem.classList.remove('hidden');
      if (errorElem) errorElem.classList.add('hidden');

      try {
        const res = await API.loginLocal(username, password);
        if (res.success && res.token && res.user) {
          API.setToken(res.token);
          this.currentUser = res.user;
          App.showToast('Welcome, ' + res.user.name + '!', 'success');
          this.showDashboardView(res.user);
        } else {
          throw new Error(res.error || 'Admin login failed');
        }
      } catch (err) {
        if (errorElem) {
          errorElem.textContent = err.message || 'Invalid username or password.';
          errorElem.classList.remove('hidden');
        }
        App.showToast(err.message || 'Authentication failed', 'error');
      } finally {
        if (loadingElem) loadingElem.classList.add('hidden');
      }
    });
  },

  setupChangePasswordForm() {
    const openBtn = document.getElementById('openChangePasswordBtn');
    const closeBtn = document.getElementById('closeChangePasswordBtn');
    const cancelBtn = document.getElementById('cancelChangePasswordBtn');
    const modal = document.getElementById('changePasswordModal');
    const form = document.getElementById('changePasswordForm');
    const errorMsg = document.getElementById('passwordErrorMsg');

    const openModal = () => {
      form.reset();
      if (errorMsg) errorMsg.classList.add('hidden');
      if (modal) modal.classList.remove('hidden');
    };

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
    };

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirmNewPass = document.getElementById('confirmNewPass').value;
        const saveBtn = document.getElementById('savePasswordBtn');

        if (errorMsg) errorMsg.classList.add('hidden');

        if (newPass !== confirmNewPass) {
          if (errorMsg) {
            errorMsg.textContent = 'New passwords do not match.';
            errorMsg.classList.remove('hidden');
          }
          return;
        }

        saveBtn.disabled = true;

        try {
          const res = await API.changePassword(currentPass, newPass);
          if (res.success) {
            App.showToast('Admin password updated successfully!', 'success');
            closeModal();
          } else {
            throw new Error(res.error || 'Failed to update password');
          }
        } catch (err) {
          if (errorMsg) {
            errorMsg.textContent = err.message || 'Password update failed.';
            errorMsg.classList.remove('hidden');
          }
          App.showToast(err.message || 'Password update error', 'error');
        } finally {
          saveBtn.disabled = false;
        }
      });
    }
  },

  async checkExistingSession() {
    const token = API.getToken();
    if (!token) {
      this.showLoginView();
      return;
    }

    try {
      const response = await API.getCurrentUser();
      if (response.success && response.user) {
        this.currentUser = response.user;
        this.showDashboardView(response.user);
      } else {
        this.logout();
      }
    } catch (error) {
      console.warn('Session verification failed:', error);
      this.logout();
    }
  },

  showLoginView() {
    document.getElementById('loginSection')?.classList.remove('hidden');
    document.getElementById('dashboardSection')?.classList.add('hidden');
    document.getElementById('userProfile')?.classList.add('hidden');
  },

  showDashboardView(user) {
    document.getElementById('loginSection')?.classList.add('hidden');
    document.getElementById('dashboardSection')?.classList.remove('hidden');
    document.getElementById('userProfile')?.classList.remove('hidden');

    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('userName');
    const email = document.getElementById('userEmail');

    if (avatar) avatar.src = user.picture || 'https://ui-avatars.com/api/?name=Pharmacy+Admin&background=059669&color=fff';
    if (name) name.textContent = user.name || 'Pharmacy Admin';
    if (email) email.textContent = user.email || 'admin@pharmacy.com';

    if (window.App && typeof window.App.loadOrders === 'function') {
      window.App.loadOrders();
    }
  },

  logout(message = 'Logged out successfully.') {
    API.removeToken();
    this.currentUser = null;
    this.showLoginView();
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(message, 'info');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
