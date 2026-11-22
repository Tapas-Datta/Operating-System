use serde::{Deserialize, Serialize};

#[derive(Deserialize)] struct GroqResponse { choices: Vec<GroqChoice> }
#[derive(Deserialize)] struct GroqChoice { message: GroqMessage }
#[derive(Deserialize)] struct GroqMessage { content: String }
#[derive(Deserialize, Serialize)] pub struct AgentAction {
    #[serde(rename="type")] pub action_type: String,
    pub path: Option<String>, pub app: Option<String>,
}
#[derive(Deserialize, Serialize)] pub struct AgentReply { pub message: String, pub actions: Vec<AgentAction> }

#[tauri::command]
pub async fn ask_tapas_ai(prompt: String, context: Option<String>) -> Result<AgentReply, String> {
    if prompt.trim().is_empty() || prompt.len() > 6000 { return Err("Enter a message under 6,000 characters.".into()); }
    let key = std::env::var("GROQ_API_KEY").map_err(|_| "GROQ_API_KEY is missing. Export it before starting TAPAS OS.".to_string())?;
    let system = r#"You are TAPAS AI, a desktop assistant. Return ONLY JSON: {"message":"...","actions":[...]}. Allowed action objects: {"type":"list_directory","path":"relative path under Home; empty means Home"}; {"type":"create_folder","path":"relative path under Home"}; {"type":"create_file","path":"relative path under Home"}; {"type":"open_folder","path":"relative folder path under Home; empty means Home"}; {"type":"open_app","app":"My Files|Browser|Settings|App Store|Terminal"}. Never suggest shell commands, arbitrary code, deleting, moving, reading file contents, network downloads, payments, passwords, or actions outside this allowlist. For create actions explain what will be created; app will ask confirmation. If unsupported, return actions:[]. Never claim completion before execution. Do not mention Sicily AI."#;
    let user = format!("Request: {}\nContext: {}", prompt, context.unwrap_or_default());
    let body = serde_json::json!({"model":"openai/gpt-oss-20b","temperature":0.2,"response_format":{"type":"json_object"},"messages":[{"role":"system","content":system},{"role":"user","content":user}]});
    let response = reqwest::Client::new().post("https://api.groq.com/openai/v1/chat/completions").bearer_auth(key).json(&body).timeout(std::time::Duration::from_secs(45)).send().await.map_err(|e|format!("Could not reach Groq: {e}"))?;
    if !response.status().is_success() { let status=response.status(); let detail=response.text().await.unwrap_or_default(); return Err(format!("Groq returned {status}: {}",detail.chars().take(400).collect::<String>())); }
    let data: GroqResponse=response.json().await.map_err(|e|format!("Invalid Groq response: {e}"))?;
    let content=data.choices.first().ok_or("Groq returned no response")?.message.content.trim();
    let parsed: AgentReply=serde_json::from_str(content).map_err(|_|"TAPAS AI returned an invalid plan. Try again.".to_string())?;
    for action in &parsed.actions { if !matches!(action.action_type.as_str(),"list_directory"|"create_folder"|"create_file"|"open_app"|"open_folder") { return Err("Unsupported action was blocked.".into()); } }
    Ok(parsed)
}
