document.addEventListener("DOMContentLoaded", () => {

    const introIdle = document.getElementById("introIdle");
    const introC64 = document.getElementById("introC64");
    const typedLines = document.getElementById("typedLines");
    const skipBtn = document.getElementById("skipIntro");
    const fadeLayer = document.getElementById("introFade");
    const speechText = document.getElementById("speechText");

    // C64 audio speech
    const speechAudio = new Audio("resources/audio/another_visitor.mp3");
    speechAudio.preload = "auto";

    // Completely hide the C64 panel on load
    introC64.classList.remove("intro-c64-screen--visible");
    introC64.classList.add("intro-c64-screen--hidden");

    /* ----------------------------------------------------------
       CLICK TO POWER ON → START BOOT
    ---------------------------------------------------------- */
    introIdle.addEventListener("click", () => {

        // Hide idle text
        introIdle.classList.add("intro-idle--hidden");

        // Show C64 panel after fade
        setTimeout(() => {
            introC64.classList.remove("intro-c64-screen--hidden");
            introC64.classList.add("intro-c64-screen--visible");
        }, 600);

        // Start typing sequence AFTER panel appears
        setTimeout(startTyping, 1500);
    });

    /* ----------------------------------------------------------
       TYPEWRITER SEQUENCE
    ---------------------------------------------------------- */
    const commandLines = [
        `LOAD"*",8,1`,
        `PRESS PLAY ON TAPE`,
        `LOADING`,
        `FOUND "CHEEKY COMMODORE GAMER"`
    ];

    let currentLine = 0;

    function startTyping() {
        typeLine();
    }

    function typeLine() {
        if (currentLine >= commandLines.length) {
            revealSpeech();
            return;
        }

        let text = commandLines[currentLine];
        let charIndex = 0;

        let div = document.createElement("div");
        div.className = "intro-c64-line intro-c64-line--typed";
        typedLines.appendChild(div);

        const typer = setInterval(() => {
            div.textContent = text.substring(0, charIndex);
            charIndex++;

            if (charIndex > text.length) {
                clearInterval(typer);
                currentLine++;
                setTimeout(typeLine, 250);
            }
        }, 45);
    }

    /* ----------------------------------------------------------
       SID SPEECH SEQUENCE
    ---------------------------------------------------------- */
    function revealSpeech() {
        speechAudio.play().catch(() => {});

        const lines = [
            "ANOTHER VISITOR...",
            "STAY AWHILE...",
            "STAY FOREVER!"
        ];

        let i = 0;

        function nextLine() {
            if (i >= lines.length) {
                fadeOutToHome();
                return;
            }

            speechText.textContent = lines[i];
            speechText.classList.add("intro-speech-text--visible");

            setTimeout(() => {
                speechText.classList.remove("intro-speech-text--visible");
                setTimeout(() => {
                    i++;
                    nextLine();
                }, 250);
            }, 1600);
        }

        setTimeout(nextLine, 400);
    }

    /* ----------------------------------------------------------
       FADE TO HOME
    ---------------------------------------------------------- */
    function fadeOutToHome() {
        fadeLayer.classList.add("intro-fade--active");

        setTimeout(() => {
            window.location.href = "home.html";
        }, 700);
    }

    /* ----------------------------------------------------------
       SKIP BUTTON
    ---------------------------------------------------------- */
    skipBtn.addEventListener("click", () => {
        speechAudio.pause();
        fadeLayer.classList.add("intro-fade--active");

        setTimeout(() => {
            window.location.href = "home.html";
        }, 300);
    });
});
