# ADR-002: Licensing Server — Ed25519 JWT Leases with Emergency Read-Only

## Status
Accepted — 2026-08-12

## Context
The on-prem desktop edition needs a licensing mechanism that:
- Works fully offline for extended periods (clinics may have unreliable internet)
- Cannot be trivially bypassed (but also doesn't "phone home" constantly)
- Preserves patient safety — a license dispute must NEVER block access to existing patient data
- Is cryptographically verifiable without network access

## Decision
Use **Ed25519-signed JWT leases** with a 30-day validity period and **emergency read-only mode** on expiry.

### Lease lifecycle
1. Desktop calls `POST /api/licenses/verify` with license key + machine fingerprint
2. Server validates license, checks device limits, signs a JWT with Ed25519 private key
3. Desktop stores the JWT locally and verifies it with the embedded public key (no network needed)
4. On expiry:
   - **< 7 days expired**: Grace period — full functionality with warning banner
   - **7-30 days expired**: Emergency read-only mode — patient data readable (patient safety), new writes blocked
   - **> 30 days expired or revoked**: Hard lock — only data export allowed (clinic can migrate)

### Why Ed25519 (not RSA, not HMAC)
- **Ed25519** is faster, has smaller signatures (64 bytes), and is resistant to side-channel attacks.
- **HMAC** would require sharing the secret with the desktop client (insecure — secret can be extracted).
- **RSA** is slower, larger signatures, more complex.
- Ed25519 is supported natively in Node.js `crypto` module.

### Machine fingerprint
- SHA-256 hash of hostname + MAC + CPU ID + disk serial
- Opaque (non-reversible) — no hardware IDs leaked
- Used to enforce device limits per license

## Consequences
- **Positive**: Full offline operation for 30 days. Patient safety guaranteed (read-only mode).
- **Positive**: Cryptographically verifiable — can't forge a lease without the private key.
- **Negative**: Licensing server is a SPOF for new lease issuance (existing desktops keep running).
- **Mitigation**: Deploy licensing server on managed platform with HA.

## Related
- ADR-001: Electron desktop architecture
- Master prompt §9 (break-glass access), §8.3 (management plane)
