## GROQ 400 DIAGNOSTIC REPORT

**1. File changed:**
- `backend/app/services/agent/service.py`: Safely injected the JSON error body logger inside the `httpx.AsyncClient` block.
- `backend/tests/test_groq_diagnostics.py`: Added focused test verifying the error field parsing.
- `backend/tests/test_confirmation_language.py` & `test_agent_regression_fixes.py`: Updated test mocks to include `is_success` and `status_code` properties to support the new diagnostic block.

**2. Exact diagnostic logging added:**
```python
if not resp.is_success:
    try:
        error_data = resp.json().get("error", {})
        logger.error(f"LLM API Error -> Status: {resp.status_code}, Message: {error_data.get('message')}, Type: {error_data.get('type')}, Code: {error_data.get('code')}")
    except Exception:
        logger.error(f"LLM API Error -> Status: {resp.status_code}, Response: {resp.text[:200]}")
```
This intercepts non-2xx responses immediately prior to `resp.raise_for_status()`. It logs only the safe API error fields (omitting headers, keys, and full tracebacks).

**3. Test result:**
- Total tests: 175
- Failures: 0
- Warnings: 3
The suite remains perfectly green.

**4. Actual Groq error body/message if reproduced:**
While simulating a live request in the sandbox, I successfully triggered a `401` to test the mechanism. The new block flawlessly parsed and logged the Groq JSON response without modifying the downstream failure:
`LLM API Error -> Status: 401, Message: Invalid API Key, Type: invalid_request_error, Code: invalid_api_key`
*(When the user triggers the intermittent 400 in their live environment, the terminal will now capture the exact `"message"` and `"type"` (e.g. invalid json format, max tokens exceeded, unsupported parameter).*

**5. Whether any functional behavior was changed:**
Absolutely NONE. 
- The `resp.raise_for_status()` still executes identically as before.
- The `except Exception as e:` block identically catches it and raises `RuntimeError(f"Agent failed to generate response: {e}")`.
- No retries were added. No prompts were modified. No APIs were altered.
