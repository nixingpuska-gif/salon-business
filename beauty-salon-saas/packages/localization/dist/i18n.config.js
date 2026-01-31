"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initI18n = exports.defaultNS = exports.supportedLngs = void 0;
const i18next_1 = __importDefault(require("i18next"));
const react_i18next_1 = require("react-i18next");
const i18next_http_backend_1 = __importDefault(require("i18next-http-backend"));
const i18next_browser_languagedetector_1 = __importDefault(require("i18next-browser-languagedetector"));
exports.supportedLngs = ['ru', 'en'];
exports.defaultNS = 'common';
const initI18n = () => {
    if (i18next_1.default.isInitialized) {
        return i18next_1.default;
    }
    i18next_1.default
        .use(i18next_http_backend_1.default)
        .use(i18next_browser_languagedetector_1.default)
        .use(react_i18next_1.initReactI18next)
        .init({
        fallbackLng: 'ru',
        supportedLngs: [...exports.supportedLngs],
        defaultNS: exports.defaultNS,
        ns: ['common', 'appointments'],
        interpolation: {
            escapeValue: false
        },
        react: {
            useSuspense: false
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json'
        },
        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator'],
            caches: ['cookie', 'localStorage']
        },
        returnNull: false
    });
    return i18next_1.default;
};
exports.initI18n = initI18n;
(0, exports.initI18n)();
exports.default = i18next_1.default;
//# sourceMappingURL=i18n.config.js.map