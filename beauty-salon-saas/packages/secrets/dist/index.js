"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretAuditLog = exports.vault = exports.VaultClient = void 0;
var vault_client_1 = require("./vault-client");
Object.defineProperty(exports, "VaultClient", { enumerable: true, get: function () { return vault_client_1.VaultClient; } });
Object.defineProperty(exports, "vault", { enumerable: true, get: function () { return vault_client_1.vault; } });
var audit_1 = require("./audit");
Object.defineProperty(exports, "getSecretAuditLog", { enumerable: true, get: function () { return audit_1.getSecretAuditLog; } });
//# sourceMappingURL=index.js.map