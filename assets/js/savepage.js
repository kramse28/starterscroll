(function () {
    "use strict";

    const STORAGE_SAVED_CHARACTERS_KEY = "starterscroll-saved-characters-v1";
    const FALLBACK_AVATAR = "assets/avatarimages/Untitled_Artwork (35).png";

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

        const main = document.getElementById("save-page-main");
        const nameEl = document.getElementById("saved-character-name");
        const avatarEl = document.getElementById("saved-avatar-image");

        if (main) {
            main.style.backgroundImage = 'url("' + classPanelPath(character.classId || "barbarian") + '")';
        }
        if (nameEl) {
            nameEl.textContent = character.name || "Untitled Hero";
        }
        if (avatarEl) {
            avatarEl.src = character.avatarImage || FALLBACK_AVATAR;
            avatarEl.alt = (character.name || "Saved character") + " avatar";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
