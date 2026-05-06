(function () {
    "use strict";

    const STORAGE_SAVED_CHARACTERS_KEY = "starterscroll-saved-characters-v1";
    const FALLBACK_AVATAR = "assets/avatarimages/Untitled_Artwork (35).png";
    const SAVED_BACKDROP_SRC = "assets/savedavatars/savedbackdrop.png";

    var deleteModalPendingId = null;
    var escapeDismissBound = false;

    function readSavedCharacters() {
        try {
            const raw = localStorage.getItem(STORAGE_SAVED_CHARACTERS_KEY);
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) ? list : [];
        } catch (e) {
            return [];
        }
    }

    function writeSavedCharacters(list) {
        try {
            localStorage.setItem(STORAGE_SAVED_CHARACTERS_KEY, JSON.stringify(list));
        } catch (e) {
            /* ignore */
        }
    }

    /**
     * Older saves may omit id; without it delete filter matches every row and removes nothing.
     */
    function normalizeSavedCharacters(list) {
        var changed = false;
        list.forEach(function (c, i) {
            if (c.id == null || c.id === "") {
                c.id =
                    "char-mig-" +
                    (c.createdAt || Date.now()) +
                    "-" +
                    i +
                    "-" +
                    Math.floor(Math.random() * 100000);
                changed = true;
            }
        });
        if (changed) {
            writeSavedCharacters(list);
        }
        return list;
    }

    function ensureDeleteModal() {
        if (document.getElementById("hub-delete-modal-root")) {
            return;
        }

        var root = document.createElement("div");
        root.id = "hub-delete-modal-root";
        root.className = "hub-delete-modal-root";
        root.setAttribute("aria-hidden", "true");

        var backdrop = document.createElement("div");
        backdrop.className = "hub-delete-modal-backdrop";

        var dialog = document.createElement("div");
        dialog.className = "hub-delete-modal";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "hub-delete-modal-title");
        dialog.setAttribute("aria-describedby", "hub-delete-modal-message");

        var title = document.createElement("h2");
        title.id = "hub-delete-modal-title";
        title.className = "hub-delete-modal-title";
        title.textContent = "Remove saved character?";

        var message = document.createElement("p");
        message.id = "hub-delete-modal-message";
        message.className = "hub-delete-modal-message";

        var actions = document.createElement("div");
        actions.className = "hub-delete-modal-actions";

        var cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.id = "hub-delete-modal-cancel";
        cancelBtn.className = "hub-delete-modal-btn is-cancel";
        cancelBtn.textContent = "Cancel";

        var confirmBtn = document.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.id = "hub-delete-modal-confirm";
        confirmBtn.className = "hub-delete-modal-btn is-danger";
        confirmBtn.textContent = "Delete";

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        dialog.appendChild(title);
        dialog.appendChild(message);
        dialog.appendChild(actions);
        root.appendChild(backdrop);
        root.appendChild(dialog);
        document.body.appendChild(root);

        backdrop.addEventListener("click", closeDeleteModal);
        cancelBtn.addEventListener("click", closeDeleteModal);
        confirmBtn.addEventListener("click", confirmDeleteModal);

        if (!escapeDismissBound) {
            escapeDismissBound = true;
            document.addEventListener("keydown", function (e) {
                if (e.key !== "Escape") {
                    return;
                }
                var el = document.getElementById("hub-delete-modal-root");
                if (!el || !el.classList.contains("is-open")) {
                    return;
                }
                e.preventDefault();
                closeDeleteModal();
            });
        }
    }

    function openDeleteModal(character) {
        ensureDeleteModal();
        deleteModalPendingId = character.id;
        var label = character.name || "Untitled Hero";
        document.getElementById("hub-delete-modal-message").textContent =
            "Remove " +
            label +
            " from your saved characters? This cannot be undone.";
        var root = document.getElementById("hub-delete-modal-root");
        root.classList.add("is-open");
        root.setAttribute("aria-hidden", "false");
        document.getElementById("hub-delete-modal-cancel").focus();
    }

    function closeDeleteModal() {
        var root = document.getElementById("hub-delete-modal-root");
        if (!root) {
            return;
        }
        root.classList.remove("is-open");
        root.setAttribute("aria-hidden", "true");
        deleteModalPendingId = null;
    }

    function confirmDeleteModal() {
        var idToRemove = deleteModalPendingId;
        closeDeleteModal();
        if (idToRemove == null || idToRemove === "") {
            return;
        }
        var list = readSavedCharacters();
        normalizeSavedCharacters(list);
        var next = list.filter(function (c) {
            return String(c.id) !== String(idToRemove);
        });
        if (next.length === list.length) {
            return;
        }
        writeSavedCharacters(next);
        init();
    }

    function createCard(character) {
        const card = document.createElement("div");
        card.className = "saved-character-card";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "saved-character-open";
        openBtn.setAttribute("aria-label", "Open " + (character.name || "saved character"));

        const backdrop = document.createElement("img");
        backdrop.className = "saved-character-backdrop";
        backdrop.src = SAVED_BACKDROP_SRC;
        backdrop.alt = "";
        backdrop.setAttribute("aria-hidden", "true");
        backdrop.loading = "lazy";
        backdrop.decoding = "async";
        openBtn.appendChild(backdrop);

        const avatar = document.createElement("img");
        avatar.className = "saved-character-avatar";
        avatar.alt = character.name || "Saved character avatar";
        avatar.src = character.avatarImage || FALLBACK_AVATAR;
        avatar.loading = "lazy";
        avatar.decoding = "async";
        openBtn.appendChild(avatar);

        openBtn.addEventListener("click", function () {
            window.location.href = "savepage.html?characterId=" + encodeURIComponent(character.id || "");
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "saved-character-delete";
        delBtn.setAttribute(
            "aria-label",
            "Delete " + (character.name || "saved character")
        );
        delBtn.textContent = "\u00D7";

        delBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            e.preventDefault();
            openDeleteModal(character);
        });

        card.appendChild(openBtn);
        card.appendChild(delBtn);

        return card;
    }

    function init() {
        const grid = document.getElementById("saved-character-grid");
        if (!grid) return;
        var characters = readSavedCharacters();
        normalizeSavedCharacters(characters);
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
