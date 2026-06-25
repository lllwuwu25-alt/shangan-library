use std::env;
use std::fs;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::Duration;

const START_PORT: u16 = 38271;
const MAX_PORT_ATTEMPTS: u16 = 40;

fn main() {
    let app_dir = resolve_app_dir();
    if !app_dir.join("index.html").exists() {
        eprintln!("未找到 app/index.html，请确认离线包目录完整。");
        pause_on_windows();
        std::process::exit(1);
    }

    let (listener, port) = bind_available_port();
    let url = format!("http://127.0.0.1:{}/", port);

    println!("上岸资料库已启动");
    println!("本地地址：{}", url);
    println!("关闭此窗口即可停止本地服务。");

    open_browser(&url);

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let app_dir = app_dir.clone();
                thread::spawn(move || handle_connection(stream, &app_dir));
            }
            Err(error) => eprintln!("连接失败：{}", error),
        }
    }
}

fn resolve_app_dir() -> PathBuf {
    if let Ok(custom_dir) = env::var("SHANGAN_APP_DIR") {
        return PathBuf::from(custom_dir);
    }

    let exe = env::current_exe().unwrap_or_else(|_| PathBuf::from("."));
    let runtime_dir = exe.parent().unwrap_or_else(|| Path::new("."));
    runtime_dir.parent().unwrap_or(runtime_dir).join("app")
}

fn bind_available_port() -> (TcpListener, u16) {
    for offset in 0..MAX_PORT_ATTEMPTS {
        let port = START_PORT + offset;
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            return (listener, port);
        }
    }

    eprintln!("无法启动本地服务：端口 {}-{} 都被占用。", START_PORT, START_PORT + MAX_PORT_ATTEMPTS);
    pause_on_windows();
    std::process::exit(1);
}

fn handle_connection(mut stream: TcpStream, app_dir: &Path) {
    let mut buffer = [0; 8192];
    let bytes_read = match stream.read(&mut buffer) {
        Ok(bytes) => bytes,
        Err(_) => return,
    };

    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let Some(first_line) = request.lines().next() else {
        return;
    };

    let parts: Vec<&str> = first_line.split_whitespace().collect();
    if parts.len() < 2 || parts[0] != "GET" {
        write_response(&mut stream, 405, "text/plain; charset=utf-8", b"Method Not Allowed");
        return;
    }

    let request_path = sanitize_path(parts[1]);
    let mut file_path = if request_path == "/" {
        app_dir.join("index.html")
    } else {
        app_dir.join(request_path.trim_start_matches('/'))
    };

    if file_path.is_dir() {
        file_path = file_path.join("index.html");
    }

    if !file_path.exists() {
        file_path = app_dir.join("index.html");
    }

    match fs::read(&file_path) {
        Ok(bytes) => {
            let mime = mime_for(&file_path);
            write_response(&mut stream, 200, mime, &bytes);
        }
        Err(_) => write_response(&mut stream, 404, "text/plain; charset=utf-8", b"Not Found"),
    }
}

fn sanitize_path(path: &str) -> String {
    let path_without_query = path.split('?').next().unwrap_or("/");
    let decoded = percent_decode(path_without_query);
    let mut clean = PathBuf::new();

    for component in decoded.split('/') {
        if component.is_empty() || component == "." || component == ".." {
            continue;
        }
        clean.push(component);
    }

    format!("/{}", clean.to_string_lossy())
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        if bytes[index] == b'%' && index + 2 < bytes.len() {
            if let Ok(hex) = u8::from_str_radix(&input[index + 1..index + 3], 16) {
                output.push(hex);
                index += 3;
                continue;
            }
        }
        output.push(bytes[index]);
        index += 1;
    }

    String::from_utf8_lossy(&output).to_string()
}

fn write_response(stream: &mut TcpStream, status: u16, content_type: &str, body: &[u8]) {
    let status_text = match status {
        200 => "OK",
        404 => "Not Found",
        405 => "Method Not Allowed",
        _ => "OK",
    };

    let headers = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        status,
        status_text,
        content_type,
        body.len()
    );

    let _ = stream.write_all(headers.as_bytes());
    let _ = stream.write_all(body);
}

fn mime_for(path: &Path) -> &'static str {
    match path.extension().and_then(|ext| ext.to_str()).unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => "application/octet-stream",
    }
}

fn open_browser(url: &str) {
    let url = url.to_string();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(350));
        #[cfg(target_os = "macos")]
        let _ = Command::new("open").arg(&url).status();

        #[cfg(target_os = "windows")]
        let _ = Command::new("cmd").args(["/C", "start", "", &url]).status();

        #[cfg(target_os = "linux")]
        let _ = Command::new("xdg-open").arg(&url).status();
    });
}

fn pause_on_windows() {
    #[cfg(target_os = "windows")]
    {
        println!("按 Enter 退出...");
        let mut input = String::new();
        let _ = std::io::stdin().read_line(&mut input);
    }
}
