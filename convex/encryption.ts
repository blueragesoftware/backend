import CryptoJS from "crypto-js";
import { env } from "./config";

const ENCRYPTION_KEY = CryptoJS.SHA256(env.ENCRYPTION_KEY).toString();

export function encryptApiKey(text: string): string {
    if (text.length === 0) {
        return "";
    }

    try {
        return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    } catch (error) {
        console.error("Encryption failed:", error);
        throw new Error("Failed to encrypt API key");
    }
}

export function decryptApiKey(encryptedText: string): string {
    if (encryptedText.length === 0) {
        return "";
    }

    try {
        const decrypted = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        const plainText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!plainText) {
            throw new Error("Failed to decrypt - invalid key or corrupted data");
        }

        return plainText;
    } catch (error) {
        console.error("Decryption failed:", error);

        throw error;
    }
}