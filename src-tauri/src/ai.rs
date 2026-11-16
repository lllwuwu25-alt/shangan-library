use std::time::Duration;

fn validate_url(raw: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(raw).map_err(|_| "AI 地址无效。")?;
    let loopback = matches!(
        url.host_str(),
        Some("localhost" | "127.0.0.1" | "[::1]" | "::1")
    );
    if (url.scheme() != "https" && !(url.scheme() == "http" && loopback))
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("AI 地址必须使用 HTTPS 或本机 HTTP，且不能带凭据或参数。".into());
    }
    Ok(url)
}

#[tauri::command]
pub async fn ai_chat(
    url: String,
    api_key: String,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let url = validate_url(&url)?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|_| "AI 连接初始化失败。")?;
    let mut request = client.post(url).json(&body);
    if !api_key.trim().is_empty() {
        request = request.bearer_auth(api_key.trim());
    }
    // Never log requests or return provider bodies: either may contain customer secrets.
    let response = request
        .send()
        .await
        .map_err(|_| "AI 服务无法连接或请求超时。")?;
    if !response.status().is_success() {
        return Err(format!(
            "AI 请求失败（HTTP {}），请检查密钥、地址、模型及额度。",
            response.status().as_u16()
        ));
    }
    response
        .json()
        .await
        .map_err(|_| "AI 服务响应不是有效 JSON。".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn endpoint_does_not_allow_secret_urls_or_remote_cleartext() {
        for raw in [
            "https://user:pass@example.com/v1",
            "https://example.com/v1?key=secret",
            "http://example.com",
            "file:///tmp/test",
        ] {
            assert!(validate_url(raw).is_err());
        }
        for raw in [
            "https://example.com/v1/chat/completions",
            "http://localhost:11434/v1/chat/completions",
        ] {
            assert!(validate_url(raw).is_ok());
        }
    }
}
