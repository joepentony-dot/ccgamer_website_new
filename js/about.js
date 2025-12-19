(function () {
    const interactive = document.querySelectorAll('[data-about-sfx]');
    if (!interactive.length) return;

    const clickSound = new Audio('resources/css/audio/amiga_floppy_click.mp3');
    clickSound.volume = 0.35;

    const playSound = () => {
        try {
            clickSound.currentTime = 0;
            clickSound.play();
        } catch (err) {
            // fail silently to avoid blocking interaction
        }
    };

    const flashGlow = (element) => {
        element.classList.add('about-cta--active');
        element.classList.add('about-glow');
        window.setTimeout(() => {
            element.classList.remove('about-cta--active');
            element.classList.remove('about-glow');
        }, 350);
    };

    interactive.forEach((el) => {
        el.addEventListener('click', () => {
            playSound();
            flashGlow(el);
        });
    });
})();
