## 2024-07-02 - Hardcoded Admin Credentials in Streamlit App
**Vulnerability:** The Streamlit application had hardcoded admin passwords (`anubhav_admin_2025` and `AnubhavAnand`) in `main.py` and `anubhav_admin.py`, allowing anyone to gain unrestricted admin access if they view the source code.
**Learning:** Hardcoding credentials in source code, especially for admin/unrestricted capabilities, is a critical security risk as code can be exposed via repositories, logs, or debugging.
**Prevention:** Always load sensitive credentials from environment variables or secure credential stores (like Streamlit's `secrets.toml`).

## 2026-07-28 - Insecure Local Fallback and Cryptographic Keys
**Vulnerability:** Having a fallback check with MD5 hashes generated dynamically based on the current date creates predictable/bypassable backdoors for admin panels.
**Learning:** Local static hashes derived from predictable variables (like dates or username string hashes) do not replace secure environment-defined authentication secrets.
**Prevention:** Remove all predictive mathematical cryptographic key fallbacks from production authentication code, and rely solely on secrets or verified authentication services.
