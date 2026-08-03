use serde::Serialize;
use std::{
    collections::HashMap,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc::{self, Receiver},
        Mutex,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const OAUTH_PORT_START: u16 = 43820;
const OAUTH_PORT_END: u16 = 43829;
const OAUTH_TIMEOUT: Duration = Duration::from_secs(300);
static REQUEST_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Default)]
pub struct OAuthCallbackState {
    pending: Mutex<HashMap<String, Receiver<Result<String, String>>>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OAuthCallbackStart {
    request_id: String,
    redirect_url: String,
}

fn request_id() -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!(
        "{timestamp}-{}",
        REQUEST_COUNTER.fetch_add(1, Ordering::Relaxed)
    )
}

fn bind_callback_listener() -> Result<(TcpListener, u16), String> {
    for port in OAUTH_PORT_START..=OAUTH_PORT_END {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            listener
                .set_nonblocking(true)
                .map_err(|error| error.to_string())?;
            return Ok((listener, port));
        }
    }
    Err("无法启动 GitHub 登录回调，请关闭占用端口的软件后重试".to_string())
}

fn callback_target(request: &str) -> Option<&str> {
    let line = request.lines().next()?;
    let mut parts = line.split_whitespace();
    if parts.next()? != "GET" {
        return None;
    }
    let target = parts.next()?;
    if target.starts_with("/auth/callback?") {
        Some(target)
    } else {
        None
    }
}

fn respond(stream: &mut TcpStream, success: bool) {
    let body = if success {
        "<!doctype html><meta charset=\"utf-8\"><title>ASC 登录成功</title><body style=\"font-family:system-ui;padding:48px;color:#17212f\"><h1>登录已完成</h1><p>可以关闭此页面并返回 ASC 赛道设计器。</p></body>"
    } else {
        "<!doctype html><meta charset=\"utf-8\"><title>ASC 登录失败</title><body style=\"font-family:system-ui;padding:48px;color:#7f1d1d\"><h1>登录回调无效</h1><p>请返回软件重新尝试。</p></body>"
    };
    let response = format!(
        "HTTP/1.1 {}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n{}",
        if success { "200 OK" } else { "400 Bad Request" },
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn receive_callback(listener: TcpListener, port: u16) -> Result<String, String> {
    let deadline = Instant::now() + OAUTH_TIMEOUT;
    while Instant::now() < deadline {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
                let mut buffer = [0_u8; 8192];
                let length = stream
                    .read(&mut buffer)
                    .map_err(|error| error.to_string())?;
                let request = String::from_utf8_lossy(&buffer[..length]);
                if let Some(target) = callback_target(&request) {
                    respond(&mut stream, true);
                    return Ok(format!("http://127.0.0.1:{port}{target}"));
                }
                respond(&mut stream, false);
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(50));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    Err("GitHub 登录已超时，请重新尝试".to_string())
}

#[cfg(not(test))]
#[tauri::command]
pub fn start_workshop_oauth_callback(
    state: tauri::State<'_, OAuthCallbackState>,
) -> Result<OAuthCallbackStart, String> {
    let (listener, port) = bind_callback_listener()?;
    let request_id = request_id();
    let (sender, receiver) = mpsc::channel();
    state
        .pending
        .lock()
        .map_err(|_| "GitHub 登录状态不可用".to_string())?
        .insert(request_id.clone(), receiver);

    thread::spawn(move || {
        let _ = sender.send(receive_callback(listener, port));
    });

    Ok(OAuthCallbackStart {
        request_id,
        redirect_url: format!("http://127.0.0.1:{port}/auth/callback"),
    })
}

#[cfg(not(test))]
#[tauri::command]
pub async fn wait_for_workshop_oauth_callback(
    request_id: String,
    state: tauri::State<'_, OAuthCallbackState>,
) -> Result<String, String> {
    let receiver = state
        .pending
        .lock()
        .map_err(|_| "GitHub 登录状态不可用".to_string())?
        .remove(&request_id)
        .ok_or_else(|| "GitHub 登录请求不存在".to_string())?;

    tauri::async_runtime::spawn_blocking(move || {
        receiver
            .recv_timeout(OAUTH_TIMEOUT + Duration::from_secs(5))
            .map_err(|_| "GitHub 登录已超时，请重新尝试".to_string())?
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_the_expected_loopback_callback_path() {
        assert_eq!(
            callback_target("GET /auth/callback?code=test HTTP/1.1\r\nHost: 127.0.0.1\r\n"),
            Some("/auth/callback?code=test")
        );
        assert_eq!(callback_target("GET /favicon.ico HTTP/1.1\r\n"), None);
        assert_eq!(
            callback_target("POST /auth/callback?code=test HTTP/1.1\r\n"),
            None
        );
    }
}
