use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use rand::RngCore;
use base64::{Engine as _, engine::general_purpose};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::Aead;

const ITERATIONS: u32 = 200_000;
const SALT_LEN: usize = 16;
const KEY_LEN: usize = 32;

pub fn hash_password(password: &str) -> (String, String) {
    let mut salt = [0u8; SALT_LEN];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    let mut key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), &salt, ITERATIONS, &mut key);

    let hash_b64 = general_purpose::STANDARD.encode(key);
    let salt_b64 = general_purpose::STANDARD.encode(salt);

    (hash_b64, salt_b64)
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

pub fn verify_password(password: &str, hash_b64: &str, salt_b64: &str) -> bool {
    let salt = match general_purpose::STANDARD.decode(salt_b64) {
        Ok(s) => s,
        Err(_) => return false,
    };

    let stored_hash = match general_purpose::STANDARD.decode(hash_b64) {
        Ok(h) => h,
        Err(_) => return false,
    };

    let mut derived_key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), &salt, ITERATIONS, &mut derived_key);

    constant_time_eq(&derived_key, &stored_key_slice(&stored_hash))
}

fn stored_key_slice(hash: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    let len = hash.len().min(KEY_LEN);
    key[..len].copy_from_slice(&hash[..len]);
    key
}

pub fn generate_recovery_key() -> String {
    use rand::Rng;

    let mut rng = rand::thread_rng();
    let mut blocks: Vec<String> = Vec::new();

    while blocks.len() < 4 {
        let block: String = format!("{:04}", rng.gen_range(0..10000));
        if !blocks.contains(&block) {
            blocks.push(block);
        }
    }

    format!("{} {} {} {}", blocks[0], blocks[1], blocks[2], blocks[3])
}

pub fn hash_recovery_key(key: &str) -> (String, String) {
    let normalized = key.replace(' ', "");
    hash_password(&normalized)
}

pub fn verify_recovery_key(key: &str, hash_b64: &str, salt_b64: &str) -> bool {
    let normalized = key.replace(' ', "");
    verify_password(&normalized, hash_b64, salt_b64)
}

pub fn generate_encryption_salt() -> String {
    let mut salt = [0u8; SALT_LEN];
    rand::rngs::OsRng.fill_bytes(&mut salt);
    general_purpose::STANDARD.encode(salt)
}

pub fn derive_encryption_key(password: &str, salt_b64: &str) -> Result<[u8; KEY_LEN], String> {
    let salt = general_purpose::STANDARD.decode(salt_b64)
        .map_err(|e| e.to_string())?;
    let mut key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), &salt, ITERATIONS, &mut key);
    Ok(key)
}

pub fn encrypt_field(plaintext: &str, key: &[u8; KEY_LEN]) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Cipher init failed: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encrypt failed: {}", e))?;

    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(general_purpose::STANDARD.encode(&result))
}

pub fn decrypt_field(encoded: &str, key: &[u8; KEY_LEN]) -> Result<String, String> {
    let data = general_purpose::STANDARD.decode(encoded)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if data.len() < 12 {
        return Err("Ciphertext too short".to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Cipher init failed: {}", e))?;

    let nonce = Nonce::from_slice(&data[..12]);
    let ciphertext = &data[12..];

    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decrypt failed: {}", e))?;

    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 decode failed: {}", e))
}
