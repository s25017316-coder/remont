const MASTER_PHONE = '77715442786';
const MASTER_PHONE_DISPLAY = '+7 771 544 27 86';
const API_URL = 'https://boiler-bot.onrender.com/api/lead';
const STORAGE_KEY = 'boiler_site_state_v1';

const citySelect = document.getElementById('citySelect');
const customDistrictGroup = document.getElementById('customDistrictGroup');
const customDistrictInput = document.getElementById('customDistrict');
const sourceSelect = document.getElementById('source');
const entryForm = document.getElementById('entryForm');
const welcomeModal = document.getElementById('welcomeModal');
const siteWrapper = document.getElementById('siteWrapper');
const displayLocation = document.getElementById('displayLocation');
const callbackForm = document.getElementById('callbackForm');
const callSummary = document.getElementById('callSummary');
const whatsappBtn = document.getElementById('whatsappBtn');

const clientNameInput = document.getElementById('clientName');
const clientPhoneInput = document.getElementById('clientPhone');
const boilerModelInput = document.getElementById('boilerModel');

const defaultState = {
    entered: false,
    location: 'Алматы и Алатау',
    source: 'Не указан',
    name: '',
    phone: '',
    model: ''
};

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...defaultState };
        return { ...defaultState, ...JSON.parse(raw) };
    } catch (_) {
        return { ...defaultState };
    }
}

function saveState(patch) {
    state = { ...state, ...patch };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
}

let state = loadState();
let selectedLocation = state.location;
let selectedSource = state.source;

function updateWhatsappLink() {
    if (!whatsappBtn) return;
    const welcomeText = encodeURIComponent(
        `Здравствуйте! Нужен ремонт газового котла (24/7). Локация: ${selectedLocation}. Источник: ${selectedSource}.`
    );
    whatsappBtn.href = `https://wa.me/${MASTER_PHONE}?text=${welcomeText}`;
}

function applyStateToUI() {
    if (displayLocation) {
        displayLocation.textContent = 'Локация: ' + selectedLocation + ' • 24/7';
    }
    if (clientNameInput && state.name) clientNameInput.value = state.name;
    if (clientPhoneInput && state.phone) clientPhoneInput.value = state.phone;
    if (boilerModelInput && state.model) boilerModelInput.value = state.model;

    if (sourceSelect && state.source && state.source !== 'Не указан') {
        sourceSelect.value = state.source;
    }

    updateWhatsappLink();

    if (state.entered) {
        if (welcomeModal) welcomeModal.style.display = 'none';
        if (siteWrapper) siteWrapper.style.display = 'block';
    }
}

applyStateToUI();

citySelect.addEventListener('change', function () {
    if (this.value === 'other_district') {
        customDistrictGroup.style.display = 'block';
        customDistrictInput.required = true;
    } else {
        customDistrictGroup.style.display = 'none';
        customDistrictInput.required = false;
        customDistrictInput.value = '';
    }
});

entryForm.addEventListener('submit', function (e) {
    e.preventDefault();

    selectedLocation = citySelect.value === 'other_district'
        ? (customDistrictInput.value.trim() || 'Алматы и Алатау')
        : (citySelect.value || 'Алматы и Алатау');

    selectedSource = sourceSelect.value || 'Не указан';

    saveState({
        entered: true,
        location: selectedLocation,
        source: selectedSource
    });

    displayLocation.textContent = 'Локация: ' + selectedLocation + ' • 24/7';
    updateWhatsappLink();

    welcomeModal.style.display = 'none';
    siteWrapper.style.display = 'block';
});

[clientNameInput, clientPhoneInput, boilerModelInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener('input', function () {
        saveState({
            name: clientNameInput.value,
            phone: clientPhoneInput.value,
            model: boilerModelInput.value
        });
    });
});

callbackForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = clientNameInput.value.trim();
    const phone = clientPhoneInput.value.trim();
    const model = boilerModelInput.value.trim() || 'не указана';

    const message =
        `Новый вызов (24/7) на ${MASTER_PHONE_DISPLAY}:\n` +
        `Клиент: ${name}\n` +
        `Телефон: ${phone}\n` +
        `Локация: ${selectedLocation}\n` +
        `Котёл: ${model}\n` +
        `Источник: ${selectedSource}`;

    const waUrl = `https://wa.me/${MASTER_PHONE}?text=${encodeURIComponent(message)}`;

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            phone: phone,
            model: model,
            location: selectedLocation,
            source: selectedSource,
            schedule: '24/7',
            masterPhone: MASTER_PHONE_DISPLAY
        })
    })
    .then(function (res) {
        if (!res.ok) {
            throw new Error('Ошибка сервера');
        }
        return res.json();
    })
    .then(function () {
        saveState({ name: '', phone: '', model: '' });
        callbackForm.reset();

        callSummary.style.display = 'block';
        callSummary.innerHTML =
            `<p style="color: #22c55e;"><strong>Заявка отправлена! Работаем 24/7.</strong></p>` +
            `<p>Ожидайте звонка мастера на номер ${phone}.</p>` +
            `<div class="summary-actions">` +
            `<a href="tel:+${MASTER_PHONE}" class="btn-primary">Позвонить сразу</a>` +
            `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary">Написать в WhatsApp</a>` +
            `</div>`;
    })
    .catch(function () {
        callSummary.style.display = 'block';
        callSummary.innerHTML =
            `<p style="color: #ef4444;">Сервер не ответил. Можно сразу отправить заявку в WhatsApp (24/7):</p>` +
            `<div class="summary-actions">` +
            `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary">Открыть WhatsApp</a>` +
            `<a href="tel:+${MASTER_PHONE}" class="btn-secondary">Позвонить</a>` +
            `</div>`;
    });
});
