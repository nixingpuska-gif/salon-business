"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = formatDate;
exports.formatCurrency = formatCurrency;
exports.formatNumber = formatNumber;
const localeMap = {
    ru: 'ru-RU',
    en: 'en-US'
};
function formatDate(date, locale, options = { dateStyle: 'medium' }) {
    return new Intl.DateTimeFormat(localeMap[locale], options).format(date);
}
function formatCurrency(amount, locale, currency = 'USD') {
    return new Intl.NumberFormat(localeMap[locale], {
        style: 'currency',
        currency
    }).format(amount);
}
function formatNumber(amount, locale) {
    return new Intl.NumberFormat(localeMap[locale]).format(amount);
}
//# sourceMappingURL=formatters.js.map