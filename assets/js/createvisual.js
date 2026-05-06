(function () {
    "use strict";

    const SHIRT_FILES = Array.from({ length: 10 }, (_, i) => `assets/avatarimages/Shirt${i + 1}.png`);
    const PANT_FILES = Array.from({ length: 6 }, (_, i) => `assets/avatarimages/Pant${i + 1}.png`);
    const STORAGE_KEY = "starterscroll-createvisual-v1";
    const STORAGE_AVATAR_KEY = "starterscroll-current-avatar-image";
    const PANEL_IDS = ["base-panel", "hair-panel", "tops-panel", "bottoms-panel"];

    const defaultState = {
        baseNum: 2,
        earVariant: 1,
        skinHue: 28,
        skinSat: 42,
        skinBri: 52,
        hairNum: null,
        hairHue: 32,
        hairSat: 55,
        hairBri: 38,
        shirtIndex: 4,
        shirtHue: 42,
        shirtSat: 14,
        shirtBri: 92,
        pantIndex: 0,
        pantHue: 210,
        pantSat: 50,
        pantBri: 42,
        activePanelId: "base-panel",
    };

    const state = Object.assign({}, defaultState);

    function clamp(n, lo, hi) {
        return Math.max(lo, Math.min(hi, n));
    }

    function persistState() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    baseNum: state.baseNum,
                    earVariant: state.earVariant,
                    skinHue: state.skinHue,
                    skinSat: state.skinSat,
                    skinBri: state.skinBri,
                    hairNum: state.hairNum,
                    hairHue: state.hairHue,
                    hairSat: state.hairSat,
                    hairBri: state.hairBri,
                    shirtIndex: state.shirtIndex,
                    shirtHue: state.shirtHue,
                    shirtSat: state.shirtSat,
                    shirtBri: state.shirtBri,
                    pantIndex: state.pantIndex,
                    pantHue: state.pantHue,
                    pantSat: state.pantSat,
                    pantBri: state.pantBri,
                    activePanelId: state.activePanelId,
                })
            );
        } catch (e) {
            /* private mode / quota */
        }
    }

    let persistTimer = null;
    const PERSIST_DELAY_MS = 90;

    function schedulePersistState() {
        if (persistTimer) {
            window.clearTimeout(persistTimer);
        }
        persistTimer = window.setTimeout(function () {
            persistTimer = null;
            persistState();
        }, PERSIST_DELAY_MS);
    }

    function flushPersistState() {
        if (persistTimer) {
            window.clearTimeout(persistTimer);
            persistTimer = null;
        }
        persistState();
    }

    function loadPersistedState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const o = JSON.parse(raw);
            if (!o || typeof o !== "object") return;

            if (typeof o.baseNum === "number" && !isNaN(o.baseNum)) {
                state.baseNum = clamp(Math.round(o.baseNum), 1, 6);
            }
            if (typeof o.earVariant === "number" && !isNaN(o.earVariant)) {
                state.earVariant = o.earVariant === 2 ? 2 : 1;
            }
            ["skinHue", "hairHue", "shirtHue", "pantHue"].forEach(function (k) {
                if (typeof o[k] === "number" && !isNaN(o[k])) {
                    state[k] = clamp(o[k], 0, 360);
                }
            });
            ["skinSat", "skinBri", "hairSat", "hairBri", "shirtSat", "shirtBri", "pantSat", "pantBri"].forEach(function (k) {
                if (typeof o[k] === "number" && !isNaN(o[k])) {
                    state[k] = clamp(o[k], 0, 100);
                }
            });
            if (o.hairNum === null || o.hairNum === "") {
                state.hairNum = null;
            } else if (typeof o.hairNum === "number" && !isNaN(o.hairNum)) {
                const hn = Math.round(o.hairNum);
                state.hairNum = hn >= 2 && hn <= 10 ? hn : null;
            }
            if (typeof o.shirtIndex === "number" && !isNaN(o.shirtIndex)) {
                state.shirtIndex = clamp(Math.round(o.shirtIndex), 0, SHIRT_FILES.length - 1);
            }
            if (typeof o.pantIndex === "number" && !isNaN(o.pantIndex)) {
                state.pantIndex = clamp(Math.round(o.pantIndex), 0, PANT_FILES.length - 1);
            }
            if (typeof o.activePanelId === "string" && PANEL_IDS.indexOf(o.activePanelId) !== -1) {
                state.activePanelId = o.activePanelId;
            }
        } catch (e) {
            /* ignore corrupt storage */
        }
    }

    function syncDomFromState() {
        const set = function (id, v) {
            const el = document.getElementById(id);
            if (el) el.value = String(v);
        };
        set("skin-hue", state.skinHue);
        set("skin-sat", state.skinSat);
        set("skin-bri", state.skinBri);
        set("hair-hue", state.hairHue);
        set("hair-sat", state.hairSat);
        set("hair-bri", state.hairBri);
        set("shirt-hue", state.shirtHue);
        set("shirt-sat", state.shirtSat);
        set("shirt-bri", state.shirtBri);
        set("pant-hue", state.pantHue);
        set("pant-sat", state.pantSat);
        set("pant-bri", state.pantBri);
    }

    function applyActivePanelFromState() {
        const panels = {
            "base-panel": document.getElementById("base-panel"),
            "hair-panel": document.getElementById("hair-panel"),
            "tops-panel": document.getElementById("tops-panel"),
            "bottoms-panel": document.getElementById("bottoms-panel"),
        };
        const id = state.activePanelId && panels[state.activePanelId] ? state.activePanelId : "base-panel";
        state.activePanelId = id;
        Object.keys(panels).forEach(function (key) {
            const p = panels[key];
            if (!p) return;
            if (key === id) p.classList.remove("is-collapsed");
            else p.classList.add("is-collapsed");
        });
    }

    const layerBase = document.getElementById("avatar-layer-base");
    const layerPants = document.getElementById("avatar-layer-pants");
    const layerShirt = document.getElementById("avatar-layer-shirt");
    const layerHair = document.getElementById("avatar-layer-hair");
    const shirtPanelPreview = document.getElementById("shirt-panel-preview");
    const pantPanelPreview = document.getElementById("pant-panel-preview");

    function loadImage(src) {
        return new Promise(function (resolve, reject) {
            const img = new Image();
            img.onload = function () {
                resolve(img);
            };
            img.onerror = function () {
                reject(new Error("Failed to load " + src));
            };
            img.src = src;
        });
    }

    function hsvToRgbTriplet(h, s, v) {
        const hh = ((h % 360) + 360) % 360;
        const ss = Math.max(0, Math.min(100, s)) / 100;
        const vv = Math.max(0, Math.min(100, v)) / 100;
        const c = vv * ss;
        const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
        const m = vv - c;
        let rp = 0,
            gp = 0,
            bp = 0;
        if (hh < 60) {
            rp = c;
            gp = x;
        } else if (hh < 120) {
            rp = x;
            gp = c;
        } else if (hh < 180) {
            gp = c;
            bp = x;
        } else if (hh < 240) {
            gp = x;
            bp = c;
        } else if (hh < 300) {
            rp = x;
            bp = c;
        } else {
            rp = c;
            bp = x;
        }
        return {
            r: Math.round((rp + m) * 255),
            g: Math.round((gp + m) * 255),
            b: Math.round((bp + m) * 255),
        };
    }

    function hsvToHex(h, s, v) {
        const t = hsvToRgbTriplet(h, s, v);
        return (
            "#" +
            [t.r, t.g, t.b]
                .map(function (n) {
                    return n.toString(16).padStart(2, "0");
                })
                .join("")
        );
    }

    function clampByte(n) {
        return Math.max(0, Math.min(255, Math.round(n)));
    }

    /**
     * Full recolor from slider H/S/B while keeping sprite shading (luminance multiply).
     */
    function recolorPixelMultiplyShade(r, g, b, hue, sat, bri) {
        const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const ref = hsvToRgbTriplet(hue, sat, 100);
        const briMul = 0.25 + (bri / 100) * 1.5;
        const k = L * briMul;
        return {
            r: clampByte(ref.r * k),
            g: clampByte(ref.g * k),
            b: clampByte(ref.b * k),
        };
    }

    /**
     * Pixels on base sprites that should follow skin H/S/B. Bases are often
     * grayscale or peach with low chroma — the old brown-only test missed most of them.
     */
    function isBaseSkinPixel(r, g, b, a) {
        if (a < 90) return false;

        const L = 0.299 * r + 0.587 * g + 0.114 * b;
        if (L < 10) return false;

        const maxc = Math.max(r, g, b);
        const minc = Math.min(r, g, b);
        const sat = maxc < 1 ? 0 : (maxc - minc) / maxc;

        if (L > 248 && r > 245 && g > 245 && b > 245) return false;

        if (b > r + 50 && b > g + 40) return false;
        if (g > r + 50 && g > b + 40) return false;

        if (r >= 18 && g <= r * 1.22 && b <= r * 1.2 && Math.abs(r - g) < 88 && r + 1 >= b) {
            return true;
        }

        if (sat < 0.28 && L > 34 && L < 252) {
            return true;
        }

        return false;
    }

    function isGreenFabricPixel(r, g, b, a) {
        if (a < 120) return false;
        return g > Math.max(r, b) + 12;
    }

    function drawImageToCanvas(img) {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        return c;
    }

    function applySkinToneToCanvas(canvas, hue, sat, bri) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i],
                g = d[i + 1],
                b = d[i + 2],
                a = d[i + 3];
            if (!isBaseSkinPixel(r, g, b, a)) continue;
            const out = recolorPixelMultiplyShade(r, g, b, hue, sat, bri);
            d[i] = out.r;
            d[i + 1] = out.g;
            d[i + 2] = out.b;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    function applyHairTintToCanvas(canvas, hue, sat, bri) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i],
                g = d[i + 1],
                b = d[i + 2],
                a = d[i + 3];
            if (a < 128) continue;
            const out = recolorPixelMultiplyShade(r, g, b, hue, sat, bri);
            d[i] = out.r;
            d[i + 1] = out.g;
            d[i + 2] = out.b;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    function applyGreenFabricTintToCanvas(canvas, hue, sat, bri) {
        const ctx = canvas.getContext("2d");
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i],
                g = d[i + 1],
                b = d[i + 2],
                a = d[i + 3];
            if (!isGreenFabricPixel(r, g, b, a)) continue;
            const out = recolorPixelMultiplyShade(r, g, b, hue, sat, bri);
            d[i] = out.r;
            d[i + 1] = out.g;
            d[i + 2] = out.b;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    function getOpaqueBoundsFromCanvas(canvas) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w,
            minY = h,
            maxX = -1,
            maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const a = data[(y * w + x) * 4 + 3];
                if (a > 8) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < minX) return null;
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    function cropCanvasToOpaquePngUrl(canvas) {
        const b = getOpaqueBoundsFromCanvas(canvas);
        if (!b || b.w < 1 || b.h < 1) return "";
        const out = document.createElement("canvas");
        out.width = b.w;
        out.height = b.h;
        out.getContext("2d").drawImage(canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
        return out.toDataURL("image/png");
    }

    function layerToStageDataUrl(sourceCanvas, stageW, stageH) {
        const out = document.createElement("canvas");
        out.width = stageW;
        out.height = stageH;
        const ctx = out.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        const sw = sourceCanvas.width;
        const sh = sourceCanvas.height;
        const scale = Math.min(stageW / sw, stageH / sh);
        const dw = Math.round(sw * scale);
        const dh = Math.round(sh * scale);
        const dx = Math.round((stageW - dw) / 2);
        const dy = Math.round((stageH - dh) / 2);
        ctx.clearRect(0, 0, stageW, stageH);
        ctx.drawImage(sourceCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
        return out.toDataURL("image/png");
    }

    function getBasePath(baseNum, earVariant) {
        const suffix = earVariant === 2 ? ".2" : "";
        return "assets/avatarimages/Base" + baseNum + suffix + ".png";
    }

    function getHairPath(hairNum, earVariant) {
        if (!hairNum) return null;
        if (hairNum === 10 && earVariant === 2) return "assets/avatarimages/Hair10.2.png";
        return "assets/avatarimages/Hair" + hairNum + ".png";
    }

    function processLayerToStageDataUrl(src, stageW, stageH, kind, hue, sat, bri) {
        return loadImage(src).then(function (img) {
            let c = drawImageToCanvas(img);
            if (kind === "shirt") c = applyGreenFabricTintToCanvas(c, hue, sat, bri);
            else if (kind === "pant") c = applyGreenFabricTintToCanvas(c, hue, sat, bri);
            else if (kind === "hair") c = applyHairTintToCanvas(c, hue, sat, bri);
            return layerToStageDataUrl(c, stageW, stageH);
        });
    }

    let mergedAvatarSaveTimer = null;
    const MERGED_AVATAR_SAVE_DELAY_MS = 275;
    let lastStageW = 0;
    let lastStageH = 0;

    function waitForImageDecode(img) {
        return new Promise(function (resolve) {
            if (!img) {
                resolve();
                return;
            }
            if (img.complete && img.naturalWidth > 0) {
                resolve();
                return;
            }
            const done = function () {
                img.removeEventListener("load", done);
                img.removeEventListener("error", done);
                resolve();
            };
            img.addEventListener("load", done);
            img.addEventListener("error", done);
        }).then(function () {
            if (!img || !img.decode) return;
            return img.decode().catch(function () {});
        });
    }

    function saveMergedAvatarFromLayers(width, height) {
        try {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = false;

            const layers = [layerBase, layerPants, layerShirt];
            if (layerHair && layerHair.style.display !== "none" && layerHair.getAttribute("src")) {
                layers.push(layerHair);
            }

            layers.forEach(function (img) {
                if (!img || !img.getAttribute("src")) return;
                ctx.drawImage(img, 0, 0, width, height);
            });

            localStorage.setItem(STORAGE_AVATAR_KEY, canvas.toDataURL("image/png"));
        } catch (e) {
            /* ignore storage/canvas errors */
        }
    }

    function scheduleMergedAvatarSave(width, height) {
        if (mergedAvatarSaveTimer) {
            window.clearTimeout(mergedAvatarSaveTimer);
        }
        mergedAvatarSaveTimer = window.setTimeout(function () {
            mergedAvatarSaveTimer = null;
            const imgs = [layerBase, layerPants, layerShirt];
            if (layerHair && layerHair.style.display !== "none" && layerHair.getAttribute("src")) {
                imgs.push(layerHair);
            }
            Promise.all(imgs.map(waitForImageDecode)).then(function () {
                saveMergedAvatarFromLayers(width, height);
            });
        }, MERGED_AVATAR_SAVE_DELAY_MS);
    }

    function flushMergedAvatarSave() {
        if (mergedAvatarSaveTimer) {
            window.clearTimeout(mergedAvatarSaveTimer);
            mergedAvatarSaveTimer = null;
        }
        if (!lastStageW || !lastStageH) return;
        const imgs = [layerBase, layerPants, layerShirt];
        if (layerHair && layerHair.style.display !== "none" && layerHair.getAttribute("src")) {
            imgs.push(layerHair);
        }
        Promise.all(imgs.map(waitForImageDecode)).then(function () {
            saveMergedAvatarFromLayers(lastStageW, lastStageH);
        });
    }

    let composeToken = 0;

    function composeAvatar() {
        const token = ++composeToken;
        const basePath = getBasePath(state.baseNum, state.earVariant);

        loadImage(basePath)
            .then(function (baseImg) {
                if (token !== composeToken) return;
                let skinCanvas = drawImageToCanvas(baseImg);
                skinCanvas = applySkinToneToCanvas(skinCanvas, state.skinHue, state.skinSat, state.skinBri);
                const stageW = skinCanvas.width;
                const stageH = skinCanvas.height;
                lastStageW = stageW;
                lastStageH = stageH;
                const baseUrl = skinCanvas.toDataURL("image/png");

                const shirtSrc = SHIRT_FILES[state.shirtIndex];
                const pantSrc = PANT_FILES[state.pantIndex];
                const hairPath = getHairPath(state.hairNum, state.earVariant);

                const pPant = processLayerToStageDataUrl(
                    pantSrc,
                    stageW,
                    stageH,
                    "pant",
                    state.pantHue,
                    state.pantSat,
                    state.pantBri
                );
                const pShirt = processLayerToStageDataUrl(
                    shirtSrc,
                    stageW,
                    stageH,
                    "shirt",
                    state.shirtHue,
                    state.shirtSat,
                    state.shirtBri
                );
                const pHair = hairPath
                    ? processLayerToStageDataUrl(
                          hairPath,
                          stageW,
                          stageH,
                          "hair",
                          state.hairHue,
                          state.hairSat,
                          state.hairBri
                      )
                    : Promise.resolve("");

                return Promise.all([Promise.resolve(baseUrl), pPant, pShirt, pHair]).then(function (urls) {
                    if (token !== composeToken) return;
                    layerBase.src = urls[0];
                    layerPants.src = urls[1];
                    layerShirt.src = urls[2];
                    if (urls[3]) {
                        layerHair.src = urls[3];
                        layerHair.style.display = "";
                    } else {
                        layerHair.removeAttribute("src");
                        layerHair.style.display = "none";
                    }
                    scheduleMergedAvatarSave(stageW, stageH);
                });
            })
            .catch(function (err) {
                console.error(err);
            });
    }

    function updateShirtPanelPreview() {
        const src = SHIRT_FILES[state.shirtIndex];
        loadImage(src)
            .then(function (img) {
                let c = drawImageToCanvas(img);
                c = applyGreenFabricTintToCanvas(c, state.shirtHue, state.shirtSat, state.shirtBri);
                const url = cropCanvasToOpaquePngUrl(c);
                if (url && shirtPanelPreview) shirtPanelPreview.src = url;
            })
            .catch(function () {});
    }

    function updatePantPanelPreview() {
        const src = PANT_FILES[state.pantIndex];
        loadImage(src)
            .then(function (img) {
                let c = drawImageToCanvas(img);
                c = applyGreenFabricTintToCanvas(c, state.pantHue, state.pantSat, state.pantBri);
                const url = cropCanvasToOpaquePngUrl(c);
                if (url && pantPanelPreview) pantPanelPreview.src = url;
            })
            .catch(function () {});
    }

    function selectInGroup(container, el, className) {
        if (!container) return;
        container.querySelectorAll("." + className).forEach(function (btn) {
            btn.classList.remove("is-selected");
        });
        if (el) el.classList.add("is-selected");
    }

    function wireCategoryTabs() {
        const panels = {
            "base-panel": document.getElementById("base-panel"),
            "hair-panel": document.getElementById("hair-panel"),
            "tops-panel": document.getElementById("tops-panel"),
            "bottoms-panel": document.getElementById("bottoms-panel"),
        };
        document.querySelectorAll(".category-scroll-btn").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const id = btn.getAttribute("data-target");
                if (id && PANEL_IDS.indexOf(id) !== -1) {
                    state.activePanelId = id;
                    persistState();
                }
                Object.keys(panels).forEach(function (key) {
                    const p = panels[key];
                    if (!p) return;
                    if (key === id) p.classList.remove("is-collapsed");
                    else p.classList.add("is-collapsed");
                });
            });
        });
    }

    function wireBasePanel() {
        const eyeWrap = document.getElementById("eye-options");
        if (eyeWrap) {
            eyeWrap.querySelectorAll("[data-base]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    state.baseNum = parseInt(btn.getAttribute("data-base"), 10);
                    selectInGroup(eyeWrap, btn, "scroll-option");
                    persistState();
                    composeAvatar();
                });
            });
        }
        const earWrap = document.getElementById("ear-options");
        if (earWrap) {
            earWrap.querySelectorAll("[data-ear]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    state.earVariant = parseInt(btn.getAttribute("data-ear"), 10);
                    selectInGroup(earWrap, btn, "scroll-option");
                    persistState();
                    composeAvatar();
                });
            });
        }
        ["skin-hue", "skin-sat", "skin-bri"].forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", function () {
                if (id === "skin-hue") state.skinHue = parseFloat(el.value);
                if (id === "skin-sat") state.skinSat = parseFloat(el.value);
                if (id === "skin-bri") state.skinBri = parseFloat(el.value);
                schedulePersistState();
                updateSkinSwatch();
                composeAvatar();
            });
        });
    }

    function updateSkinSwatch() {
        const el = document.getElementById("skin-swatch");
        if (el) el.style.backgroundColor = hsvToHex(state.skinHue, state.skinSat, state.skinBri);
    }

    function updateHairSwatch() {
        const el = document.getElementById("hair-swatch");
        if (el) el.style.backgroundColor = hsvToHex(state.hairHue, state.hairSat, state.hairBri);
    }

    function updateShirtSwatch() {
        const el = document.getElementById("shirt-swatch");
        if (el) el.style.backgroundColor = hsvToHex(state.shirtHue, state.shirtSat, state.shirtBri);
    }

    function updatePantSwatch() {
        const el = document.getElementById("pant-swatch");
        if (el) el.style.backgroundColor = hsvToHex(state.pantHue, state.pantSat, state.pantBri);
    }

    function wireHairPanel() {
        const wrap = document.getElementById("hair-style-options");
        if (wrap) {
            wrap.querySelectorAll("[data-hair]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    const v = btn.getAttribute("data-hair");
                    state.hairNum = v === "" || v === "none" ? null : parseInt(v, 10);
                    selectInGroup(wrap, btn, "scroll-option");
                    persistState();
                    composeAvatar();
                });
            });
        }
        ["hair-hue", "hair-sat", "hair-bri"].forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", function () {
                if (id === "hair-hue") state.hairHue = parseFloat(el.value);
                if (id === "hair-sat") state.hairSat = parseFloat(el.value);
                if (id === "hair-bri") state.hairBri = parseFloat(el.value);
                schedulePersistState();
                updateHairSwatch();
                composeAvatar();
            });
        });
    }

    function wireTopsBottoms() {
        const shirtPrev = document.getElementById("shirt-prev");
        const shirtNext = document.getElementById("shirt-next");
        if (shirtPrev)
            shirtPrev.addEventListener("click", function () {
                state.shirtIndex = (state.shirtIndex - 1 + SHIRT_FILES.length) % SHIRT_FILES.length;
                persistState();
                composeAvatar();
                updateShirtPanelPreview();
            });
        if (shirtNext)
            shirtNext.addEventListener("click", function () {
                state.shirtIndex = (state.shirtIndex + 1) % SHIRT_FILES.length;
                persistState();
                composeAvatar();
                updateShirtPanelPreview();
            });

        const pantPrev = document.getElementById("pant-prev");
        const pantNext = document.getElementById("pant-next");
        if (pantPrev)
            pantPrev.addEventListener("click", function () {
                state.pantIndex = (state.pantIndex - 1 + PANT_FILES.length) % PANT_FILES.length;
                persistState();
                composeAvatar();
                updatePantPanelPreview();
            });
        if (pantNext)
            pantNext.addEventListener("click", function () {
                state.pantIndex = (state.pantIndex + 1) % PANT_FILES.length;
                persistState();
                composeAvatar();
                updatePantPanelPreview();
            });

        ["shirt-hue", "shirt-sat", "shirt-bri"].forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", function () {
                if (id === "shirt-hue") state.shirtHue = parseFloat(el.value);
                if (id === "shirt-sat") state.shirtSat = parseFloat(el.value);
                if (id === "shirt-bri") state.shirtBri = parseFloat(el.value);
                schedulePersistState();
                updateShirtSwatch();
                composeAvatar();
                updateShirtPanelPreview();
            });
        });
        ["pant-hue", "pant-sat", "pant-bri"].forEach(function (id) {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", function () {
                if (id === "pant-hue") state.pantHue = parseFloat(el.value);
                if (id === "pant-sat") state.pantSat = parseFloat(el.value);
                if (id === "pant-bri") state.pantBri = parseFloat(el.value);
                schedulePersistState();
                updatePantSwatch();
                composeAvatar();
                updatePantPanelPreview();
            });
        });
    }

    function initDefaultSelection() {
        const eyeWrap = document.getElementById("eye-options");
        if (eyeWrap) {
            const b = eyeWrap.querySelector('[data-base="' + state.baseNum + '"]');
            selectInGroup(eyeWrap, b, "scroll-option");
        }
        const earWrap = document.getElementById("ear-options");
        if (earWrap) {
            const e = earWrap.querySelector('[data-ear="' + state.earVariant + '"]');
            selectInGroup(earWrap, e, "scroll-option");
        }
        const hairWrap = document.getElementById("hair-style-options");
        if (hairWrap) {
            const sel =
                state.hairNum == null
                    ? hairWrap.querySelector('[data-hair=""]')
                    : hairWrap.querySelector('[data-hair="' + state.hairNum + '"]');
            selectInGroup(hairWrap, sel || hairWrap.querySelector("[data-hair]"), "scroll-option");
        }
        updateSkinSwatch();
        updateHairSwatch();
        updateShirtSwatch();
        updatePantSwatch();
    }

    function boot() {
        loadPersistedState();
        syncDomFromState();
        wireCategoryTabs();
        wireBasePanel();
        wireHairPanel();
        wireTopsBottoms();
        applyActivePanelFromState();
        initDefaultSelection();
        composeAvatar();
        updateShirtPanelPreview();
        updatePantPanelPreview();

        function flushBeforeLeave() {
            flushPersistState();
            flushMergedAvatarSave();
        }

        window.addEventListener("pagehide", flushBeforeLeave);
        window.addEventListener("beforeunload", flushBeforeLeave);
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "hidden") {
                flushBeforeLeave();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
