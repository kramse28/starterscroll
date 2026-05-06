(function () {
    "use strict";

    const STORAGE_SAVED_CHARACTERS_KEY = "starterscroll-saved-characters-v1";
    const FALLBACK_AVATAR = "assets/avatarimages/Untitled_Artwork (35).png";
    const SAVED_BACKDROP_SRC = "assets/savedavatars/savedbackdrop.png";

    function readSavedCharacters() {
        try {
            const raw = localStorage.getItem(STORAGE_SAVED_CHARACTERS_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function createCard(character) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "saved-character-card";
        btn.setAttribute("aria-label", "Open " + (character.name || "saved character"));

        const backdrop = document.createElement("img");
        backdrop.className = "saved-character-backdrop";
        backdrop.src = SAVED_BACKDROP_SRC;
        backdrop.alt = "";
        backdrop.setAttribute("aria-hidden", "true");
        backdrop.loading = "lazy";
        backdrop.decoding = "async";
        btn.appendChild(backdrop);

        const nameLabel = document.createElement("span");
        nameLabel.className = "saved-character-name";
        nameLabel.textContent = character.name || "Untitled Hero";
        nameLabel.setAttribute("aria-hidden", "true");
        btn.appendChild(nameLabel);

        const avatar = document.createElement("img");
        avatar.className = "saved-character-avatar";
        avatar.alt = character.name || "Saved character avatar";
        avatar.src = character.avatarImage || FALLBACK_AVATAR;
        avatar.loading = "lazy";
        avatar.decoding = "async";
        btn.appendChild(avatar);

        btn.addEventListener("click", function () {
            window.location.href = "savepage.html?characterId=" + encodeURIComponent(character.id || "");
        });

        return btn;
    }

    function init() {
        const grid = document.getElementById("saved-character-grid");
        if (!grid) return;
        const characters = readSavedCharacters();
        grid.innerHTML = "";
        const frag = document.createDocumentFragment();
        characters.forEach(function (character) {
            frag.appendChild(createCard(character));
        });
        grid.appendChild(frag);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
