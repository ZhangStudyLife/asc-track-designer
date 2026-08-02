use base64::{engine::general_purpose::STANDARD, Engine as _};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    ffi::OsString,
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{self, Command, Stdio},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use url::Url;

#[cfg(not(test))]
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const STATIC_MANIFEST_URL: &str =
    "https://github.com/ZhangStudyLife/asc-track-designer/releases/latest/download/latest.json";
const GITHUB_LATEST_RELEASE_URL: &str =
    "https://api.github.com/repos/ZhangStudyLife/asc-track-designer/releases/latest";
const MANIFEST_ASSET_NAME: &str = "latest.json";
const UPDATE_PUBLIC_KEY_BASE64: &str = "X0QMDy3VrrF2NcP2Vf+iVBpiprGjsfuTj5wnyE9yZqA=";
const MAX_METADATA_BYTES: u64 = 1024 * 1024;
const MAX_UPDATE_BYTES: u64 = 150 * 1024 * 1024;
const UPDATE_EVENT: &str = "updater://progress";

#[derive(Debug, Clone, Copy, Eq, Ord, PartialEq, PartialOrd)]
struct Version {
    major: u64,
    minor: u64,
    patch: u64,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct SignedManifest {
    payload: String,
    signature: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ManifestPayload {
    version: String,
    minimum_version: String,
    published_at: String,
    title: String,
    notes: String,
    notes_url: String,
    asset: ManifestAsset,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ManifestAsset {
    name: String,
    url: String,
    size: u64,
    sha256: String,
}

#[derive(Debug, Clone)]
struct UpdateCandidate {
    version: Version,
    payload: ManifestPayload,
    envelope: String,
}

#[derive(Debug, Clone, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    draft: bool,
    prerelease: bool,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Clone, Deserialize)]
struct GitHubAsset {
    name: String,
    size: u64,
    browser_download_url: String,
    digest: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRelease {
    pub version: String,
    pub tag_name: String,
    pub title: String,
    pub body: String,
    pub published_at: Option<String>,
    pub notes_url: String,
    pub asset_name: String,
    pub asset_size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadedUpdate {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
    pub installable: bool,
}

type FetchText = fn(&str, &str) -> Result<String, String>;

fn parse_version(raw: &str) -> Option<Version> {
    let normalized = raw.strip_prefix('v').unwrap_or(raw);
    let mut parts = normalized.split('.');
    let version = Version {
        major: parts.next()?.parse().ok()?,
        minor: parts.next()?.parse().ok()?,
        patch: parts.next()?.parse().ok()?,
    };
    if parts.next().is_some() {
        return None;
    }
    Some(version)
}

fn version_text(version: Version) -> String {
    format!("{}.{}.{}", version.major, version.minor, version.patch)
}

fn current_version() -> Version {
    parse_version(env!("CARGO_PKG_VERSION")).expect("CARGO_PKG_VERSION must be MAJOR.MINOR.PATCH")
}

fn expected_asset_name(version: Version) -> String {
    format!("ASC.{}.exe", version_text(version))
}

fn normalized_digest(value: &str) -> Option<String> {
    let digest = value.strip_prefix("sha256:").unwrap_or(value);
    if digest.len() != 64
        || !digest
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return None;
    }
    Some(digest.to_ascii_lowercase())
}

fn decode_verifying_key(value: &str) -> Result<VerifyingKey, String> {
    let bytes = STANDARD
        .decode(value)
        .map_err(|_| "更新签名公钥无效".to_string())?;
    let key_bytes: [u8; 32] = bytes
        .try_into()
        .map_err(|_| "更新签名公钥长度无效".to_string())?;
    VerifyingKey::from_bytes(&key_bytes).map_err(|_| "更新签名公钥无法使用".to_string())
}

fn verify_manifest_with_key(text: &str, key: &VerifyingKey) -> Result<ManifestPayload, String> {
    let envelope: SignedManifest =
        serde_json::from_str(text).map_err(|error| format!("更新清单格式无效: {error}"))?;
    let payload_bytes = STANDARD
        .decode(envelope.payload)
        .map_err(|_| "更新清单 payload 不是有效 Base64".to_string())?;
    let signature_bytes = STANDARD
        .decode(envelope.signature)
        .map_err(|_| "更新清单签名不是有效 Base64".to_string())?;
    let signature =
        Signature::from_slice(&signature_bytes).map_err(|_| "更新清单签名长度无效".to_string())?;
    key.verify(&payload_bytes, &signature)
        .map_err(|_| "更新清单签名校验失败".to_string())?;
    serde_json::from_slice(&payload_bytes)
        .map_err(|error| format!("更新清单 payload 无效: {error}"))
}

fn verify_manifest(text: &str) -> Result<ManifestPayload, String> {
    verify_manifest_with_key(text, &decode_verifying_key(UPDATE_PUBLIC_KEY_BASE64)?)
}

fn validate_release_download_url(value: &str, asset_name: &str) -> bool {
    let Ok(url) = Url::parse(value) else {
        return false;
    };
    if url.scheme() != "https" || url.host_str() != Some("github.com") {
        return false;
    }
    let expected_prefix = "/ZhangStudyLife/asc-track-designer/releases/download/";
    url.path().starts_with(expected_prefix)
        && url.path().ends_with(&format!("/{asset_name}"))
        && !url.path().contains("/../")
}

fn validate_notes_url(value: &str) -> bool {
    let Ok(url) = Url::parse(value) else {
        return false;
    };
    url.scheme() == "https"
        && url.host_str() == Some("github.com")
        && url
            .path()
            .starts_with("/ZhangStudyLife/asc-track-designer/releases/tag/")
}

fn validate_manifest_payload(payload: &ManifestPayload) -> Result<Version, String> {
    let version =
        parse_version(&payload.version).ok_or_else(|| "更新清单版本号无效".to_string())?;
    let minimum = parse_version(&payload.minimum_version)
        .ok_or_else(|| "更新清单最低兼容版本无效".to_string())?;
    if minimum > version {
        return Err("更新清单最低兼容版本高于目标版本".to_string());
    }
    if payload.title.trim().is_empty() || payload.published_at.trim().is_empty() {
        return Err("更新清单缺少标题或发布时间".to_string());
    }
    if payload.asset.name != expected_asset_name(version) {
        return Err("更新清单中的 EXE 名称不匹配版本".to_string());
    }
    if payload.asset.size == 0 || payload.asset.size > MAX_UPDATE_BYTES {
        return Err("更新文件大小不在允许范围内".to_string());
    }
    if normalized_digest(&payload.asset.sha256).is_none() {
        return Err("更新清单中的 SHA-256 无效".to_string());
    }
    if !validate_release_download_url(&payload.asset.url, &payload.asset.name) {
        return Err("更新清单中的下载地址不受信任".to_string());
    }
    if !validate_notes_url(&payload.notes_url) {
        return Err("更新清单中的 Release Notes 地址不受信任".to_string());
    }
    Ok(version)
}

fn candidate_from_envelope(text: String) -> Result<UpdateCandidate, String> {
    let payload = verify_manifest(&text)?;
    let version = validate_manifest_payload(&payload)?;
    Ok(UpdateCandidate {
        version,
        payload,
        envelope: text,
    })
}

fn candidate_if_newer(
    candidate: UpdateCandidate,
    current: Version,
) -> Result<Option<UpdateCandidate>, String> {
    if candidate.version <= current {
        return Ok(None);
    }
    let minimum = parse_version(&candidate.payload.minimum_version)
        .ok_or_else(|| "更新清单最低兼容版本无效".to_string())?;
    if current < minimum {
        return Err(format!(
            "当前版本过旧，无法自动升级到 {}，请打开 Release Notes 手动下载",
            candidate.payload.version
        ));
    }
    Ok(Some(candidate))
}

fn request_agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(10))
        .timeout_read(Duration::from_secs(30))
        .build()
}

fn describe_ureq_error(error: ureq::Error) -> String {
    match error {
        ureq::Error::Status(code, response) => {
            if code == 403 && response.header("X-RateLimit-Remaining") == Some("0") {
                "GitHub API 请求次数已达到限制".to_string()
            } else {
                format!("HTTP {code}")
            }
        }
        ureq::Error::Transport(error) => format!("网络连接失败: {error}"),
    }
}

fn read_limited(mut reader: impl Read, limit: u64) -> Result<String, String> {
    let mut bytes = Vec::new();
    reader
        .by_ref()
        .take(limit + 1)
        .read_to_end(&mut bytes)
        .map_err(|error| format!("读取网络响应失败: {error}"))?;
    if bytes.len() as u64 > limit {
        return Err("网络响应超过允许大小".to_string());
    }
    String::from_utf8(bytes).map_err(|_| "网络响应不是有效 UTF-8".to_string())
}

fn rust_get_text(url: &str, accept: &str) -> Result<String, String> {
    let response = request_agent()
        .get(url)
        .set("Accept", accept)
        .set("Cache-Control", "no-cache")
        .set("User-Agent", "ASC-Track-Designer-Updater")
        .call()
        .map_err(describe_ureq_error)?;
    read_limited(response.into_reader(), MAX_METADATA_BYTES)
}

fn quoted_powershell_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn quoted_powershell_path(path: &Path) -> String {
    quoted_powershell_literal(&path.to_string_lossy())
}

fn allowed_metadata_url(value: &str) -> bool {
    value == STATIC_MANIFEST_URL
        || value == GITHUB_LATEST_RELEASE_URL
        || validate_release_download_url(value, MANIFEST_ASSET_NAME)
}

#[cfg(windows)]
fn powershell_get_text(url: &str, _accept: &str) -> Result<String, String> {
    if !allowed_metadata_url(url) {
        return Err("PowerShell 请求地址不受信任".to_string());
    }
    let script = format!(
        "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $response=Invoke-WebRequest -UseBasicParsing -Uri {}; [Console]::Out.Write($response.Content)",
        quoted_powershell_literal(url)
    );
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &script,
    ]);
    command.creation_flags(0x08000000);
    let output = command
        .output()
        .map_err(|error| format!("无法启动 PowerShell 网络兜底: {error}"))?;
    if !output.status.success() {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if detail.is_empty() {
            "PowerShell 网络请求失败".to_string()
        } else {
            format!("PowerShell 网络请求失败: {detail}")
        });
    }
    if output.stdout.len() as u64 > MAX_METADATA_BYTES {
        return Err("PowerShell 网络响应超过允许大小".to_string());
    }
    String::from_utf8(output.stdout).map_err(|_| "PowerShell 网络响应不是有效 UTF-8".to_string())
}

#[cfg(not(windows))]
fn powershell_get_text(_url: &str, _accept: &str) -> Result<String, String> {
    Err("PowerShell 网络兜底仅支持 Windows".to_string())
}

fn discover_from_static(
    fetch: FetchText,
    current: Version,
) -> Result<Option<UpdateCandidate>, String> {
    let envelope = fetch(STATIC_MANIFEST_URL, "application/json")?;
    candidate_if_newer(candidate_from_envelope(envelope)?, current)
}

fn discover_from_api(
    fetch: FetchText,
    current: Version,
) -> Result<Option<UpdateCandidate>, String> {
    let response = fetch(GITHUB_LATEST_RELEASE_URL, "application/vnd.github+json")?;
    let release: GitHubRelease = serde_json::from_str(&response)
        .map_err(|error| format!("GitHub Release 数据无效: {error}"))?;
    if release.draft || release.prerelease {
        return Err("GitHub latest Release 不是正式版本".to_string());
    }
    let release_version =
        parse_version(&release.tag_name).ok_or_else(|| "GitHub Release 版本号无效".to_string())?;
    if release_version <= current {
        return Ok(None);
    }

    let manifest_asset = release
        .assets
        .iter()
        .find(|asset| asset.name == MANIFEST_ASSET_NAME)
        .ok_or_else(|| "GitHub Release 缺少 latest.json".to_string())?;
    if !validate_release_download_url(&manifest_asset.browser_download_url, MANIFEST_ASSET_NAME) {
        return Err("GitHub Release 清单地址不受信任".to_string());
    }
    let envelope = fetch(&manifest_asset.browser_download_url, "application/json")?;
    let candidate = candidate_from_envelope(envelope)?;
    if candidate.version != release_version {
        return Err("签名清单版本与 GitHub Release 不一致".to_string());
    }

    let exe_asset = release
        .assets
        .iter()
        .find(|asset| asset.name == candidate.payload.asset.name)
        .ok_or_else(|| "GitHub Release 缺少签名清单声明的 EXE".to_string())?;
    if exe_asset.size != candidate.payload.asset.size
        || exe_asset.browser_download_url != candidate.payload.asset.url
    {
        return Err("签名清单与 GitHub Release 的 EXE 信息不一致".to_string());
    }
    if let Some(digest) = exe_asset.digest.as_deref().and_then(normalized_digest) {
        if digest != normalized_digest(&candidate.payload.asset.sha256).unwrap_or_default() {
            return Err("签名清单与 GitHub Release 的 SHA-256 不一致".to_string());
        }
    }

    candidate_if_newer(candidate, current)
}

fn discover_update() -> Result<Option<UpdateCandidate>, String> {
    let current = current_version();
    let mut errors = Vec::new();

    match discover_from_static(rust_get_text, current) {
        Ok(result) => return Ok(result),
        Err(error) => errors.push(format!("静态清单: {error}")),
    }
    match discover_from_api(rust_get_text, current) {
        Ok(result) => return Ok(result),
        Err(error) => errors.push(format!("GitHub API: {error}")),
    }

    #[cfg(windows)]
    {
        match discover_from_static(powershell_get_text, current) {
            Ok(result) => return Ok(result),
            Err(error) => errors.push(format!("PowerShell 静态清单: {error}")),
        }
        match discover_from_api(powershell_get_text, current) {
            Ok(result) => return Ok(result),
            Err(error) => errors.push(format!("PowerShell GitHub API: {error}")),
        }
    }

    Err(format!("检查更新失败：{}", errors.join("；")))
}

fn updates_directory() -> Result<PathBuf, String> {
    std::env::var_os("LOCALAPPDATA")
        .or_else(|| std::env::var_os("APPDATA"))
        .map(PathBuf::from)
        .map(|path| path.join("ASC Track Designer").join("updates"))
        .ok_or_else(|| "Windows 应用数据目录不可用".to_string())
}

fn current_exe_path() -> Result<PathBuf, String> {
    std::env::current_exe().map_err(|error| format!("无法获取当前程序路径: {error}"))
}

fn backup_path(current: &Path) -> PathBuf {
    let mut value = OsString::from(current.as_os_str());
    value.push(".old");
    PathBuf::from(value)
}

fn can_write_directory(directory: &Path) -> bool {
    let probe = directory.join(format!(".asc-update-{}.tmp", process::id()));
    match OpenOptions::new().write(true).create_new(true).open(&probe) {
        Ok(_) => fs::remove_file(probe).is_ok(),
        Err(_) => false,
    }
}

#[cfg(not(test))]
fn emit_progress(app: &AppHandle, downloaded: u64, total: u64) {
    let _ = app.emit(UPDATE_EVENT, DownloadProgress { downloaded, total });
}

#[cfg(not(test))]
fn download_with_rust(app: &AppHandle, asset: &ManifestAsset, path: &Path) -> Result<(), String> {
    let response = request_agent()
        .get(&asset.url)
        .set("Accept", "application/octet-stream")
        .set("Cache-Control", "no-cache")
        .set("User-Agent", "ASC-Track-Designer-Updater")
        .call()
        .map_err(describe_ureq_error)?;
    if let Some(content_length) = response.header("Content-Length") {
        let content_length = content_length
            .parse::<u64>()
            .map_err(|_| "更新文件大小响应无效".to_string())?;
        if content_length != asset.size {
            return Err("更新文件大小与签名清单不一致".to_string());
        }
    }

    let mut file = File::create(path).map_err(|error| format!("无法写入更新文件: {error}"))?;
    let mut reader = response.into_reader();
    let mut buffer = [0u8; 64 * 1024];
    let mut downloaded = 0u64;
    loop {
        let count = reader
            .read(&mut buffer)
            .map_err(|error| format!("读取更新文件失败: {error}"))?;
        if count == 0 {
            break;
        }
        downloaded += count as u64;
        if downloaded > asset.size || downloaded > MAX_UPDATE_BYTES {
            return Err("更新文件超过允许大小".to_string());
        }
        file.write_all(&buffer[..count])
            .map_err(|error| format!("保存更新文件失败: {error}"))?;
        emit_progress(app, downloaded, asset.size);
    }
    file.flush()
        .map_err(|error| format!("刷新更新文件失败: {error}"))?;
    Ok(())
}

#[cfg(all(windows, not(test)))]
fn download_with_powershell(
    app: &AppHandle,
    asset: &ManifestAsset,
    path: &Path,
) -> Result<(), String> {
    if !validate_release_download_url(&asset.url, &asset.name) {
        return Err("PowerShell 下载地址不受信任".to_string());
    }
    let script = format!(
        "$ErrorActionPreference='Stop'; Invoke-WebRequest -UseBasicParsing -Uri {} -OutFile {}",
        quoted_powershell_literal(&asset.url),
        quoted_powershell_path(path),
    );
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        &script,
    ]);
    command.stdout(Stdio::null()).stderr(Stdio::null());
    command.creation_flags(0x08000000);
    let mut child = command
        .spawn()
        .map_err(|error| format!("无法启动 PowerShell 下载: {error}"))?;
    let started = Instant::now();
    loop {
        if let Some(status) = child
            .try_wait()
            .map_err(|error| format!("无法读取 PowerShell 下载状态: {error}"))?
        {
            if !status.success() {
                return Err("PowerShell 下载更新文件失败".to_string());
            }
            break;
        }
        let downloaded = fs::metadata(path).map(|value| value.len()).unwrap_or(0);
        if downloaded > asset.size || downloaded > MAX_UPDATE_BYTES {
            let _ = child.kill();
            return Err("PowerShell 下载文件超过允许大小".to_string());
        }
        emit_progress(app, downloaded, asset.size);
        if started.elapsed() > Duration::from_secs(600) {
            let _ = child.kill();
            return Err("PowerShell 下载更新文件超时".to_string());
        }
        thread::sleep(Duration::from_millis(150));
    }
    emit_progress(
        app,
        fs::metadata(path).map(|value| value.len()).unwrap_or(0),
        asset.size,
    );
    Ok(())
}

#[cfg(all(not(windows), not(test)))]
fn download_with_powershell(
    _app: &AppHandle,
    _asset: &ManifestAsset,
    _path: &Path,
) -> Result<(), String> {
    Err("PowerShell 下载兜底仅支持 Windows".to_string())
}

fn verify_downloaded_file(path: &Path, asset: &ManifestAsset) -> Result<(u64, String), String> {
    let mut file = File::open(path).map_err(|error| format!("无法读取更新文件: {error}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    let mut bytes = 0u64;
    loop {
        let count = file
            .read(&mut buffer)
            .map_err(|error| format!("校验更新文件失败: {error}"))?;
        if count == 0 {
            break;
        }
        bytes += count as u64;
        if bytes > asset.size || bytes > MAX_UPDATE_BYTES {
            return Err("更新文件超过允许大小".to_string());
        }
        hasher.update(&buffer[..count]);
    }
    if bytes != asset.size {
        return Err("更新文件大小与签名清单不一致".to_string());
    }
    let actual = format!("{:x}", hasher.finalize());
    let expected =
        normalized_digest(&asset.sha256).ok_or_else(|| "签名清单中的 SHA-256 无效".to_string())?;
    if actual != expected {
        return Err("更新文件 SHA-256 校验失败".to_string());
    }
    Ok((bytes, actual))
}

fn create_update_token() -> String {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("{:x}-{:x}", process::id(), nanos)
}

fn valid_update_token(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 80
        && value
            .chars()
            .all(|character| character.is_ascii_hexdigit() || character == '-')
}

fn startup_token() -> Option<String> {
    let mut arguments = std::env::args();
    while let Some(argument) = arguments.next() {
        if argument == "--asc-update-token" {
            let token = arguments.next()?;
            return valid_update_token(&token).then_some(token);
        }
    }
    None
}

fn startup_marker(token: &str) -> Result<PathBuf, String> {
    if !valid_update_token(token) {
        return Err("更新启动 token 无效".to_string());
    }
    Ok(updates_directory()?.join(format!("startup-{token}.ok")))
}

fn update_script(
    current: &Path,
    downloaded: &Path,
    backup: &Path,
    marker: &Path,
    script: &Path,
    token: &str,
    process_id: u32,
) -> String {
    format!(
        "$ErrorActionPreference = 'Stop'\n$processId = {process_id}\n$current = {}\n$downloaded = {}\n$backup = {}\n$marker = {}\n$script = {}\n$token = {}\nwhile (Get-Process -Id $processId -ErrorAction SilentlyContinue) {{ Start-Sleep -Milliseconds 250 }}\n$launched = $null\n$confirmed = $false\ntry {{\n  Move-Item -LiteralPath $current -Destination $backup\n  Move-Item -LiteralPath $downloaded -Destination $current\n  $launched = Start-Process -FilePath $current -ArgumentList '--asc-update-token', $token -PassThru\n  $deadline = (Get-Date).AddSeconds(60)\n  while ((Get-Date) -lt $deadline) {{\n    if (Test-Path -LiteralPath $marker) {{ $confirmed = $true; break }}\n    if ($launched.HasExited) {{ break }}\n    Start-Sleep -Milliseconds 250\n  }}\n  if ($confirmed) {{\n    if (Test-Path -LiteralPath $backup) {{ Remove-Item -LiteralPath $backup -Force }}\n    if (Test-Path -LiteralPath $marker) {{ Remove-Item -LiteralPath $marker -Force }}\n    $downloadDirectory = Split-Path -Parent $downloaded\n    if (Test-Path -LiteralPath $downloadDirectory) {{ Remove-Item -LiteralPath $downloadDirectory -Recurse -Force }}\n  }} elseif ($launched.HasExited) {{\n    throw 'New version exited before startup confirmation'\n  }}\n}} catch {{\n  if (Test-Path -LiteralPath $backup) {{\n    if (Test-Path -LiteralPath $current) {{ Remove-Item -LiteralPath $current -Force }}\n    Move-Item -LiteralPath $backup -Destination $current -Force\n    Start-Process -FilePath $current\n  }}\n}}\ntry {{ Remove-Item -LiteralPath $script -Force }} catch {{}}\n",
        quoted_powershell_path(current),
        quoted_powershell_path(downloaded),
        quoted_powershell_path(backup),
        quoted_powershell_path(marker),
        quoted_powershell_path(script),
        quoted_powershell_literal(token),
    )
}

#[cfg_attr(not(test), tauri::command)]
pub fn check_for_update() -> Result<Option<UpdateRelease>, String> {
    let Some(candidate) = discover_update()? else {
        return Ok(None);
    };
    Ok(Some(UpdateRelease {
        version: candidate.payload.version.clone(),
        tag_name: format!("v{}", candidate.payload.version),
        title: candidate.payload.title.clone(),
        body: candidate.payload.notes.clone(),
        published_at: Some(candidate.payload.published_at.clone()),
        notes_url: candidate.payload.notes_url.clone(),
        asset_name: candidate.payload.asset.name.clone(),
        asset_size: candidate.payload.asset.size,
    }))
}

#[cfg(not(test))]
#[tauri::command]
pub fn download_update(app: AppHandle, version: String) -> Result<DownloadedUpdate, String> {
    let requested = parse_version(&version).ok_or_else(|| "更新版本号无效".to_string())?;
    let candidate = discover_update()?.ok_or_else(|| "当前没有可下载的更新".to_string())?;
    if candidate.version != requested {
        return Err("可用更新版本已经变化，请重新检查更新".to_string());
    }

    let directory = updates_directory()?.join(version_text(candidate.version));
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建更新目录: {error}"))?;
    let part_path = directory.join(format!("{}.part", candidate.payload.asset.name));
    let final_path = directory.join(&candidate.payload.asset.name);
    let manifest_path = directory.join(MANIFEST_ASSET_NAME);
    let _ = fs::remove_file(&part_path);

    let direct_error = match download_with_rust(&app, &candidate.payload.asset, &part_path) {
        Ok(()) => None,
        Err(error) => {
            let _ = fs::remove_file(&part_path);
            Some(error)
        }
    };
    if let Some(direct_error) = direct_error {
        download_with_powershell(&app, &candidate.payload.asset, &part_path).map_err(
            |fallback| {
                let _ = fs::remove_file(&part_path);
                format!("Rust 下载失败: {direct_error}；PowerShell 下载失败: {fallback}")
            },
        )?;
    }

    let (bytes, sha256) =
        verify_downloaded_file(&part_path, &candidate.payload.asset).map_err(|error| {
            let _ = fs::remove_file(&part_path);
            error
        })?;
    if final_path.exists() {
        fs::remove_file(&final_path).map_err(|error| format!("无法替换旧的下载文件: {error}"))?;
    }
    fs::rename(&part_path, &final_path).map_err(|error| format!("无法准备更新文件: {error}"))?;
    fs::write(&manifest_path, candidate.envelope)
        .map_err(|error| format!("无法保存签名更新清单: {error}"))?;

    let current = current_exe_path()?;
    let installable = current.parent().map(can_write_directory).unwrap_or(false)
        && !backup_path(&current).exists();
    Ok(DownloadedUpdate {
        path: final_path.to_string_lossy().into_owned(),
        bytes,
        sha256,
        installable,
    })
}

#[cfg(not(test))]
#[tauri::command]
pub fn install_update(app: AppHandle, path: String) -> Result<(), String> {
    #[cfg(not(windows))]
    {
        let _ = (app, path);
        return Err("便携版自动替换目前仅支持 Windows".to_string());
    }

    #[cfg(windows)]
    {
        let update_root = updates_directory()?;
        fs::create_dir_all(&update_root).map_err(|error| format!("更新目录不可用: {error}"))?;
        let update_root = update_root
            .canonicalize()
            .map_err(|error| format!("更新目录不可用: {error}"))?;
        let downloaded = PathBuf::from(path)
            .canonicalize()
            .map_err(|error| format!("更新文件不可用: {error}"))?;
        if !downloaded.starts_with(&update_root)
            || downloaded.extension().and_then(|value| value.to_str()) != Some("exe")
        {
            return Err("更新文件路径不受信任".to_string());
        }

        let directory = downloaded
            .parent()
            .ok_or_else(|| "更新文件目录不可用".to_string())?;
        let manifest_text = fs::read_to_string(directory.join(MANIFEST_ASSET_NAME))
            .map_err(|error| format!("无法读取本地签名清单: {error}"))?;
        let payload = verify_manifest(&manifest_text)?;
        let target_version = validate_manifest_payload(&payload)?;
        if target_version <= current_version() {
            return Err("更新文件版本不高于当前版本".to_string());
        }
        if downloaded.file_name().and_then(|value| value.to_str())
            != Some(payload.asset.name.as_str())
        {
            return Err("更新文件名与签名清单不一致".to_string());
        }
        verify_downloaded_file(&downloaded, &payload.asset)?;

        let current = current_exe_path()?;
        let current_directory = current
            .parent()
            .ok_or_else(|| "当前程序目录不可用".to_string())?;
        if !can_write_directory(current_directory) {
            return Err("当前程序目录没有写入权限，请手动替换已下载的更新文件".to_string());
        }
        let backup = backup_path(&current);
        if backup.exists() {
            return Err("检测到未完成更新的旧版备份，请确认当前版本正常后再处理更新".to_string());
        }

        let token = create_update_token();
        let marker = startup_marker(&token)?;
        let _ = fs::remove_file(&marker);
        let script =
            std::env::temp_dir().join(format!("asc-track-designer-update-{}.ps1", process::id()));
        fs::write(
            &script,
            update_script(
                &current,
                &downloaded,
                &backup,
                &marker,
                &script,
                &token,
                process::id(),
            ),
        )
        .map_err(|error| format!("无法创建更新脚本: {error}"))?;

        let mut command = Command::new("powershell.exe");
        command.args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
        ]);
        command.arg(&script);
        command.creation_flags(0x08000000);
        command
            .spawn()
            .map_err(|error| format!("无法启动更新程序: {error}"))?;
        app.exit(0);
        Ok(())
    }
}

#[cfg_attr(not(test), tauri::command)]
pub fn confirm_update_startup() -> Result<bool, String> {
    let Some(token) = startup_token() else {
        return Ok(false);
    };
    let marker = startup_marker(&token)?;
    if let Some(parent) = marker.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("无法创建更新确认目录: {error}"))?;
    }
    fs::write(&marker, b"ok").map_err(|error| format!("无法确认新版本启动: {error}"))?;

    let current = current_exe_path()?;
    let backup = backup_path(&current);
    if backup.exists() {
        let _ = fs::remove_file(backup);
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{Signer, SigningKey};

    fn payload(version: &str) -> ManifestPayload {
        ManifestPayload {
            version: version.to_string(),
            minimum_version: "2.2.0".to_string(),
            published_at: "2026-08-03T00:00:00Z".to_string(),
            title: format!("ASC Track Designer {version}"),
            notes: "更新说明".to_string(),
            notes_url: format!(
                "https://github.com/ZhangStudyLife/asc-track-designer/releases/tag/v{version}"
            ),
            asset: ManifestAsset {
                name: format!("ASC.{version}.exe"),
                url: format!(
                    "https://github.com/ZhangStudyLife/asc-track-designer/releases/download/v{version}/ASC.{version}.exe"
                ),
                size: 10,
                sha256: "a".repeat(64),
            },
        }
    }

    fn signed_manifest(payload: &ManifestPayload, key: &SigningKey) -> String {
        let bytes = serde_json::to_vec(payload).unwrap();
        serde_json::to_string(&SignedManifest {
            payload: STANDARD.encode(&bytes),
            signature: STANDARD.encode(key.sign(&bytes).to_bytes()),
        })
        .unwrap()
    }

    #[test]
    fn parses_plain_and_tagged_versions() {
        assert_eq!(
            parse_version("v2.2.0"),
            Some(Version {
                major: 2,
                minor: 2,
                patch: 0
            })
        );
        assert_eq!(parse_version("2.2"), None);
        assert_eq!(parse_version("v2.2.0-beta"), None);
    }

    #[test]
    fn verifies_signed_manifest_payload() {
        let signing_key = SigningKey::from_bytes(&[7u8; 32]);
        let manifest = signed_manifest(&payload("2.3.0"), &signing_key);
        let parsed = verify_manifest_with_key(&manifest, &signing_key.verifying_key()).unwrap();
        assert_eq!(parsed.version, "2.3.0");
    }

    #[test]
    fn rejects_modified_signed_manifest() {
        let signing_key = SigningKey::from_bytes(&[7u8; 32]);
        let manifest = signed_manifest(&payload("2.3.0"), &signing_key);
        let mut envelope: SignedManifest = serde_json::from_str(&manifest).unwrap();
        envelope.payload = STANDARD.encode(serde_json::to_vec(&payload("9.0.0")).unwrap());
        let modified = serde_json::to_string(&envelope).unwrap();
        assert!(verify_manifest_with_key(&modified, &signing_key.verifying_key()).is_err());
    }

    #[test]
    fn restricts_update_urls_to_the_release_repository() {
        assert!(validate_release_download_url(
            "https://github.com/ZhangStudyLife/asc-track-designer/releases/download/v2.3.0/ASC.2.3.0.exe",
            "ASC.2.3.0.exe"
        ));
        assert!(!validate_release_download_url(
            "https://example.com/ASC.2.3.0.exe",
            "ASC.2.3.0.exe"
        ));
    }

    #[test]
    fn validates_sha256_digest_format() {
        assert_eq!(
            normalized_digest(&format!("sha256:{}", "A".repeat(64))),
            Some("a".repeat(64))
        );
        assert_eq!(normalized_digest("sha256:short"), None);
    }

    #[test]
    fn generates_replacement_script_with_startup_confirmation() {
        let script = update_script(
            Path::new(r"C:\Track Designer\ASC.exe"),
            Path::new(r"C:\Users\user\updates\ASC.2.3.0.exe"),
            Path::new(r"C:\Track Designer\ASC.exe.old"),
            Path::new(r"C:\Users\user\updates\startup-token.ok"),
            Path::new(r"C:\Temp\update.ps1"),
            "2a-1234",
            42,
        );
        assert!(script.contains("$processId = 42"));
        assert!(script.contains("--asc-update-token"));
        assert!(script.contains("AddSeconds(60)"));
        assert!(script.contains("New version exited before startup confirmation"));
        assert!(script.contains(
            "catch {\n  if (Test-Path -LiteralPath $backup) {\n    if (Test-Path -LiteralPath $current)"
        ));
    }

    #[test]
    fn rejects_untrusted_manifest_metadata() {
        let mut invalid_asset = payload("2.3.0");
        invalid_asset.asset.url = "https://example.com/ASC.2.3.0.exe".to_string();
        assert!(validate_manifest_payload(&invalid_asset).is_err());

        let mut invalid_notes = payload("2.3.0");
        invalid_notes.notes_url = "https://example.com/release-notes".to_string();
        assert!(validate_manifest_payload(&invalid_notes).is_err());
    }

    #[test]
    fn verifies_downloaded_file_size_and_hash() {
        let path = std::env::temp_dir().join(format!("asc-updater-test-{}", create_update_token()));
        fs::write(&path, b"verified update").unwrap();
        let mut asset = payload("2.3.0").asset;
        asset.size = 15;
        asset.sha256 = format!("{:x}", Sha256::digest(b"verified update"));

        assert_eq!(verify_downloaded_file(&path, &asset).unwrap().0, 15);
        asset.size = 16;
        assert!(verify_downloaded_file(&path, &asset).is_err());
        fs::remove_file(path).unwrap();
    }

    #[test]
    fn restricts_metadata_urls_and_startup_tokens() {
        assert!(allowed_metadata_url(STATIC_MANIFEST_URL));
        assert!(allowed_metadata_url(GITHUB_LATEST_RELEASE_URL));
        assert!(!allowed_metadata_url("https://example.com/latest.json"));
        assert!(valid_update_token("2a-1234"));
        assert!(!valid_update_token("../token"));
    }
}
