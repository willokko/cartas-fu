// Captura o HTML com o motor do navegador, preservando posições e métricas da fonte.
const resolutionLabel = document.createElement('label');
resolutionLabel.style.cssText = 'display:block;width:100%;margin:12px 0;font:14px system-ui;color:#334155';
resolutionLabel.textContent = 'Resolução do PNG: ';
const resolutionSelect = document.createElement('select');
resolutionSelect.setAttribute('aria-label', 'Resolução do PNG');
[['1', '1× (298 × 393)'], ['2', '2× (596 × 786)'], ['4', '4× (1192 × 1572 — recomendado)']].forEach(([value, label]) => {
    resolutionSelect.add(new Option(label, value));
});
resolutionSelect.value = '4';
resolutionLabel.append(resolutionSelect);
const downloadParent = document.getElementById('downloadBtn').parentElement;
downloadParent.append(resolutionLabel);
// Apenas o cabeçalho horizontal de equipamentos deve quebrar em linhas.
// Em acessórios, flex-basis:100% e wrap numa coluna criavam novas colunas
// e deslocavam a prévia e o editor para fora da página.
if (getComputedStyle(downloadParent).flexDirection === 'row') {
    resolutionLabel.style.flexBasis = '100%';
    downloadParent.style.flexWrap = 'wrap';
}

const exportAssetCache = new Map();
function blobAsDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
function embedAsset(url) {
    if (url.startsWith('data:')) return Promise.resolve(url);
    const absolute = new URL(url, document.baseURI).href;
    if (!exportAssetCache.has(absolute)) {
        const request = fetch(absolute).then(response => {
            if (!response.ok) throw new Error(`Não foi possível carregar ${absolute}`);
            return response.blob();
        }).then(blobAsDataURL).catch(error => {
            exportAssetCache.delete(absolute);
            throw error;
        });
        exportAssetCache.set(absolute, request);
    }
    return exportAssetCache.get(absolute);
}
async function embedCSSAssets(css, baseURL, allowMissing = false) {
    const matches = [...css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)];
    for (const match of matches) {
        try {
            const data = await embedAsset(new URL(match[2], baseURL).href);
            css = css.replace(match[0], `url("${data}")`);
        } catch (error) {
            if (!allowMissing) throw error;
            // Um fundo ausente também está ausente na prévia.
            css = css.replace(match[0], 'none');
        }
    }
    return css;
}
let exportFonts;
function embeddedFonts() {
    if (!exportFonts) exportFonts = (async () => {
        const blocks = [];
        for (const sheet of document.styleSheets) {
            let css;
            try {
                css = [...sheet.cssRules].filter(rule => rule.type === CSSRule.FONT_FACE_RULE).map(rule => rule.cssText).join('\n');
            } catch {
                if (!sheet.href || !sheet.href.startsWith('https://fonts.googleapis.com/')) continue;
                const response = await fetch(sheet.href);
                if (!response.ok) throw new Error('Não foi possível incorporar a fonte da carta.');
                css = await response.text();
            }
            if (css) blocks.push(await embedCSSAssets(css, sheet.href || document.baseURI));
        }
        return blocks.join('\n');
    })().catch(error => { exportFonts = null; throw error; });
    return exportFonts;
}

async function captureCardPNG() {
    const card = document.getElementById('captureArea');
    await document.fonts.ready;
    card.fitTexts?.();
    await Promise.all([...card.querySelectorAll('img')].filter(img => img.getAttribute('src') &&
        getComputedStyle(img.parentElement).display !== 'none').map(img => img.decode()));
    const clone = card.cloneNode(true);
    const originals = [card, ...card.querySelectorAll('*')];
    const copies = [clone, ...clone.querySelectorAll('*')];
    await Promise.all(originals.map(async (original, index) => {
        const copy = copies[index];
        const computed = getComputedStyle(original);
        copy.removeAttribute('class');
        copy.removeAttribute('style');
        // Usar o estilo efetivo, incluindo CSS do editor e fonte ajustada.
        for (const property of computed) copy.style.setProperty(property, computed.getPropertyValue(property));
        copy.style.outline = 'none';
        if (computed.backgroundImage !== 'none') {
            copy.style.backgroundImage = await embedCSSAssets(computed.backgroundImage, document.baseURI, true);
        }
        if (copy instanceof HTMLImageElement) {
            copy.removeAttribute('srcset');
            copy.removeAttribute('crossorigin');
            if (computed.display === 'none' || !original.getAttribute('src') || !original.naturalWidth) {
                copy.removeAttribute('src');
            } else copy.src = await embedAsset(original.currentSrc || original.src);
        }
    }));
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    Object.assign(clone.style, { margin: '0', position: 'relative', left: '0', top: '0',
        right: 'auto', bottom: 'auto', transform: 'none', boxShadow: 'none' });
    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const fontStyle = document.createElement('style');
    fontStyle.textContent = await embeddedFonts();
    clone.prepend(fontStyle);
    const serialized = new XMLSerializer().serializeToString(clone);
    const scale = Number(resolutionSelect.value);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${serialized}</foreignObject></svg>`;
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas;
}

async function saveCardPNG(canvas, filename) {
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => {
        if (value) resolve(value);
        else reject(new Error('Não foi possível criar o arquivo PNG.'));
    }, 'image/png'));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}
