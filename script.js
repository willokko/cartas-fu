const nameInput = document.getElementById('nameInput');
const priceInput = document.getElementById('priceInput');
const descInput = document.getElementById('descInput');
const imageInput = document.getElementById('imageInput');

const cardName = document.getElementById('cardName');
const cardPrice = document.getElementById('cardPrice');
const cardDesc = document.getElementById('cardDesc');
const cardImg = document.getElementById('cardImg');
const downloadBtn = document.getElementById('downloadBtn');

const defaultName = 'Nome do Item';
const defaultPrice = '0z';
const defaultDesc = 'A descrição do seu item aparecerá aqui.';
const transparentPlaceholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const descriptionMinSize = 8;
const descriptionMaxSize = 11.4;

function fitDescriptionText() {
    if (document.getElementById('captureArea').dataset.layoutEditable) return;
    let currentSize = descriptionMaxSize;
    cardDesc.style.fontSize = `${currentSize}px`;

    while (currentSize > descriptionMinSize && cardDesc.scrollHeight > cardDesc.clientHeight) {
        currentSize -= 0.1;
        cardDesc.style.fontSize = `${currentSize}px`;
    }
}

function updateText(input, element, defaultValue) {
    const syncValue = () => {
        element.textContent = input.value.trim() === '' ? defaultValue : input.value;

        if (element === cardDesc) {
            fitDescriptionText();
        }
    };

    input.addEventListener('input', syncValue);
    syncValue();
}

async function exportCardToPNG() {
    const canvas = await captureCardPNG();
    await saveCardPNG(canvas, 'carta-rpg.png');
}
updateText(nameInput, cardName, defaultName);
updateText(priceInput, cardPrice, defaultPrice);
updateText(descInput, cardDesc, defaultDesc);

imageInput.addEventListener('change', function (event) {
    const file = event.target.files[0];

    if (!file) {
        cardImg.src = transparentPlaceholder;
        return;
    }

    const reader = new FileReader();

    reader.onload = function (loadEvent) {
        cardImg.src = loadEvent.target.result;
    };

    reader.readAsDataURL(file);
});

downloadBtn.addEventListener('click', async function () {
    try {
        await exportCardToPNG();
    } catch (error) {
        console.error('Erro ao exportar a carta:', error);
        alert('Não foi possível gerar a imagem agora. Tente novamente.');
    }
});


