use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct GroqResponse {
    choices: Vec<GroqChoice>,
}
#[derive(Deserialize)]
struct GroqChoice {
    message: GroqMessage,
}
#[derive(Deserialize)]
struct GroqMessage {
    content: String,
}

#[derive(Deserialize, Serialize)]
pub struct AgentAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub path: Option<String>,
    pub app: Option<String>,
}

#[derive(Deserialize, Serialize)]
pub struct AgentReply {
    pub message: String,
    pub actions: Vec<AgentAction>,
}

const SYSTEM_PROMPT: &str = r#"You are TAPAS AI, a desktop assistant. Return ONLY JSON: {"message":"...","actions":[...]}. Allowed action objects: {"type":"list_directory","path":"relative path under Home; empty means Home"}; {"type":"create_folder","path":"relative path under Home"}; {"type":"create_file","path":"relative path under Home"}; {"type":"open_folder","path":"relative folder path under Home; empty means Home"}; {"type":"open_app","app":"My Files|Browser|Settings|App Store|Terminal"}. Never suggest shell commands, arbitrary code, deleting, moving, reading file contents, network downloads, payments, passwords, or actions outside this allowlist. For create actions explain what will be created; app will ask confirmation. If unsupported, return actions:[]. Never claim completion before execution. Do not mention Sicily AI."#;

/// Address of the hosted TAPAS AI endpoint (for example
/// "https://your-project.vercel.app/api/tapas-ai"). It can be provided at run time
/// through the TAPAS_AI_URL environment variable, or baked in at build time
/// (GitHub Actions secret TAPAS_AI_URL). This is what makes the AI work in an
/// installed app, because an installed app does not inherit shell variables.
const BUILT_IN_ENDPOINT: Option<&str> = option_env!("TAPAS_AI_URL");

fn hosted_endpoint() -> Option<String> {
    std::env::var("TAPAS_AI_URL")
        .ok()
        .or_else(|| BUILT_IN_ENDPOINT.map(|value| value.to_string()))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

async fn ask_groq_directly(key: &str, prompt: &str, context: &str) -> Result<AgentReply, String> {
    let user = format!("Request: {}\nContext: {}", prompt, context);
    let body = serde_json::json!({
        "model": "openai/gpt-oss-20b",
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user}
        ]
    });

    let response = reqwest::Client::new()
        .post("https://api.groq.com/openai/v1/chat/completions")
        .bearer_auth(key)
        .json(&body)
        .timeout(std::time::Duration::from_secs(45))
        .send()
        .await
        .map_err(|e| format!("Could not reach Groq: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let detail = response.text().await.unwrap_or_default();
        return Err(format!(
            "Groq returned {status}: {}",
            detail.chars().take(400).collect::<String>()
        ));
    }

    let data: GroqResponse = response
        .json()
        .await
        .map_err(|e| format!("Invalid Groq response: {e}"))?;
    let content = data
        .choices
        .first()
        .ok_or("Groq returned no response")?
        .message
        .content
        .trim();

    serde_json::from_str::<AgentReply>(content)
        .map_err(|_| "TAPAS AI returned an invalid plan. Try again.".to_string())
}

async fn ask_hosted(url: &str, prompt: &str, context: &str) -> Result<AgentReply, String> {
    let secure = url.starts_with("https://")
        || url.starts_with("http://localhost")
        || url.starts_with("http://127.0.0.1");
    if !secure {
        return Err("TAPAS_AI_URL must start with https://".to_string());
    }

    let body = serde_json::json!({
        "prompt": prompt,
        "context": context,
        "client": "desktop"
    });

    let response = reqwest::Client::new()
        .post(url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .map_err(|e| format!("Could not reach TAPAS AI service: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        let detail = serde_json::from_str::<serde_json::Value>(&text)
            .ok()
            .and_then(|value| value.get("error").and_then(|e| e.as_str()).map(|e| e.to_string()))
            .unwrap_or(text);
        return Err(format!(
            "TAPAS AI service returned {status}: {}",
            detail.chars().take(400).collect::<String>()
        ));
    }

    response
        .json::<AgentReply>()
        .await
        .map_err(|e| format!("Invalid TAPAS AI service response: {e}"))
}

#[tauri::command]
pub async fn ask_tapas_ai(prompt: String, context: Option<String>) -> Result<AgentReply, String> {
    if prompt.trim().is_empty() || prompt.len() > 6000 {
        return Err("Enter a message under 6,000 characters.".into());
    }
    let context = context.unwrap_or_default();

    // 1) Developer mode: a local GROQ_API_KEY talks to Groq directly.
    // 2) Installed app: use the hosted endpoint so no key ships inside the app.
    let parsed = match std::env::var("GROQ_API_KEY") {
        Ok(key) if !key.trim().is_empty() => ask_groq_directly(key.trim(), &prompt, &context).await?,
        _ => match hosted_endpoint() {
            Some(url) => ask_hosted(&url, &prompt, &context).await?,
            None => {
                return Err(
                    "TAPAS AI is not configured. For development export GROQ_API_KEY before `npm run tauri dev`; for an installed app build with TAPAS_AI_URL set to your hosted /api/tapas-ai address."
                        .into(),
                )
            }
        },
    };

    for action in &parsed.actions {
        if !matches!(
            action.action_type.as_str(),
            "list_directory" | "create_folder" | "create_file" | "open_app" | "open_folder"
        ) {
            return Err("Unsupported action was blocked.".into());
        }
    }
    Ok(parsed)
}
