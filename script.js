const MASTER_PHONE = '77715442786';
const MASTER_PHONE_DISPLAY = '+7 771 544 27 86';
const API_URL = 'https://boiler-bot.onrender.com/api/lead';
const STORAGE_KEY = 'boiler_site_state_v2';
const RATE_LIMIT_KEY = 'boiler_lead_rate_limit_v1';

const MAX_REQUESTS_PER_WINDOW = 5;
const WINDOW_DURATION_MS = 20 * 60 * 1000;

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
const privacyConsentInput = document.getElementById('privacyConsent');

const defaultState = {
    entered: false,
    location: 'Алматы и Алатау',
    source: 'Сайт / Поиск',
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

function loadRateLimitData() {
    const now = Date.now();
    try {
        const raw = localStorage.getItem(RATE_LIMIT_KEY);
        if (!raw) {
            return { timestamps: [], blockedUntil: 0 };
        }
        const parsed = JSON.parse(raw);
        const validTimestamps = Array.isArray(parsed.timestamps)
            ? parsed.timestamps.filter(ts => typeof ts === 'number' && (now - ts) < WINDOW_DURATION_MS)
            : [];
        const blockedUntil = (typeof parsed.blockedUntil === 'number' && parsed.blockedUntil > now)
            ? parsed.blockedUntil
            : 0;
        return { timestamps: validTimestamps, blockedUntil: blockedUntil };
    } catch (_) {
        return { timestamps: [], blockedUntil: 0 };
    }
}

function saveRateLimitData(data) {
    try {
        localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (_) {}
}

function formatRemainingTime(ms) {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
        return `${minutes} мин ${seconds} сек`;
    }
    return `${seconds} сек`;
}

function checkRateLimit() {
    const now = Date.now();
    const data = loadRateLimitData();

    if (data.blockedUntil > now) {
        return {
            allowed: false,
            remainingMs: data.blockedUntil - now,
            remainingAttempts: 0
        };
    }

    if (data.blockedUntil !== 0 && data.blockedUntil <= now) {
        data.blockedUntil = 0;
        data.timestamps = [];
        saveRateLimitData(data);
    }

    const remainingAttempts = Math.max(0, MAX_REQUESTS_PER_WINDOW - data.timestamps.length);
    return {
        allowed: remainingAttempts > 0,
        remainingMs: 0,
        remainingAttempts: remainingAttempts
    };
}

function recordRequestAttempt() {
    const now = Date.now();
    const data = loadRateLimitData();
    data.timestamps = data.timestamps.filter(ts => (now - ts) < WINDOW_DURATION_MS);
    data.timestamps.push(now);

    if (data.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
        data.blockedUntil = now + WINDOW_DURATION_MS;
    }

    saveRateLimitData(data);
}

function updateWhatsappLink() {
    if (!whatsappBtn) return;
    const welcomeText = encodeURIComponent(
        `Здравствуйте! Нужен ремонт газового котла (24/7). Локация: ${selectedLocation}.`
    );
    whatsappBtn.href = `https://wa.me/${MASTER_PHONE}?text=${welcomeText}`;
}

function applyStateToUI() {
    if (displayLocation) {
        displayLocation.textContent = '📍 ' + selectedLocation + ' • 24/7';
    }
    if (citySelect && selectedLocation && selectedLocation !== 'Алматы и Алатау') {
        const hasOption = Array.from(citySelect.options).some(opt => opt.value === selectedLocation);
        if (hasOption) {
            citySelect.value = selectedLocation;
        }
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

if (citySelect) {
    citySelect.addEventListener('change', function () {
        if (this.value === 'other_district' && customDistrictGroup && customDistrictInput) {
            customDistrictGroup.style.display = 'block';
            customDistrictInput.required = true;
        } else {
            if (customDistrictGroup) customDistrictGroup.style.display = 'none';
            if (customDistrictInput) {
                customDistrictInput.required = false;
                customDistrictInput.value = '';
            }
            selectedLocation = this.value || 'Алматы и Алатау';
            saveState({ location: selectedLocation });
            if (displayLocation) {
                displayLocation.textContent = '📍 ' + selectedLocation + ' • 24/7';
            }
            updateWhatsappLink();
        }
    });
}

if (entryForm) {
    entryForm.addEventListener('submit', function (e) {
        e.preventDefault();

        selectedLocation = citySelect && citySelect.value === 'other_district'
            ? ((customDistrictInput && customDistrictInput.value.trim()) || 'Алматы и Алатау')
            : ((citySelect && citySelect.value) || 'Алматы и Алатау');

        selectedSource = (sourceSelect && sourceSelect.value) || 'Не указан';

        saveState({
            entered: true,
            location: selectedLocation,
            source: selectedSource
        });

        if (displayLocation) {
            displayLocation.textContent = '📍 ' + selectedLocation + ' • 24/7';
        }
        updateWhatsappLink();

        if (welcomeModal) welcomeModal.style.display = 'none';
        if (siteWrapper) siteWrapper.style.display = 'block';
    });
}

[clientNameInput, clientPhoneInput, boilerModelInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener('input', function () {
        saveState({
            name: clientNameInput ? clientNameInput.value : '',
            phone: clientPhoneInput ? clientPhoneInput.value : '',
            model: boilerModelInput ? boilerModelInput.value : ''
        });
    });
});

if (callbackForm) {
    callbackForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const rateStatus = checkRateLimit();
        if (!rateStatus.allowed) {
            if (callSummary) {
                callSummary.style.display = 'block';
                callSummary.innerHTML =
                    `<p style="color: #ef4444;"><strong>Превышен лимит заявок (максимум ${MAX_REQUESTS_PER_WINDOW} за 20 минут).</strong></p>` +
                    `<p>Отправка временно заблокирована. Повторите попытку через <strong>${formatRemainingTime(rateStatus.remainingMs)}</strong> или свяжитесь напрямую по телефону / WhatsApp.</p>` +
                    `<div class="summary-actions">` +
                    `<a href="tel:+${MASTER_PHONE}" class="btn-primary">Позвонить: ${MASTER_PHONE_DISPLAY}</a>` +
                    `<a href="https://wa.me/${MASTER_PHONE}" target="_blank" rel="noopener noreferrer" class="btn-secondary">Написать в WhatsApp</a>` +
                    `</div>`;
            }
            return;
        }

        if (privacyConsentInput && !privacyConsentInput.checked) {
            alert('Подтвердите согласие на обработку персональных данных.');
            return;
        }

        const name = clientNameInput ? clientNameInput.value.trim() : '';
        const phone = clientPhoneInput ? clientPhoneInput.value.trim() : '';
        const model = boilerModelInput ? (boilerModelInput.value.trim() || 'не указана') : 'не указана';
        const formLocation = (citySelect && citySelect.value && citySelect.value !== 'other_district')
            ? citySelect.value
            : selectedLocation;

        selectedLocation = formLocation;
        saveState({ location: selectedLocation });
        if (displayLocation) {
            displayLocation.textContent = '📍 ' + selectedLocation + ' • 24/7';
        }

        const message =
            `Новый вызов (24/7) на ${MASTER_PHONE_DISPLAY}:\n` +
            `Клиент: ${name}\n` +
            `Телефон: ${phone}\n` +
            `Локация: ${selectedLocation}\n` +
            `Котёл: ${model}\n` +
            `Источник: ${selectedSource}`;

        const waUrl = `https://wa.me/${MASTER_PHONE}?text=${encodeURIComponent(message)}`;
        const submitBtn = callbackForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        recordRequestAttempt();
        const afterAttemptStatus = checkRateLimit();

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
            if (privacyConsentInput) privacyConsentInput.checked = true;

            const limitNote = afterAttemptStatus.allowed
                ? `<p style="font-size: 13px; color: #94a3b8;">Осталось доступных заявок за 20 минут: ${afterAttemptStatus.remainingAttempts} из ${MAX_REQUESTS_PER_WINDOW}.</p>`
                : `<p style="font-size: 13px; color: #f59e0b;">Достигнут лимит ${MAX_REQUESTS_PER_WINDOW} заявок за 20 минут — следующая отправка через ${formatRemainingTime(afterAttemptStatus.remainingMs)}.</p>`;

            if (callSummary) {
                callSummary.style.display = 'block';
                callSummary.innerHTML =
                    `<p style="color: #22c55e;"><strong>Заявка отправлена! Работаем 24/7.</strong></p>` +
                    `<p>Ожидайте звонка мастера на номер ${phone} (${selectedLocation}).</p>` +
                    limitNote +
                    `<div class="summary-actions">` +
                    `<a href="tel:+${MASTER_PHONE}" class="btn-primary">Позвонить сразу</a>` +
                    `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary">Написать в WhatsApp</a>` +
                    `</div>`;
            }
        })
        .catch(function () {
            if (callSummary) {
                callSummary.style.display = 'block';
                callSummary.innerHTML =
                    `<p style="color: #ef4444;">Сервер не ответил. Можно сразу отправить заявку в WhatsApp (24/7):</p>` +
                    `<div class="summary-actions">` +
                    `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-primary">Открыть WhatsApp</a>` +
                    `<a href="tel:+${MASTER_PHONE}" class="btn-secondary">Позвонить</a>` +
                    `</div>`;
            }
        })
        .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
        });
    });
}

document.querySelectorAll('[data-open-modal]').forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
        e.preventDefault();
        const modalId = this.getAttribute('data-open-modal');
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    });
});

document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
    btn.addEventListener('click', function () {
        const modalId = this.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    });
});

document.querySelectorAll('.legal-modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

window.addEventListener('DOMContentLoaded', function () {
    // ВСТАВЬ НОВУЮ ССЫЛКУ ВОТ ЗДЕСЬ (строка ниже)
    fetch('https://boiler-analytics.onrender.com/track', { mode: 'no-cors' }).catch(() => {});
    
    fetch('schema.json')
        .then(function (res) {
            return res.ok ? res.text() : null;
        })
        .then(function (jsonText) {
            if (!jsonText) return;
            const ldScript = document.createElement('script');
            ldScript.type = 'application/ld+json';
            ldScript.textContent = jsonText;
            document.body.appendChild(ldScript);
        })
        .catch(function () {});
});
