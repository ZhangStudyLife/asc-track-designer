use sha2::{Digest, Sha256};

const CHUNK_SIZE: usize = 1800;
const MAX_VALUE_SIZE: usize = 64 * 1024;

fn credential_base(key: &str) -> Result<String, String> {
    if key.is_empty() || key.len() > 512 {
        return Err("Invalid workshop credential key".to_string());
    }
    let digest = Sha256::digest(key.as_bytes());
    Ok(format!("ASC Track Designer Workshop/{digest:x}"))
}

fn split_value(value: &str) -> Result<Vec<&[u8]>, String> {
    if value.len() > MAX_VALUE_SIZE {
        return Err("Workshop session is too large".to_string());
    }
    Ok(value.as_bytes().chunks(CHUNK_SIZE).collect())
}

#[cfg(windows)]
mod platform {
    use super::{credential_base, split_value};
    use std::{ptr, slice};
    use windows_sys::Win32::{
        Foundation::{GetLastError, ERROR_NOT_FOUND},
        Security::Credentials::{
            CredDeleteW, CredFree, CredReadW, CredWriteW, CREDENTIALW, CRED_PERSIST_LOCAL_MACHINE,
            CRED_TYPE_GENERIC,
        },
    };

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn last_error(context: &str) -> String {
        format!("{context}: {}", std::io::Error::last_os_error())
    }

    fn write_credential(target: &str, value: &[u8]) -> Result<(), String> {
        let mut target = wide(target);
        let mut username = wide("ASC Track Designer");
        let mut blob = value.to_vec();
        let credential = CREDENTIALW {
            Flags: 0,
            Type: CRED_TYPE_GENERIC,
            TargetName: target.as_mut_ptr(),
            Comment: ptr::null_mut(),
            LastWritten: unsafe { std::mem::zeroed() },
            CredentialBlobSize: blob.len() as u32,
            CredentialBlob: blob.as_mut_ptr(),
            Persist: CRED_PERSIST_LOCAL_MACHINE,
            AttributeCount: 0,
            Attributes: ptr::null_mut(),
            TargetAlias: ptr::null_mut(),
            UserName: username.as_mut_ptr(),
        };

        if unsafe { CredWriteW(&credential, 0) } == 0 {
            return Err(last_error("Unable to save workshop session"));
        }
        Ok(())
    }

    fn read_credential(target: &str) -> Result<Option<Vec<u8>>, String> {
        let target = wide(target);
        let mut credential: *mut CREDENTIALW = ptr::null_mut();
        if unsafe { CredReadW(target.as_ptr(), CRED_TYPE_GENERIC, 0, &mut credential) } == 0 {
            if unsafe { GetLastError() } == ERROR_NOT_FOUND {
                return Ok(None);
            }
            return Err(last_error("Unable to read workshop session"));
        }
        if credential.is_null() {
            return Ok(None);
        }

        let bytes = unsafe {
            let item = &*credential;
            slice::from_raw_parts(item.CredentialBlob, item.CredentialBlobSize as usize).to_vec()
        };
        unsafe { CredFree(credential.cast()) };
        Ok(Some(bytes))
    }

    fn delete_credential(target: &str) -> Result<(), String> {
        let target = wide(target);
        if unsafe { CredDeleteW(target.as_ptr(), CRED_TYPE_GENERIC, 0) } == 0
            && unsafe { GetLastError() } != ERROR_NOT_FOUND
        {
            return Err(last_error("Unable to remove workshop session"));
        }
        Ok(())
    }

    fn chunk_count(base: &str) -> Result<usize, String> {
        let Some(value) = read_credential(&format!("{base}/meta"))? else {
            return Ok(0);
        };
        let count = String::from_utf8(value)
            .map_err(|_| "Workshop session metadata is invalid".to_string())?
            .parse::<usize>()
            .map_err(|_| "Workshop session metadata is invalid".to_string())?;
        if count > 64 {
            return Err("Workshop session metadata is invalid".to_string());
        }
        Ok(count)
    }

    pub fn get(key: &str) -> Result<Option<String>, String> {
        let base = credential_base(key)?;
        let count = chunk_count(&base)?;
        if count == 0 {
            return Ok(None);
        }

        let mut value = Vec::new();
        for index in 0..count {
            let chunk = read_credential(&format!("{base}/{index}"))?
                .ok_or_else(|| "Workshop session is incomplete".to_string())?;
            value.extend(chunk);
        }
        String::from_utf8(value)
            .map(Some)
            .map_err(|_| "Workshop session is invalid".to_string())
    }

    pub fn set(key: &str, value: &str) -> Result<(), String> {
        let base = credential_base(key)?;
        let old_count = chunk_count(&base)?;
        let chunks = split_value(value)?;
        for (index, chunk) in chunks.iter().enumerate() {
            write_credential(&format!("{base}/{index}"), chunk)?;
        }
        write_credential(&format!("{base}/meta"), chunks.len().to_string().as_bytes())?;
        for index in chunks.len()..old_count {
            delete_credential(&format!("{base}/{index}"))?;
        }
        Ok(())
    }

    pub fn remove(key: &str) -> Result<(), String> {
        let base = credential_base(key)?;
        let count = chunk_count(&base)?;
        for index in 0..count {
            delete_credential(&format!("{base}/{index}"))?;
        }
        delete_credential(&format!("{base}/meta"))
    }
}

#[cfg(not(windows))]
mod platform {
    pub fn get(_key: &str) -> Result<Option<String>, String> {
        Err("Secure workshop storage is only available on Windows".to_string())
    }
    pub fn set(_key: &str, _value: &str) -> Result<(), String> {
        Err("Secure workshop storage is only available on Windows".to_string())
    }
    pub fn remove(_key: &str) -> Result<(), String> {
        Err("Secure workshop storage is only available on Windows".to_string())
    }
}

#[cfg(not(test))]
#[tauri::command]
pub fn workshop_secure_get(key: String) -> Result<Option<String>, String> {
    platform::get(&key)
}

#[cfg(not(test))]
#[tauri::command]
pub fn workshop_secure_set(key: String, value: String) -> Result<(), String> {
    platform::set(&key, &value)
}

#[cfg(not(test))]
#[tauri::command]
pub fn workshop_secure_remove(key: String) -> Result<(), String> {
    platform::remove(&key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn credential_targets_are_stable_and_do_not_expose_keys() {
        let target = credential_base("sb-project-auth-token").unwrap();
        assert_eq!(target, credential_base("sb-project-auth-token").unwrap());
        assert!(!target.contains("auth-token"));
    }

    #[test]
    fn large_sessions_are_split_without_data_loss() {
        let value = "x".repeat(CHUNK_SIZE * 3 + 17);
        let chunks = split_value(&value).unwrap();
        assert_eq!(chunks.len(), 4);
        assert_eq!(chunks.concat(), value.as_bytes());
    }
}
