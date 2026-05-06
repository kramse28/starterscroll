(function () {
    "use strict";

    const STORAGE_KEY = "starterscroll-character-name";
    const STORAGE_CLASS_INDEX_KEY = "starterscroll-createinfo-class-index";
    const STORAGE_AVATAR_KEY = "starterscroll-current-avatar-image";
    const STORAGE_VISUAL_KEY = "starterscroll-createvisual-v1";
    const STORAGE_SAVED_CHARACTERS_KEY = "starterscroll-saved-characters-v1";
    const MIN_FONT_PX = 9;

    /** Overlay art in assets/createclass (information layer; base scroll stays createinfo.png). */
    const CLASS_OVERLAYS = [
        { id: "barbarian", file: "createbarbarian.png", label: "Barbarian" },
        { id: "bard", file: "createbard.png", label: "Bard" },
        { id: "cleric", file: "createcleric.png", label: "Cleric" },
        { id: "druid", file: "createdruid.png", label: "Druid" },
        { id: "fighter", file: "createfighter.png", label: "Fighter" },
        { id: "monk", file: "createmonk.png", label: "Monk" },
        { id: "paladin", file: "createpaladin.png", label: "Paladin" },
        { id: "ranger", file: "createranger.png", label: "Ranger" },
        { id: "rogue", file: "createrogue.png", label: "Rogue" },
        { id: "sorcerer", file: "createsorcerer.png", label: "Sorcerer" },
        { id: "warlock", file: "createwarlock.png", label: "Warlock" },
        { id: "wizard", file: "createwizard.png", label: "Wizard" },
    ];

    function normalizeClassIndex(index) {
        const n = CLASS_OVERLAYS.length;
        return ((index % n) + n) % n;
    }

    function clearClassOverlay(overlay) {
        overlay.style.backgroundImage = "none";
        overlay.removeAttribute("data-class-index");
        overlay.removeAttribute("data-class-id");
        overlay.dataset.overlayActive = "0";

        const main = overlay.closest("main.create-info");
        if (main) {
            main.removeAttribute("data-class-index");
            main.removeAttribute("data-class-id");
        }

        const live = document.getElementById("class-selection-live");
        if (live) {
            live.textContent =
                "No class overlay. Original scroll only. Use arrows to show class information.";
        }

        const prevBtn = document.querySelector(".createinfo-class-arrow-prev");
        const nextBtn = document.querySelector(".createinfo-class-arrow-next");
        if (prevBtn) {
            prevBtn.setAttribute("aria-label", "Previous class information");
        }
        if (nextBtn) {
            nextBtn.setAttribute("aria-label", "Next class information");
        }
    }

    function overlayHasClass(overlay) {
        return overlay.dataset.overlayActive === "1";
    }

    function applyClassOverlay(overlay, index, options) {
        const skipSave = options && options.skipSave;
        const i = normalizeClassIndex(index);
        const item = CLASS_OVERLAYS[i];
        const url = "assets/createclass/" + item.file;
        overlay.style.backgroundImage = 'url("' + url + '")';
        overlay.dataset.classIndex = String(i);
        overlay.dataset.classId = item.id;
        overlay.dataset.overlayActive = "1";

        const main = overlay.closest("main.create-info");
        if (main) {
            main.dataset.classIndex = String(i);
            main.dataset.classId = item.id;
        }

        if (!skipSave) {
            try {
                localStorage.setItem(STORAGE_CLASS_INDEX_KEY, String(i));
            } catch (e) {
                /* ignore */
            }
        }

        const live = document.getElementById("class-selection-live");
        if (live) {
            live.textContent = "Class overlay: " + item.label;
        }

        const prevBtn = document.querySelector(".createinfo-class-arrow-prev");
        const nextBtn = document.querySelector(".createinfo-class-arrow-next");
        const prevItem = CLASS_OVERLAYS[normalizeClassIndex(i - 1)];
        const nextItem = CLASS_OVERLAYS[normalizeClassIndex(i + 1)];
        if (prevBtn) {
            prevBtn.setAttribute("aria-label", "Previous class overlay (" + prevItem.label + ")");
        }
        if (nextBtn) {
            nextBtn.setAttribute("aria-label", "Next class overlay (" + nextItem.label + ")");
        }

        return i;
    }

    function initClassOverlay(overlay) {
        const prevBtn = document.querySelector(".createinfo-class-arrow-prev");
        const nextBtn = document.querySelector(".createinfo-class-arrow-next");
        if (!prevBtn || !nextBtn) return;

        clearClassOverlay(overlay);

        prevBtn.addEventListener("click", function () {
            if (!overlayHasClass(overlay)) {
                applyClassOverlay(overlay, CLASS_OVERLAYS.length - 1);
            } else {
                const cur = parseInt(overlay.dataset.classIndex || "0", 10);
                applyClassOverlay(overlay, cur - 1);
            }
        });
        nextBtn.addEventListener("click", function () {
            if (!overlayHasClass(overlay)) {
                applyClassOverlay(overlay, 0);
            } else {
                const cur = parseInt(overlay.dataset.classIndex || "0", 10);
                applyClassOverlay(overlay, cur + 1);
            }
        });

        CLASS_OVERLAYS.forEach(function (entry) {
            const img = new Image();
            img.src = "assets/createclass/" + entry.file;
        });
    }

    /**
     * Shrinks inline font-size so the typed line fits the input width (CSS clamp still caps the max).
     */
    function fitCharacterNameFont(input) {
        if (!input) return;
        input.style.fontSize = "";
        if (!input.value) return;

        const computedMax = parseFloat(window.getComputedStyle(input).fontSize);
        let size = computedMax;
        input.style.fontSize = size + "px";

        let guard = 0;
        while (input.scrollWidth > input.clientWidth && size > MIN_FONT_PX && guard < 400) {
            size -= 0.45;
            input.style.fontSize = size + "px";
            guard += 1;
        }
    }

    function init() {
        const overlay = document.getElementById("createinfo-class-overlay");
        if (overlay) {
            initClassOverlay(overlay);
        }

        const input = document.getElementById("character-name");
        if (!input) return;

        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved != null) input.value = saved;
        } catch (e) {
            /* private mode / blocked */
        }

        fitCharacterNameFont(input);

        function save() {
            try {
                localStorage.setItem(STORAGE_KEY, input.value);
            } catch (e) {
                /* ignore */
            }
        }

        function onInput() {
            fitCharacterNameFont(input);
            save();
        }

        input.addEventListener("input", onInput);
        input.addEventListener("blur", save);

        window.addEventListener("resize", function () {
            requestAnimationFrame(function () {
                fitCharacterNameFont(input);
            });
        });

        const saveBtn = document.getElementById("save-character-btn");
        if (saveBtn) {
            saveBtn.addEventListener("click", function () {
                saveCurrentCharacter(input);
            });
        }
    }

    function buildSavedCharacterRecord(input) {
        let classIndex = 0;
        try {
            const overlayIdx = parseInt(localStorage.getItem(STORAGE_CLASS_INDEX_KEY) || "0", 10);
            if (!isNaN(overlayIdx)) {
                classIndex = normalizeClassIndex(overlayIdx);
            }
        } catch (e) {
            classIndex = 0;
        }

        const classEntry = CLASS_OVERLAYS[classIndex] || CLASS_OVERLAYS[0];
        const cleanedName = (input && input.value ? input.value : "").trim();
        const finalName = cleanedName || "Untitled Hero";
        let avatarImage = "";
        let visualState = null;

        try {
            avatarImage = localStorage.getItem(STORAGE_AVATAR_KEY) || "";
        } catch (e) {
            avatarImage = "";
        }

        try {
            const rawVisual = localStorage.getItem(STORAGE_VISUAL_KEY);
            visualState = rawVisual ? JSON.parse(rawVisual) : null;
        } catch (e) {
            visualState = null;
        }

        return {
            id: "char-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
            name: finalName,
            classId: classEntry.id,
            classLabel: classEntry.label,
            classIndex: classIndex,
            avatarImage: avatarImage,
            visualState: visualState,
            createdAt: Date.now(),
        };
    }

    function saveCurrentCharacter(input) {
        const record = buildSavedCharacterRecord(input);
        try {
            const raw = localStorage.getItem(STORAGE_SAVED_CHARACTERS_KEY);
            const list = raw ? JSON.parse(raw) : [];
            const savedList = Array.isArray(list) ? list : [];
            savedList.unshift(record);
            localStorage.setItem(STORAGE_SAVED_CHARACTERS_KEY, JSON.stringify(savedList));
            resetCreationDraft();
            window.location.href = "createhub.html";
        } catch (e) {
            resetCreationDraft();
            window.location.href = "createhub.html";
        }
    }

    function resetCreationDraft() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_CLASS_INDEX_KEY);
            localStorage.removeItem(STORAGE_VISUAL_KEY);
            localStorage.removeItem(STORAGE_AVATAR_KEY);
        } catch (e) {
            /* ignore */
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
