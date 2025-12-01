// C64 Intro Controller — FINAL FIXED VERSION

document.addEventListener("DOMContentLoaded", () => {

    let audio = new Audio("resources/audio/c64_speech_stayawhile.mp3");
    audio.preload = "auto";
    audio.volume = 1;

    const unlock = document.getElementById("audioUnlock");
    const unlockBtn = document.getElementById("audio-btn");
    const skip = document.getElementById("skip-intro");

    let ended = false;

    function goHome() {
        if (ended) return;
        ended = true;

        try { audio.pause(); } catch(e){}
        window.location.href = "home.html";
    }

    function tryPlay() {
        audio.play()
        .then(() => {
            // success: hide overlay if visible
            unlock.style.display = "none";
        })
        .catch(() => {
            // failed: show overlay
            unlock.style.display = "block";
        });
    }

    // Skip button
    skip.addEventListener("click", goHome);

    // Overlay button
    unlockBtn.addEventListener("click", () => {
        unlock.style.display = "none";
        tryPlay();
    });

    // When the SID ends → move on
    audio.addEventListener("ended", goHome);

    // Safety fallback
    setTimeout(goHome, 15000);

    // Start immediately
    tryPlay();
});
