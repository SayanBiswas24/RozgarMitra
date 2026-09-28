import os
import pytest

# Ensure all tests run in mock mode by default to remain offline and deterministic,
# regardless of what the user's .env file contains.
# We set this at the top level so it is evaluated before any app modules are imported
# and before python-dotenv runs. By default, python-dotenv does not override 
# existing os.environ variables.
os.environ["LLM_PROVIDER"] = "mock"
os.environ["LANGUAGE_PROVIDER"] = "mock"

@pytest.fixture(scope="session", autouse=True)
def ensure_mock_env():
    # Double check it remains mock just in case
    os.environ["LLM_PROVIDER"] = "mock"
    os.environ["LANGUAGE_PROVIDER"] = "mock"
