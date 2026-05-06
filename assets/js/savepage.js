(function () {
    "use strict";

    const STORAGE_SAVED_CHARACTERS_KEY = "starterscroll-saved-characters-v1";
    const FALLBACK_AVATAR = "assets/avatarimages/Untitled_Artwork (35).png";
    const MIN_NAME_FONT_PX = 9;

    /**
     * Shrinks font-size so the name fits the parchment name box (like createinfo fit).
     */
    function fitSavedNameFont(input) {
        if (!input) return;
        input.style.fontSize = "";
        if (!input.value) return;

        const computedMax = parseFloat(window.getComputedStyle(input).fontSize);
        let size = computedMax;
        input.style.fontSize = size + "px";

        let guard = 0;
        while (input.scrollWidth > input.clientWidth && size > MIN_NAME_FONT_PX && guard < 400) {
            size -= 0.45;
            input.style.fontSize = size + "px";
            guard += 1;
        }
    }

    function writeSavedCharacters(list) {
        try {
            localStorage.setItem(STORAGE_SAVED_CHARACTERS_KEY, JSON.stringify(list));
        } catch (e) {
            /* private mode / quota */
        }
    }

    function persistCharacterName(characterId, rawName, avatarEl) {
        const list = readSavedCharacters();
        const idx = list.findIndex(function (entry) {
            return String(entry.id) === String(characterId);
        });
        if (idx === -1) return;

        const trimmed = (rawName || "").trim();
        const displayName = trimmed || "Untitled Hero";
        list[idx].name = displayName;
        writeSavedCharacters(list);

        if (avatarEl) {
            avatarEl.alt = displayName + " avatar";
        }
    }

    function readSavedCharacters() {
        try {
            const raw = localStorage.getItem(STORAGE_SAVED_CHARACTERS_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function getRequestedId() {
        const params = new URLSearchParams(window.location.search);
        return params.get("characterId") || "";
    }

    function classPanelPath(classId) {
        return "assets/savedavatars/saved" + classId + ".png";
    }

    function init() {
        const allCharacters = readSavedCharacters();
        const requestedId = getRequestedId();
        let character = null;

        if (requestedId) {
            character = allCharacters.find(function (entry) {
                return String(entry.id) === requestedId;
            });
        }
        if (!character && allCharacters.length > 0) {
            character = allCharacters[0];
        }

        if (!character) return;

        const activeCharacterId = character.id;
        const bgEl = document.getElementById("save-page-bg");
        const nameEl = document.getElementById("saved-character-name");
        const avatarEl = document.getElementById("saved-avatar-image");

        if (bgEl) {
            bgEl.src = classPanelPath(character.classId || "barbarian");
        }
        if (nameEl) {
            nameEl.value = character.name || "Untitled Hero";
        }
        if (avatarEl) {
            avatarEl.src = character.avatarImage || FALLBACK_AVATAR;
            avatarEl.alt = (character.name || "Saved character") + " avatar";
        }

        function applyNameFit() {
            fitSavedNameFont(nameEl);
        }

        function flushNamePersist() {
            if (!nameEl || !activeCharacterId) return;
            let v = (nameEl.value || "").trim();
            if (!v) {
                v = "Untitled Hero";
                nameEl.value = v;
            }
            persistCharacterName(activeCharacterId, v, avatarEl);
        }

        if (nameEl) {
            let persistTimer = null;
            applyNameFit();
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(applyNameFit);
            }
            window.addEventListener("resize", function () {
                requestAnimationFrame(applyNameFit);
            });

            nameEl.addEventListener("input", function () {
                applyNameFit();
                clearTimeout(persistTimer);
                persistTimer = setTimeout(flushNamePersist, 350);
            });
            nameEl.addEventListener("blur", function () {
                clearTimeout(persistTimer);
                flushNamePersist();
                applyNameFit();
            });

            window.addEventListener("pagehide", function () {
                clearTimeout(persistTimer);
                flushNamePersist();
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
