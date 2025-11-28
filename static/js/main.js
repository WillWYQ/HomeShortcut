// Simple dashboard logic -- no external deps
const STATUS_ENDPOINT = '/api/status';
const WEATHER_ENDPOINT = '/api/weather';
const STATUS_INTERVAL = 10000;
const WEATHER_INTERVAL = 180000;

const TRANSLATIONS = {
  zh: {
    tagline: '局域网入口',
    section_signal: '信号监控',
    section_lan: 'LAN 导航 / Favorites',
    section_alerts: '异常服务 / Alerts',
    section_table: '全部服务矩阵',
    card_internet_title: '网络健康',
    card_weather_title: '天气',
    card_trend_title: 'TrendRadar',
    trend_meta: '预留',
    trend_placeholder: '🚧 这里预留 GitHub TrendRadar 区块，目前仅提供链接。',
    trend_link: '打开 TrendRadar ↗',
    weather_source_hint: 'Open‑Meteo · 自动刷新',
    weather_condition_unknown: '未知天气',
    weather_day_label: '白天',
    weather_night_label: '夜间',
    weather_precip_label: '降水概率',
    hourly_unavailable: '暂无小时级预报',
    upstream_probe: '正在探测上游服务…',
    upstream_none: '未配置上游服务',
    kv_type: '类型',
    kv_endpoint: 'Endpoint',
    kv_host: 'Host',
    kv_importance: '优先级',
    importance_core: '核心',
    importance_normal: '普通',
    link_open: '打开 ↗',
    link_no_ui: '无界面',
    internet_state_label: '状态',
    internet_targets_label: '监测目标',
    internet_updated_label: '更新时间',
    internet_unknown: '网络未知',
    internet_online: 'Internet 在线',
    internet_offline: 'Internet 离线',
    avg_rtt: '平均延迟',
    targets_reachable: '可达',
    alerts_empty: '当前没有异常服务 · All green ✅',
    loading: '加载中…',
    table_name: '名称',
    table_category: '类别',
    table_type: '类型',
    table_status: '状态',
    table_metric: '延迟 / 状态码',
    table_last_change: 'last_change',
    toggle_table: '折叠 / 展开',
    status_up: '正常',
    status_down: '故障',
    status_unknown: '未知',
    weather_unavailable: '天气数据不可用',
    weather_fetch_failed: '天气获取失败（可能离线）',
    weather_disabled: '配置中禁用天气',
    weather_wind_label: '风速',
    weather_code_label: '天气码',
    aurora_unavailable: '极光状态未知',
    aurora_disabled: '极光检测未启用',
    aurora_error: '极光数据不可用',
    aurora_active: '可能出现极光',
    aurora_inactive: '暂无极光迹象',
    aurora_probability_label: '概率',
    theme_label_day: '日间模式',
    theme_label_night: '夜间模式',
    lang_label_zh: 'English',
    lang_label_en: '中文',
    alerts_label_type: '类型',
    alerts_label_category: '类别',
    alerts_label_metric: '指标',
    alerts_label_last_change: '变更时间',
    time_just_now: '刚刚',
    time_min_ago: '%d 分钟前',
    time_hour_ago: '%d 小时前',
    time_day_ago: '%d 天前',
    time_on: '于 %s'
  },
  en: {
    tagline: 'LAN entry',
    section_signal: 'Signal Monitor',
    section_lan: 'LAN Deck / Favorites',
    section_alerts: 'Alerts',
    section_table: 'All Services Matrix',
    card_internet_title: 'Internet Health',
    card_weather_title: 'Weather',
    card_trend_title: 'TrendRadar',
    trend_meta: 'placeholder',
    trend_placeholder: '🚧 Reserved for GitHub TrendRadar feed. Link only for now.',
    trend_link: 'Open TrendRadar ↗',
    weather_source_hint: 'Open-Meteo · auto refresh',
    weather_condition_unknown: 'Unknown weather',
    weather_day_label: 'Daytime',
    weather_night_label: 'Nighttime',
    weather_precip_label: 'Precip',
    hourly_unavailable: 'Hourly forecast unavailable',
    upstream_probe: 'Probing upstream services…',
    upstream_none: 'No upstream services configured',
    kv_type: 'Type',
    kv_endpoint: 'Endpoint',
    kv_host: 'Host',
    kv_importance: 'Importance',
    importance_core: 'Core',
    importance_normal: 'Normal',
    link_open: 'Open ↗',
    link_no_ui: 'No UI',
    internet_state_label: 'State',
    internet_targets_label: 'Targets',
    internet_updated_label: 'Updated',
    internet_unknown: 'Internet unknown',
    internet_online: 'Internet online',
    internet_offline: 'Internet offline',
    avg_rtt: 'Avg RTT',
    targets_reachable: 'reachable',
    alerts_empty: 'No alerts · All green ✅',
    loading: 'Loading…',
    table_name: 'Name',
    table_category: 'Category',
    table_type: 'Type',
    table_status: 'Status',
    table_metric: 'Latency / Code',
    table_last_change: 'Last Change',
    toggle_table: 'Toggle',
    status_up: 'Up',
    status_down: 'Down',
    status_unknown: 'Unknown',
    weather_unavailable: 'Weather unavailable',
    weather_fetch_failed: 'Weather fetch failed (maybe offline)',
    weather_disabled: 'Weather disabled in config',
    weather_wind_label: 'Wind',
    weather_code_label: 'Code',
    aurora_unavailable: 'Aurora status unknown',
    aurora_disabled: 'Aurora check disabled',
    aurora_error: 'Aurora data unavailable',
    aurora_active: 'Aurora likely',
    aurora_inactive: 'No aurora expected',
    aurora_probability_label: 'Probability',
    theme_label_day: 'Day Mode',
    theme_label_night: 'Night Mode',
    lang_label_zh: 'English',
    lang_label_en: '中文',
    alerts_label_type: 'Type',
    alerts_label_category: 'Category',
    alerts_label_metric: 'Metric',
    alerts_label_last_change: 'Last change',
    time_just_now: 'just now',
    time_min_ago: '%d min ago',
    time_hour_ago: '%d h ago',
    time_day_ago: '%d d ago',
    time_on: 'on %s'
  }
};

const WEATHER_CODES = {
  default: { zh: '未知天气', en: 'Unknown', iconDay: '❔', iconNight: '❔' },
  0: { zh: '晴朗', en: 'Clear', iconDay: '☀️', iconNight: '🌙' },
  1: { zh: '大部晴朗', en: 'Mainly clear', iconDay: '🌤️', iconNight: '🌙' },
  2: { zh: '局部多云', en: 'Partly cloudy', iconDay: '⛅', iconNight: '☁️' },
  3: { zh: '阴天', en: 'Overcast', iconDay: '☁️', iconNight: '☁️' },
  45: { zh: '雾', en: 'Fog', iconDay: '🌫️', iconNight: '🌫️' },
  48: { zh: '雾霾', en: 'Depositing rime fog', iconDay: '🌫️', iconNight: '🌫️' },
  51: { zh: '轻毛毛雨', en: 'Light drizzle', iconDay: '🌦️', iconNight: '🌧️' },
  53: { zh: '中等毛毛雨', en: 'Moderate drizzle', iconDay: '🌦️', iconNight: '🌧️' },
  55: { zh: '浓毛毛雨', en: 'Dense drizzle', iconDay: '🌧️', iconNight: '🌧️' },
  56: { zh: '轻冻毛毛雨', en: 'Freezing drizzle', iconDay: '🌧️', iconNight: '🌧️' },
  57: { zh: '浓冻毛毛雨', en: 'Freezing drizzle', iconDay: '🌧️', iconNight: '🌧️' },
  61: { zh: '小雨', en: 'Light rain', iconDay: '🌦️', iconNight: '🌧️' },
  63: { zh: '中雨', en: 'Moderate rain', iconDay: '🌧️', iconNight: '🌧️' },
  65: { zh: '大雨', en: 'Heavy rain', iconDay: '🌧️', iconNight: '🌧️' },
  66: { zh: '轻冻雨', en: 'Light freezing rain', iconDay: '🌧️', iconNight: '🌧️' },
  67: { zh: '重冻雨', en: 'Heavy freezing rain', iconDay: '🌧️', iconNight: '🌧️' },
  71: { zh: '小雪', en: 'Light snow', iconDay: '🌨️', iconNight: '🌨️' },
  73: { zh: '中雪', en: 'Snow', iconDay: '🌨️', iconNight: '🌨️' },
  75: { zh: '大雪', en: 'Heavy snow', iconDay: '❄️', iconNight: '❄️' },
  77: { zh: '雪粒', en: 'Snow grains', iconDay: '❄️', iconNight: '❄️' },
  80: { zh: '阵雨', en: 'Rain showers', iconDay: '🌦️', iconNight: '🌧️' },
  81: { zh: '强阵雨', en: 'Heavy showers', iconDay: '🌧️', iconNight: '🌧️' },
  82: { zh: '暴雨', en: 'Violent rain', iconDay: '🌧️', iconNight: '🌧️' },
  85: { zh: '阵雪', en: 'Snow showers', iconDay: '🌨️', iconNight: '🌨️' },
  86: { zh: '强阵雪', en: 'Heavy snow showers', iconDay: '❄️', iconNight: '❄️' },
  95: { zh: '雷暴', en: 'Thunderstorm', iconDay: '⛈️', iconNight: '⛈️' },
  96: { zh: '雷暴伴冰雹', en: 'Thunderstorm w/ hail', iconDay: '⛈️', iconNight: '⛈️' },
  99: { zh: '强雷暴伴冰雹', en: 'Severe thunderstorm', iconDay: '⛈️', iconNight: '⛈️' },
};

let currentLang = localStorage.getItem('portalLang') || 'zh';
let currentTheme = localStorage.getItem('portalTheme') || 'night';
let lastStatusPayload = null;
let lastWeatherPayload = null;

const cssEscape = window.CSS && CSS.escape
  ? CSS.escape.bind(window.CSS)
  : (value) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

function t(key) {
  const langPack = TRANSLATIONS[currentLang] || TRANSLATIONS.zh;
  return langPack[key] || TRANSLATIONS.en[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-l10n]').forEach((el) => {
    const key = el.dataset.l10n;
    if (!key) return;
    const text = t(key);
    if (el.dataset.l10nHtml === 'true') {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });
  document.querySelectorAll('[data-l10n-variant]').forEach((el) => {
    const variantKey = el.dataset.l10nVariant;
    if (variantKey) {
      el.textContent = t(variantKey);
    }
  });
}

function updateThemeButton() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const key = currentTheme === 'day' ? 'theme_label_day' : 'theme_label_night';
  btn.textContent = t(key);
}

function updateLangButton() {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  const key = currentLang === 'zh' ? 'lang_label_zh' : 'lang_label_en';
  btn.textContent = t(key);
}

function applyTheme() {
  document.body.classList.toggle('theme-day', currentTheme === 'day');
  localStorage.setItem('portalTheme', currentTheme);
  updateThemeButton();
}

function toggleTheme() {
  currentTheme = currentTheme === 'day' ? 'night' : 'day';
  applyTheme();
}

function updateClock() {
  const clockEl = document.getElementById('clock');
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleString();
}

function toggleLanguage() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  applyLanguage();
}

function applyLanguage() {
  localStorage.setItem('portalLang', currentLang);
  applyTranslations();
  updateLangButton();
  updateThemeButton();
  if (lastStatusPayload) {
    applyStatusData(lastStatusPayload);
  }
  if (lastWeatherPayload) {
    applyWeatherData(lastWeatherPayload);
  }
}

function getWeatherDescriptor(code) {
  return WEATHER_CODES[code] || WEATHER_CODES.default;
}

function formatHourLabel(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const lang = currentLang;
  const template = (key, value) => {
    const base = t(key);
    if (typeof value === 'number') {
      return base.replace('%d', value.toString());
    }
    if (typeof value === 'string') {
      return base.replace('%s', value);
    }
    return base;
  };
  if (diffSec < 30) {
    return t('time_just_now');
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return template('time_min_ago', diffMin || 1);
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return template('time_hour_ago', diffHr);
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay <= 7) {
    return template('time_day_ago', diffDay);
  }
  return template('time_on', date.toLocaleString(lang === 'zh' ? 'zh-CN' : undefined));
}

function renderHourlyForecast(entries) {
  const container = document.getElementById('hourly-forecast');
  if (!container) return;
  if (!entries || entries.length === 0) {
    container.textContent = t('hourly_unavailable');
    return;
  }
  container.removeAttribute('data-l10n');
  container.innerHTML = '';
  entries.forEach((entry) => {
    const chip = document.createElement('div');
    chip.className = 'hourly-chip';
    const descriptor = getWeatherDescriptor(entry.weathercode);
    const icon = entry.weathercode != null ? descriptor.iconDay : WEATHER_CODES.default.iconDay;
    const precip = entry.precipitation_probability;
    const precipText = precip == null ? '--' : `${precip}%`;
    const fallbackHint = entry.fallback ? ' *' : '';
    chip.innerHTML = `
      <strong>${formatHourLabel(entry.time)}${fallbackHint}</strong>
      <span>${entry.temperature}°C ${icon}</span>
      <span>${t('weather_precip_label')}: ${precipText}</span>
    `;
    container.appendChild(chip);
  });
}

function updateAuroraStatus(aurora) {
  const el = document.getElementById('aurora-status');
  if (!el) return;
  el.removeAttribute('data-l10n');
  el.classList.remove('aurora-active', 'aurora-inactive');
  if (!aurora) {
    el.textContent = t('aurora_unavailable');
    el.classList.add('aurora-inactive');
    return;
  }
  if (!aurora.available) {
    let key = 'aurora_unavailable';
    if (aurora.reason && aurora.reason.includes('disabled')) {
      key = 'aurora_disabled';
    } else if (aurora.reason && aurora.reason.includes('unavailable')) {
      key = 'aurora_error';
    }
    el.textContent = t(key);
    el.classList.add('aurora-inactive');
    return;
  }
  const label = aurora.active ? 'aurora_active' : 'aurora_inactive';
  const prob = aurora.probability != null ? `${aurora.probability}%` : '--';
  const degradedNote = aurora.degraded ? ` · ${t('aurora_error')}` : '';
  el.textContent = `${t(label)} (${t('aurora_probability_label')}: ${prob})${degradedNote}`;
  el.classList.add(aurora.active ? 'aurora-active' : 'aurora-inactive');
}

function setCardStatus(service) {
  const selector = `[data-service-name="${cssEscape(service.name)}"]`;
  const card = document.querySelector(`.service-card${selector}`);
  if (!card) return;
  const dot = card.querySelector('.status-dot');
  const metric = card.querySelector('.status-metric');
  if (dot) {
    dot.classList.remove('status-up', 'status-down', 'status-unknown');
    if (service.status === 'up') {
      dot.classList.add('status-up');
    } else if (service.status === 'down') {
      dot.classList.add('status-down');
    } else {
      dot.classList.add('status-unknown');
    }
  }
  if (metric) {
    metric.textContent = formatMetric(service);
  }
}

function updateTableRow(service) {
  const selector = `[data-service-name="${cssEscape(service.name)}"]`;
  const row = document.querySelector(`tbody#services-table-body ${selector}`);
  if (!row) return;
  const statusCell = row.querySelector('.status-cell');
  const metricCell = row.querySelector('.metric-cell');
  const changeCell = row.querySelector('.change-cell');

  const badge = document.createElement('span');
  const statusKey = `status_${service.status || 'unknown'}`;
  badge.className = `status-badge ${service.status}`;
  badge.textContent = t(statusKey);
  statusCell.innerHTML = '';
  statusCell.appendChild(badge);

  metricCell.textContent = formatMetric(service);
  changeCell.textContent = service.last_change || '--';
}

function formatMetric(service) {
  if (service.type === 'http') {
    const code = service.http_status ?? '—';
    const rt = service.response_time_ms ? `${service.response_time_ms} ms` : 'N/A';
    return `${code} / ${rt}`;
  }
  if (service.type === 'ping') {
    return service.avg_rtt_ms ? `${service.avg_rtt_ms} ms` : 'N/A';
  }
  if (service.type === 'tcp') {
    return service.latency_ms ? `${service.latency_ms} ms` : 'N/A';
  }
  return '--';
}

function renderAlerts(services) {
  const container = document.getElementById('alerts-body');
  if (!container) return;
  const downServices = services.filter((svc) => svc.status && svc.status !== 'up');
  if (downServices.length === 0) {
    container.textContent = t('alerts_empty');
    return;
  }
  container.innerHTML = '';
  downServices.forEach((svc) => {
    const card = document.createElement('div');
    card.className = 'alert-card';
    card.innerHTML = `
      <h3>${svc.name}</h3>
      <p>${t('alerts_label_type')}: ${svc.type} | ${t('alerts_label_category')}: ${svc.category}</p>
      <p>${t('alerts_label_metric')}: ${formatMetric(svc)}</p>
      <p>${t('alerts_label_last_change')}: ${svc.last_change || '--'}</p>
    `;
    container.appendChild(card);
  });
}

function updateInternetSummary(data, checkedAt) {
  const statusEl = document.getElementById('internet-status');
  const rttEl = document.getElementById('internet-rtt');
  const targetsEl = document.getElementById('internet-targets');
  const updatedEl = document.getElementById('internet-updated');
  const pill = document.getElementById('internet-pill');
  const pillText = document.getElementById('internet-pill-text');
  if (!statusEl || !rttEl) return;

  if (!data || typeof data.online === 'undefined') {
    statusEl.textContent = t('internet_unknown');
    rttEl.textContent = `${t('avg_rtt')}: N/A`;
    if (targetsEl) targetsEl.textContent = '--';
    if (pill) {
      pill.classList.remove('pill-online');
      pill.classList.add('pill-offline');
    }
    if (pillText) {
      pillText.textContent = t('internet_unknown');
    }
  } else {
    statusEl.textContent = data.online ? t('internet_online') : t('internet_offline');
    const rttText = data.avg_rtt_ms ? `${data.avg_rtt_ms} ms` : 'N/A';
    rttEl.textContent = `${t('avg_rtt')}: ${rttText}`;
    const reachable = data.reachable_targets ?? 0;
    const total = data.total_targets ?? data.expected_targets;
    if (targetsEl) {
      targetsEl.textContent = total ? `${reachable} / ${total}` : `${reachable} ${t('targets_reachable')}`;
    }
    if (pill) {
      pill.classList.toggle('pill-online', data.online);
      pill.classList.toggle('pill-offline', !data.online);
    }
    if (pillText) {
      pillText.textContent = data.online ? t('internet_online') : t('internet_offline');
    }
  }
  if (updatedEl) {
    updatedEl.textContent = formatRelativeTime(checkedAt);
    updatedEl.title = checkedAt || '';
  }
}

function updateInternetServices(services) {
  const container = document.getElementById('internet-services');
  if (!container) return;
  if (!services || services.length === 0) {
    container.textContent = t('upstream_none');
    return;
  }
  container.innerHTML = services
    .map((svc) => {
      const label = t(`status_${svc.status || 'unknown'}`);
      return `<span class="${svc.status}">${svc.name}: ${label}</span>`;
    })
    .join('<br>');
}

function applyStatusData(data) {
  if (!data || data.available === false) {
    updateInternetSummary(null);
    updateInternetServices(null);
    renderAlerts([]);
    return;
  }
  updateInternetSummary(data.internet, data.checked_at);
  updateInternetServices(data.internet_services);
  (data.services || []).forEach((svc) => {
    setCardStatus(svc);
    updateTableRow(svc);
  });
  renderAlerts(data.services || []);
}

async function fetchStatus() {
  try {
    const resp = await fetch(STATUS_ENDPOINT);
    const data = await resp.json();
    lastStatusPayload = data;
    applyStatusData(data);
  } catch (err) {
    console.warn('status fetch failed', err);
    lastStatusPayload = null;
    updateInternetSummary(null);
    updateInternetServices(null);
  }
}

function applyWeatherData(view) {
  const tempEl = document.getElementById('weather-temp');
  const detailEl = document.getElementById('weather-detail');
  const conditionEl = document.getElementById('weather-condition');
  const phaseEl = document.getElementById('weather-dayphase');
  const iconEl = document.getElementById('weather-icon');
  if (!tempEl || !detailEl) return;
  if (!view || !view.available) {
    tempEl.textContent = view ? 'N/A' : '--°C';
    detailEl.textContent = t(view?.reasonKey || 'weather_unavailable');
    if (conditionEl) conditionEl.textContent = t('weather_condition_unknown');
    if (phaseEl) phaseEl.textContent = '';
    if (iconEl) iconEl.textContent = WEATHER_CODES.default.iconDay;
    renderHourlyForecast(null);
    updateAuroraStatus(view?.aurora);
    return;
  }
  const descriptor = getWeatherDescriptor(view.weathercode);
  const label = descriptor[currentLang] || descriptor.en;
  const icon = view.is_day ? descriptor.iconDay : descriptor.iconNight;
  if (conditionEl) conditionEl.textContent = label;
  if (phaseEl) phaseEl.textContent = view.is_day ? t('weather_day_label') : t('weather_night_label');
  if (iconEl) iconEl.textContent = icon;
  tempEl.textContent = `${view.temperature}°C`;
  const wind = view.windspeed != null ? `${t('weather_wind_label')} ${view.windspeed} km/h` : '';
  const code = view.weathercode != null ? `${t('weather_code_label')} ${view.weathercode}` : '';
  detailEl.textContent = [wind, code].filter(Boolean).join(' | ');
  renderHourlyForecast(view.hourly);
  updateAuroraStatus(view.aurora);
}

async function fetchWeather() {
  try {
    const resp = await fetch(WEATHER_ENDPOINT);
    const data = await resp.json();
    if (!data.available) {
      const reasonKey = (data.reason || '').includes('disabled') ? 'weather_disabled' : 'weather_unavailable';
      lastWeatherPayload = { available: false, reasonKey, aurora: data.aurora };
    } else {
      lastWeatherPayload = {
        available: true,
        temperature: data.temperature,
        windspeed: data.windspeed,
        weathercode: data.weathercode,
        is_day: data.is_day,
        hourly: data.hourly,
        aurora: data.aurora
      };
    }
    applyWeatherData(lastWeatherPayload);
  } catch (err) {
    console.warn('weather fetch failed', err);
    lastWeatherPayload = { available: false, reasonKey: 'weather_fetch_failed' };
    applyWeatherData(lastWeatherPayload);
  }
}

function initTableToggle() {
  const btn = document.getElementById('toggle-table');
  const wrapper = document.getElementById('table-wrapper');
  if (!btn || !wrapper) return;
  btn.addEventListener('click', () => {
    wrapper.classList.toggle('collapsed');
  });
}

function initToggles() {
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }
  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    langBtn.addEventListener('click', toggleLanguage);
  }
}

function init() {
  applyTheme();
  applyTranslations();
  updateLangButton();
  initToggles();
  updateClock();
  setInterval(updateClock, 1000);
  fetchStatus();
  setInterval(fetchStatus, STATUS_INTERVAL);
  fetchWeather();
  setInterval(fetchWeather, WEATHER_INTERVAL);
  initTableToggle();
}

document.addEventListener('DOMContentLoaded', init);
