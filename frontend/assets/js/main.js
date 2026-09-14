/**
 * WorkOps Global Application Controller
 * Handles Theme Toggling, Responsive Sidebar, Toast Notifications & User Session
 */

import { ApiClient } from './api.js';

class AppController {
    constructor() {
        this.initTheme();
        this.initSidebar();
        this.initUserSession();
        this.initToastsContainer();
    }

    initTheme() {
        const savedTheme = localStorage.getItem('workops_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeBtn = document.getElementById('theme-toggle-btn');
        if (themeBtn) {
            this.updateThemeIcon(savedTheme);
            themeBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('workops_theme', next);
                this.updateThemeIcon(next);
            });
        }
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#theme-toggle-btn i');
        if (icon) {
            if (theme === 'light') {
                icon.className = 'fa-solid fa-moon';
            } else {
                icon.className = 'fa-solid fa-sun';
            }
        }
    }

    initSidebar() {
        const toggleBtn = document.getElementById('sidebar-toggle-btn');
        const sidebar = document.querySelector('.sidebar');
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (sidebar && sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                toggleBtn && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    initUserSession() {
        const user = ApiClient.getCurrentUser();
        const userNameElements = document.querySelectorAll('.session-user-name');
        const userRoleElements = document.querySelectorAll('.session-user-role');
        const userAvatarElements = document.querySelectorAll('.session-user-avatar');

        if (user) {
            this.applyRoleAccess(user);
            userNameElements.forEach(el => el.textContent = user.fullName || user.username);
            userRoleElements.forEach(el => el.textContent = user.designation || user.role);
            userAvatarElements.forEach(el => {
                const initials = (user.fullName || user.username || 'U')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                el.textContent = initials;
            });
        }
    }

    applyRoleAccess(user) {
        const roles = [user.role, ...(user.authorities || [])]
            .filter(Boolean)
            .map(role => role.toUpperCase());

        if (!roles.includes('ROLE_HR')) return;

        document.querySelectorAll('.nav-link-custom').forEach(link => {
            const isAttendanceLink = link.getAttribute('href')?.includes('attendance.html');
            if (!isAttendanceLink) link.remove();
        });

        document.querySelectorAll('.nav-header').forEach(header => header.remove());

        const isDashboard = window.location.pathname.endsWith('/dashboard.html');
        const isAttendancePage = window.location.pathname.endsWith('/pages/attendance.html');
        if (isDashboard && !isAttendancePage) {
            window.location.replace('pages/attendance.html');
        }
    }

    initToastsContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }

    showToast(type, message, title = '') {
        const icon = type === 'danger' ? 'error' : type;
        return Swal.fire({
            toast: true,
            position: 'top-end',
            icon,
            title: title || message,
            text: title ? message : undefined,
            showConfirmButton: false,
            timer: 4500,
            timerProgressBar: true
        });
    }
}

export const WorkOps = new AppController();
window.WorkOps = WorkOps;
