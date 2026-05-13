(function () {
    "use strict";

    var TRANSITION_MS = 200;
    var PIXEL_SIZE = 14;
    var isTransitioning = false;

    function ensureOverlay() {
        var existing = document.querySelector(".arcade-transition");
        if (existing) return existing;
        var host = document.querySelector("main") || document.body;
        if (host && window.getComputedStyle(host).position === "static") {
            host.style.position = "relative";
        }
        var overlay = document.createElement("div");
        overlay.className = "arcade-transition";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML =
            '<div class="arcade-transition__base"></div>' +
            '<div class="arcade-transition__pixels"></div>';
        host.appendChild(overlay);
        return overlay;
    }

    function buildPixelGrid(overlay) {
        var pixelLayer = overlay.querySelector(".arcade-transition__pixels");
        if (!pixelLayer) return;
        pixelLayer.innerHTML = "";

        var w = overlay.clientWidth;
        var h = overlay.clientHeight;
        var cols = Math.ceil(w / PIXEL_SIZE);
        var rows = Math.ceil(h / PIXEL_SIZE);
        var centerX = cols / 2;
        var centerY = rows / 2;
        var maxDist = Math.sqrt(centerX * centerX + centerY * centerY) || 1;
        var frag = document.createDocumentFragment();

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < cols; x++) {
                var pixel = document.createElement("span");
                pixel.className = "arcade-transition__pixel";
                pixel.style.left = x * PIXEL_SIZE + "px";
                pixel.style.top = y * PIXEL_SIZE + "px";
                pixel.style.width = PIXEL_SIZE + "px";
                pixel.style.height = PIXEL_SIZE + "px";

                var dx = x - centerX;
                var dy = y - centerY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var radialDelay = (dist / maxDist) * 72;
                var noiseDelay = Math.random() * 8;
                pixel.style.setProperty("--delay", Math.round(radialDelay + noiseDelay) + "ms");
                frag.appendChild(pixel);
            }
        }

        pixelLayer.appendChild(frag);
    }

    function navigateWithArcadeTransition(href) {
        if (!href || isTransitioning) return;
        isTransitioning = true;
        var overlay = ensureOverlay();
        buildPixelGrid(overlay);
        overlay.classList.add("is-active");
        window.setTimeout(function () {
            window.location.href = href;
        }, TRANSITION_MS);
    }

    function interceptLinks(event) {
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var link = event.target.closest("a[href]");
        if (!link) return;
        if (link.target && link.target !== "_self") return;
        if (link.hasAttribute("download")) return;
        if (link.getAttribute("rel") === "external") return;

        var href = link.getAttribute("href");
        if (!href || href.charAt(0) === "#") return;
        if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

        event.preventDefault();
        navigateWithArcadeTransition(link.href);
    }

    window.arcadeNavigate = navigateWithArcadeTransition;
    document.addEventListener("click", interceptLinks);
})();
