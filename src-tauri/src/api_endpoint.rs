fn trim_trailing_slashes(value: &str) -> &str {
    value.trim().trim_end_matches('/')
}

pub fn normalize_request_mode(request_mode: &str) -> &'static str {
    if request_mode.trim().eq_ignore_ascii_case("chat") {
        "chat"
    } else {
        "responses"
    }
}

pub fn is_responses_model(model_name: &str) -> bool {
    let normalized = model_name.trim().to_ascii_lowercase();
    normalized.starts_with("gpt-5") || normalized.starts_with("o3") || normalized.starts_with("o4")
}

pub fn normalize_api_base_url(api_url: &str) -> String {
    let normalized = trim_trailing_slashes(api_url);
    let lower = normalized.to_ascii_lowercase();

    if lower.ends_with("/responses") {
        return normalized[..normalized.len() - "/responses".len()].to_string();
    }

    if lower.ends_with("/chat/completions") {
        return normalized[..normalized.len() - "/chat/completions".len()].to_string();
    }

    normalized.to_string()
}

pub fn infer_request_mode(api_url: &str, model_name: &str) -> String {
    let normalized = trim_trailing_slashes(api_url).to_ascii_lowercase();

    if normalized.ends_with("/chat/completions") {
        return "chat".to_string();
    }

    if normalized.ends_with("/responses") {
        return "responses".to_string();
    }

    if is_responses_model(model_name) {
        "responses".to_string()
    } else {
        "chat".to_string()
    }
}

pub fn build_models_endpoint(api_url: &str) -> String {
    let base_url = normalize_api_base_url(api_url);
    let normalized = trim_trailing_slashes(&base_url);

    if normalized.to_ascii_lowercase().ends_with("/v1") {
        return format!("{}/models", normalized);
    }

    format!("{}/v1/models", normalized)
}

pub fn resolve_request_endpoint(api_base_url: &str, request_mode: &str) -> String {
    let base_url = normalize_api_base_url(api_base_url);
    let versioned_base = if trim_trailing_slashes(&base_url)
        .to_ascii_lowercase()
        .ends_with("/v1")
    {
        trim_trailing_slashes(&base_url).to_string()
    } else {
        format!("{}/v1", trim_trailing_slashes(&base_url))
    };

    if normalize_request_mode(request_mode) == "responses" {
        format!("{}/responses", versioned_base)
    } else {
        format!("{}/chat/completions", versioned_base)
    }
}

pub fn is_responses_endpoint(api_base_url: &str, request_mode: &str) -> bool {
    resolve_request_endpoint(api_base_url, request_mode)
        .to_ascii_lowercase()
        .ends_with("/responses")
}
