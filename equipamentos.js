const nameInput = document.getElementById('nameInput');
const priceInput = document.getElementById('priceInput');
const imageInput = document.getElementById('imageInput');
const elementInput = document.getElementById('elementInput');
const lvlBaseInput = document.getElementById('lvlBaseInput');
const lvl4Input = document.getElementById('lvl4Input');
const lvl10Input = document.getElementById('lvl10Input');
const lvl20Input = document.getElementById('lvl20Input');
const descInput = document.getElementById('descInput');

const cardName = document.getElementById('cardName');
const cardPrice = document.getElementById('cardPrice');
const cardImg = document.getElementById('cardImg');
const cardElement = document.getElementById('cardElement');
const cardElementImg = document.getElementById('cardElementImg');
const cardLvlBase = document.getElementById('cardLvlBase');
const cardLvl4 = document.getElementById('cardLvl4');
const cardLvl10 = document.getElementById('cardLvl10');
const cardLvl20 = document.getElementById('cardLvl20');

// Mapa de elementos para imagens
const elementImageMap = {
    '': '',
    '⚔️': 'elementos/fisico.png',
    '🔥': 'elementos/fogo.png',
    '❄️': 'elementos/gelo.png',
    '🪨': 'elementos/terra.png',
    '💨': 'elementos/vento.png',
    '⚡': 'elementos/raio.png',
    '✨': 'elementos/luz.png',
    '🌑': 'elementos/trevas.png',
    '🧪': 'elementos/veneno.png'
};

const cardDesc = document.getElementById('cardDesc');

const defaultName = 'Nome da Arma';
const defaultPrice = '0 z';
const defaultDesc = '';

function bindInput(inputEl, displayEl, defaultValue = '') {
    inputEl.addEventListener('input', (e) => {
        displayEl.textContent = e.target.value.trim() === '' ? defaultValue : e.target.value;
    });
}

bindInput(nameInput, cardName, defaultName);
bindInput(priceInput, cardPrice, defaultPrice);
bindInput(lvlBaseInput, cardLvlBase, '');
bindInput(lvl4Input, cardLvl4, '');
bindInput(lvl10Input, cardLvl10, '');
bindInput(lvl20Input, cardLvl20, '');

descInput.addEventListener('input', (e) => {
    cardDesc.textContent = e.target.value;
});

// Inicializar o elemento como vazio na carga da página
document.addEventListener('DOMContentLoaded', () => {
    const cardElementCircle = document.getElementById('cardElement');
    cardElementCircle.classList.add('empty');
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        cardImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        // Evita que uma leitura anterior substitua uma seleção mais recente.
        if (imageInput.files[0] === file) cardImg.src = reader.result;
    };
    reader.onerror = () => alert('Não foi possível ler a imagem. Selecione o arquivo novamente.');
    reader.readAsDataURL(file);
});

elementInput.addEventListener('change', (e) => {
    const elementValue = e.target.value;
    const imagePath = elementImageMap[elementValue] || '';
    const cardElementCircle = document.getElementById('cardElement');
    
    if (imagePath) {
        cardElementImg.src = imagePath;
        cardElementCircle.classList.remove('empty');
    } else {
        cardElementImg.src = '';
        cardElementCircle.classList.add('empty');
    }
});

function downloadCard() {
    const card = document.getElementById('captureArea');
    const btn = document.getElementById('downloadBtn');
    const originalBtnText = btn.innerHTML;

    btn.innerHTML = 'Gerando...';
    btn.disabled = true;

    document.fonts.ready.then(() => {
        captureCardPNG().then(async (canvas) => {
            const fileName = nameInput.value.trim() || 'carta';
            await saveCardPNG(canvas, `item_${fileName.replace(/\s+/g, '_').toLowerCase()}.png`);

            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }).catch((err) => {
            console.error('Erro ao gerar a carta: ', err);
            alert('Houve um erro ao gerar a carta. Aguarde a imagem carregar e tente novamente.');
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        });
    });
}

document.getElementById('downloadBtn').addEventListener('click', downloadCard);
