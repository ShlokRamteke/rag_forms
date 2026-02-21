export async function encryptData(data, passphrase) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    // Derive a key from the passphrase
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData
    );

    // Combine salt + iv + ciphertext for storage or return separately
    // To keep it simple, we'll return strings
    return {
        encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt))
    };
}

export async function decryptData(encryptedDataB64, ivB64, saltB64, passphrase) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const encryptedContent = new Uint8Array(atob(encryptedDataB64).split("").map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(ivB64).split("").map(c => c.charCodeAt(0)));
    const salt = new Uint8Array(atob(saltB64).split("").map(c => c.charCodeAt(0)));

    const baseKey = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
    );

    try {
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encryptedContent
        );
        return JSON.parse(decoder.decode(decryptedContent));
    } catch {
        throw new Error("Decryption failed. Incorrect passphrase?");
    }
}
