document.addEventListener('DOMContentLoaded', () => {
    const currentTheme = localStorage.getItem('portal_theme') || 'system';
    const radioBtn = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
    if(radioBtn) radioBtn.checked = true;

    document.querySelectorAll('input[name="theme"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            localStorage.setItem('portal_theme', newTheme);
            if(typeof applyTheme === 'function') applyTheme(newTheme);
        });
    });
});