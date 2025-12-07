document.addEventListener("DOMContentLoaded", () => {

    const idle = document.getElementById("introIdle");
    const c64Screen = document.getElementById("introC64");
    const typedLines = document.getElementById("typedLines");
    const speechText = document.getElementById("speechText");
    const skipBtn = document.getElementById("skipIntro");

    let introStarted = false;

    /* CLICK ANYWHERE TO START ------------------------------------------- */
    idle.addEventListener("click", startIntro);
    skipBtn.addEventListener("click", finishIntro);

    function startIntro() {
        if (introStarted) return;
        introStarted = true;

        idle.style.display = "none";

        c64Screen.classList.add("intro-c64-screen--visible");

        setTimeout(typeBootSequence, 900);
    }

    /* TYPING SEQUENCE --------------------------------------------------- */
    const lines = [
        'LOAD"*",8,1',
        "PRESS PLAY ON TAPE",
        "LOADING",
        'FOUND "CHEEKY COMMODORE GAMER"'
    ];

    let i = 0;

    function typeBootSequence() {
        if (i >= lines.length) {
            startSpeech();
            return;
        }

        const lineDiv = document.createElement("div");
        lineDiv.className = "intro-c64-line";

        typedLines.appendChild(lineDiv);

        typeLine(lines[i], lineDiv, () => {
            i++;
            setTimeout(typeBootSequence, 350);
        });
    }

    function typeLine(text, el, callback) {
        let idx = 0;

        function tick() {
            el.textContent = text.slice(0, idx);
            idx++;
            if (idx <= text.length) {
                setTimeout(tick, 40);
            } else {
                callback();
            }
        }
        tick();
    }

    /* SPEECH SEQUENCE --------------------------------------------------- */
    function startSpeech() {
        c64Screen.classList.add("intro-c64-screen--hidden");

        setTimeout(() => showSpeech("ANOTHER VISITOR..."), 300);
        setTimeout(() => showSpeech("STAY AWHILE..."), 1800);
        setTimeout(() => showSpeech('<span class="intro-forever">STAY FOREVER...</span>'), 3300);
        setTimeout(finishIntro, 5200);
    }

    function showSpeech(text) {
        speechText.innerHTML = text;
        speechText.classList.add("intro-speech-text--visible");
    }

    /* EXIT INTRO -------------------------------------------------------- */
    function finishIntro() {
        window.location.href = "home.html";
    }
});
