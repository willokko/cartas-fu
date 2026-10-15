// Coordenadas em pixels da carta original (298 × 393), independentes da tela.
(async function () {
    await document.fonts.ready;
    const card = document.getElementById('captureArea');
    card.dataset.layoutEditable = 'true';
    const equipment = Boolean(document.getElementById('cardLvlBase'));
    const definitions = [
        ['.card-name', 'Nome'], ['.card-image-wrapper', 'Imagem'],
        ['.card-price', 'Preço'], ['.card-description', 'Descrição'],
        ...(equipment ? [['.card-element-circle', 'Elemento'], ['.effect-base', 'Efeito base'],
            ['.effect-lvl4', 'Nível 4'], ['.effect-lvl10', 'Nível 10'], ['.effect-lvl20', 'Nível 20']] : [])
    ];
    const properties = { left: 'Posição X', top: 'Posição Y', width: 'Largura', height: 'Altura',
        fontSize: 'Fonte', lineHeight: 'Entrelinhas', paddingLeft: 'Recuo esquerdo',
        paddingRight: 'Recuo direito', paddingTop: 'Recuo superior', paddingBottom: 'Recuo inferior' };
    // Medir todos os campos antes de retirar qualquer um do fluxo.
    const origin = card.getBoundingClientRect();
    const fields = definitions.map(([selector, label]) => {
        const element = card.querySelector(selector);
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const values = { left: rect.left - origin.left, top: rect.top - origin.top,
            width: rect.width, height: rect.height };
        if (style.display === 'none') {
            values.width = parseFloat(style.width);
            values.height = parseFloat(style.height);
            values.top = parseFloat(style.top);
            values.left = card.clientWidth - parseFloat(style.right) - values.width;
        }
        for (const key of Object.keys(properties).slice(4)) {
            values[key] = parseFloat(style[key]) || (key === 'lineHeight' ? parseFloat(style.fontSize) * 1.2 : 0);
        }
        return { selector, label, element, values, defaults: { ...values }, autoFit: true };
    });
    const panel = document.createElement('details');
    panel.className = 'layout-editor';
    panel.innerHTML = `<summary>Ajustar campos da carta</summary>
        <p>Selecione um campo e ajuste os valores em pixels. X e Y partem do canto superior esquerdo da carta. A fonte é o tamanho máximo: ela diminui automaticamente quando o texto não cabe e volta a crescer ao encurtá-lo. Os ajustes também aparecem no PNG.</p>
        <label>Campo<select aria-label="Campo da carta"></select></label>
        <div class="layout-controls"></div><div class="layout-actions">
        <button type="button" data-action="guides">Mostrar limites</button>
        <button type="button" data-action="reset">Restaurar ajustes</button>
        <button type="button" data-action="copy">Copiar CSS</button>
        <button type="button" data-action="apply-css">Aplicar CSS escrito</button></div>
        <p role="status" aria-live="polite"></p>
        <textarea rows="12" spellcheck="false" aria-label="CSS dos campos"></textarea>
        <p>Você também pode escrever o CSS acima e clicar em Aplicar CSS escrito. Use seletores iniciados por .card-container.</p>
        <p>Copie este CSS para o final de ${equipment ? 'equipamentos.css' : 'style.css'}. Os ajustes desta sessão são temporários. Remova a inclusão de layout-editor.js quando terminar a calibração.</p>`;
    card.closest('.preview-wrapper').parentElement.append(panel);
    const select = panel.querySelector('select');
    fields.forEach((field, i) => select.add(new Option(field.label, i)));
    const controls = panel.querySelector('.layout-controls');
    const output = panel.querySelector('textarea');
    const status = panel.querySelector('[role="status"]');
    const customStyle = document.createElement('style');
    document.head.append(customStyle);
    let customMode = false;
    const textFields = fields.filter(field => field.element.matches('.card-name, .card-price, .card-description, .card-effect'));
    function fitTexts() {
        textFields.forEach(field => {
            const el = field.element;
            const maximum = field.values.fontSize;
            const ratio = field.values.lineHeight / maximum;
            const style = getComputedStyle(el);
            const availableWidth = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            const availableHeight = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
            if (availableWidth <= 0 || availableHeight <= 0) return;
            const setSize = size => {
                el.style.fontSize = `${size}px`;
                el.style.lineHeight = `${size * ratio}px`;
            };
            const range = document.createRange();
            range.selectNodeContents(el);
            const fits = () => {
                const rect = range.getBoundingClientRect();
                return rect.width <= availableWidth + 0.25 && rect.height <= availableHeight + 0.25 &&
                    el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth;
            };
            setSize(maximum);
            if (!field.autoFit || !el.textContent || fits()) return;
            let low = 0.1, high = maximum;
            for (let step = 0; step < 16; step++) {
                const middle = (low + high) / 2;
                setSize(middle);
                if (fits()) low = middle; else high = middle;
            }
            setSize(Math.floor(low * 100) / 100);
        });
    }
    // Usado também pela exportação, antes de capturar a carta.
    card.fitTexts = fitTexts;
    const cssName = key => key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    function apply() {
        if (customMode) { fitTexts(); return; }
        card.querySelector('.card-middle-row').style.position = 'static';
        fields.forEach(field => {
            field.element.classList.add('layout-field');
            Object.assign(field.element.style, { position: 'absolute', margin: '0', right: 'auto',
                bottom: 'auto', boxSizing: 'border-box', overflow: 'hidden', overflowWrap: 'anywhere' });
            for (const [key, value] of Object.entries(field.values)) field.element.style[key] = `${value}px`;
        });
        output.value = '.card-container .card-middle-row { position: static; }\n\n' + fields.map(field => `.card-container ${field.selector} {\n  position: absolute;\n  margin: 0;\n  right: auto;\n  bottom: auto;\n  box-sizing: border-box;\n  overflow: hidden;\n  overflow-wrap: anywhere;\n${Object.entries(field.values).map(([key, value]) => `  ${cssName(key)}: ${value}px;`).join('\n')}\n}`).join('\n\n');
        fitTexts();
        const overflowing = fields.filter(field => field.element.scrollHeight > field.element.clientHeight + 1 || field.element.scrollWidth > field.element.clientWidth + 1);
        status.textContent = overflowing.length ? `Texto excede o campo: ${overflowing.map(field => field.label).join(', ')}. Aumente a área ou reduza a fonte.` : '';
    }
    function showControls() {
        controls.replaceChildren();
        const field = fields[select.value];
        if (textFields.includes(field)) {
            const label = document.createElement('label');
            label.textContent = 'Reduzir fonte automaticamente';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.checked = field.autoFit;
            checkbox.addEventListener('change', () => {
                field.autoFit = checkbox.checked; fitTexts();
                status.textContent = checkbox.checked ? 'A fonte será reduzida somente para caber no campo.' : 'Fonte manual ativada. O texto poderá ultrapassar a área do campo.';
            });
            label.append(checkbox); controls.append(label);
        }
        for (const [key, label] of Object.entries(properties)) {
            const wrapper = document.createElement('label');
            wrapper.textContent = `${label} (px)`;
            const input = document.createElement('input');
            input.type = 'number'; input.step = 'any';
            input.min = ['left', 'top'].includes(key) ? '-393' : key === 'width' || key === 'height' || key === 'fontSize' || key === 'lineHeight' ? '1' : '0';
            input.max = '1000'; input.value = field.values[key];
            input.addEventListener('input', () => {
                if (!input.validity.valid || input.value === '') return;
                try {
                    const sheet = parseCSS(output.value);
                    const selector = `.card-container ${field.selector}`;
                    let rule = [...sheet.cssRules].find(rule => rule.selectorText === selector);
                    if (!rule) {
                        sheet.insertRule(`${selector} {}`, sheet.cssRules.length);
                        rule = sheet.cssRules[sheet.cssRules.length - 1];
                    }
                    rule.style.setProperty(cssName(key), `${input.value}px`, rule.style.getPropertyPriority(cssName(key)));
                    output.value = formatCSS(sheet);
                    applyWrittenCSS(false);
                } catch (error) { status.textContent = `CSS não aplicado: ${error.message}`; }
            });
            wrapper.append(input); controls.append(wrapper);
        }
    }
    select.addEventListener('change', showControls);
    panel.querySelector('[data-action="guides"]').addEventListener('click', event => {
        const visible = card.classList.toggle('layout-guides');
        event.target.textContent = visible ? 'Ocultar limites' : 'Mostrar limites';
    });
    panel.querySelector('[data-action="reset"]').addEventListener('click', () => {
        customMode = false; customStyle.textContent = '';
        fields.forEach(field => { field.values = { ...field.defaults }; field.autoFit = true; }); apply(); showControls();
    });
    function parseCSS(text) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        const rules = [...sheet.cssRules];
        if (!rules.length || rules.some(rule => !rule.selectorText ||
            rule.selectorText.split(',').some(selector => !/^\.card-container(?:\s|[.#:\[]|$)/.test(selector.trim())))) {
            throw new Error('Use somente regras de estilo com seletores iniciados por .card-container.');
        }
        // Consolidar também o CSS de sessões antigas que acumulavam regras.
        const merged = new Map();
        for (const rule of rules) {
            const existing = merged.get(rule.selectorText);
            if (!existing) { merged.set(rule.selectorText, rule); continue; }
            for (const property of rule.style) {
                const priority = rule.style.getPropertyPriority(property);
                if (existing.style.getPropertyPriority(property) === 'important' && priority !== 'important') continue;
                existing.style.setProperty(property, rule.style.getPropertyValue(property), priority);
            }
        }
        const clean = new CSSStyleSheet();
        clean.replaceSync([...merged.values()].map(rule => rule.cssText).join('\n'));
        return clean;
    }
    function formatCSS(sheet) {
        return [...sheet.cssRules].map(rule => `${rule.selectorText} {\n${[...rule.style].map(property =>
            `  ${property}: ${rule.style.getPropertyValue(property)}${rule.style.getPropertyPriority(property) ? ' !important' : ''};`).join('\n')}\n}`).join('\n\n');
    }
    function applyWrittenCSS(refreshControls = true) {
        try {
            const sheet = parseCSS(output.value);
            fields.forEach(field => field.element.removeAttribute('style'));
            card.querySelector('.card-middle-row').removeAttribute('style');
            output.value = formatCSS(sheet);
            customStyle.textContent = output.value;
            customMode = true;
            fields.forEach(field => {
                const computed = getComputedStyle(field.element);
                for (const key of Object.keys(properties)) {
                    const value = parseFloat(computed[key]);
                    if (Number.isFinite(value)) field.values[key] = value;
                }
            });
            if (refreshControls) showControls();
            fitTexts();
            status.textContent = 'CSS aplicado à prévia e ao PNG. Declarações inválidas são ignoradas pelo navegador.';
        } catch (error) { status.textContent = `CSS não aplicado: ${error.message}`; }
    }
    panel.querySelector('[data-action="apply-css"]').addEventListener('click', () => applyWrittenCSS());
    panel.querySelector('[data-action="copy"]').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(output.value); status.textContent = 'CSS copiado.'; }
        catch { output.focus(); output.select(); status.textContent = 'Use Ctrl+C para copiar o CSS selecionado.'; }
    });
    card.addEventListener('input', apply);
    document.querySelectorAll('input, textarea').forEach(input => {
        if (!panel.contains(input)) input.addEventListener('input', apply);
    });
    apply(); showControls();
    let fitFrame;
    const scheduleFit = () => {
        cancelAnimationFrame(fitFrame);
        fitFrame = requestAnimationFrame(fitTexts);
    };
    new MutationObserver(scheduleFit).observe(card, { childList: true, characterData: true, subtree: true });
    const sizeObserver = new ResizeObserver(scheduleFit);
    textFields.forEach(field => sizeObserver.observe(field.element));
    window.addEventListener('resize', scheduleFit);
    if (!equipment) {
        const background = new Image();
        background.onerror = () => {
            const warning = document.createElement('p'); warning.className = 'layout-warning';
            warning.textContent = 'Fundo ausente: Armas players(2).png. A prévia e o PNG ficarão sem fundo até o arquivo correto ser restaurado.';
            panel.before(warning);
        };
        background.src = 'Armas players(2).png';
    }
})();

