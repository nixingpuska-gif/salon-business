import { Schema } from 'mongoose';
import crypto from 'crypto';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Шифрует строку с использованием AES-256-GCM
 */
function encrypt(text: string): string {
  if (!text) return text;
  if (!ENCRYPTION_SECRET) {
    console.warn('ENCRYPTION_SECRET not set - storing data unencrypted');
    return text;
  }

  const key = crypto.scryptSync(ENCRYPTION_SECRET, 'salt', 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Формат: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Расшифровывает строку
 */
function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  if (!ENCRYPTION_SECRET) {
    return encryptedText;
  }

  // Проверяем формат зашифрованных данных
  if (!encryptedText.includes(':')) {
    // Данные не зашифрованы (старый формат)
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText;
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = crypto.scryptSync(ENCRYPTION_SECRET, 'salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return encryptedText;
  }
}

/**
 * Mongoose плагин для шифрования полей
 */
export function fieldEncryptionPlugin(schema: Schema, options: { fields: string[] }) {
  const { fields } = options;

  // Шифруем перед сохранением
  schema.pre('save', function(next) {
    fields.forEach(field => {
      if (this[field] && typeof this[field] === 'string') {
        // Проверяем, не зашифровано ли уже
        if (!this[field].includes(':')) {
          this[field] = encrypt(this[field]);
        }
      }
    });
    next();
  });

  // Расшифровываем после загрузки
  schema.post('init', function() {
    fields.forEach(field => {
      if (this[field] && typeof this[field] === 'string') {
        this[field] = decrypt(this[field]);
      }
    });
  });

  // Расшифровываем после find
  schema.post('find', function(docs) {
    if (Array.isArray(docs)) {
      docs.forEach(doc => {
        fields.forEach(field => {
          if (doc[field] && typeof doc[field] === 'string') {
            doc[field] = decrypt(doc[field]);
          }
        });
      });
    }
  });

  // Расшифровываем после findOne
  schema.post('findOne', function(doc) {
    if (doc) {
      fields.forEach(field => {
        if (doc[field] && typeof doc[field] === 'string') {
          doc[field] = decrypt(doc[field]);
        }
      });
    }
  });
}
