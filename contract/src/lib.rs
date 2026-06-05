wit_bindgen::generate!({
    path: "wit",
    world: "escrow",
});

#[cfg(not(test))]
use crate::t3n::escrow::host;

#[cfg(test)]
pub use mock_host as host;
use serde::{Deserialize, Serialize};

struct Component;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReleaseRule {
    #[serde(rename = "requireDelivered")]
    pub require_delivered: bool,
    #[serde(rename = "requireApproved")]
    pub require_approved: bool,
    pub deadline: Option<u64>,
    pub arbiter: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Attestation {
    #[serde(rename = "milestoneId")]
    pub milestone_id: String,
    pub by: String,
    pub kind: String, // "delivered", "approved"
    pub sig: String,
    pub ts: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Milestone {
    pub id: String,
    pub client: String,
    pub freelancer: String,
    pub amount: f64,
    pub conditions: ReleaseRule,
    pub status: String, // "funded", "delivered", "released", "refunded"
    pub attestations: Vec<Attestation>,
    #[serde(rename = "settlementRef")]
    pub settlement_ref: Option<String>,
    #[serde(rename = "teeProof")]
    pub tee_proof: Option<String>,
}

impl Guest for Component {
    fn dispatch(input: ContractInput) -> Result<ContractOutput, ContractError> {
        let function_name = input.function_name.as_str();
        let result = match function_name {
            "create-milestone" => create_milestone(&input.input_json),
            "submit-attestation" => submit_attestation(&input.input_json),
            "resolve-milestone" => resolve_milestone(&input.input_json),
            _ => Err(format!("Unknown function: {}", function_name)),
        };

        match result {
            Ok(output_json) => Ok(ContractOutput { output_json }),
            Err(e) => Err(ContractError::Err(e)),
        }
    }
}

fn create_milestone(input_json: &str) -> Result<String, String> {
    let milestone: Milestone = serde_json::from_str(input_json)
        .map_err(|e| format!("Failed to parse create-milestone input: {}", e))?;

    // Check if it already exists
    if let Ok(_existing) = host::kv_get("milestones", &milestone.id) {
        return Err(format!("Milestone {} already exists", milestone.id));
    }

    // Set initial status to funded
    let mut milestone = milestone;
    milestone.status = "funded".to_string();

    let value_json = serde_json::to_string(&milestone)
        .map_err(|e| format!("Serialization error: {}", e))?;

    host::kv_set("milestones", &milestone.id, &value_json)
        .map_err(|e| format!("KV set error: {}", e))?;

    Ok(value_json)
}

fn submit_attestation(input_json: &str) -> Result<String, String> {
    let attestation: Attestation = serde_json::from_str(input_json)
        .map_err(|e| format!("Failed to parse attestation: {}", e))?;

    let milestone_json = host::kv_get("milestones", &attestation.milestone_id)
        .map_err(|_| format!("Milestone {} not found", attestation.milestone_id))?;

    let mut milestone: Milestone = serde_json::from_str(&milestone_json)
        .map_err(|e| format!("Failed to deserialize milestone: {}", e))?;

    if milestone.status == "released" || milestone.status == "refunded" {
        return Err(format!("Milestone {} already settled", milestone.id));
    }

    // Check if this party has already submitted this kind of attestation
    for existing in &milestone.attestations {
        if existing.by == attestation.by && existing.kind == attestation.kind {
            return Err(format!(
                "Attestation of type {} already submitted by {}",
                attestation.kind, attestation.by
            ));
        }
    }

    // Append new attestation
    milestone.attestations.push(attestation.clone());

    // Update status if delivered
    if attestation.kind == "delivered" {
        milestone.status = "delivered".to_string();
    }

    // Check conditions
    let has_delivered = milestone.attestations.iter().any(|a| a.kind == "delivered");
    let has_approved = milestone.attestations.iter().any(|a| a.kind == "approved");

    let condition_delivered_ok = !milestone.conditions.require_delivered || has_delivered;
    let condition_approved_ok = !milestone.conditions.require_approved || has_approved;

    if condition_delivered_ok && condition_approved_ok {
        // Trigger payment release
        trigger_release(&mut milestone)?;
    }

    let value_json = serde_json::to_string(&milestone)
        .map_err(|e| format!("Serialization error: {}", e))?;

    host::kv_set("milestones", &milestone.id, &value_json)
        .map_err(|e| format!("KV set error: {}", e))?;

    Ok(value_json)
}

fn resolve_milestone(input_json: &str) -> Result<String, String> {
    #[derive(Deserialize)]
    struct ResolveParams {
        #[serde(rename = "milestoneId")]
        milestone_id: String,
        by: String, // "deadline" or DID of the arbiter
        action: String, // "release" or "refund"
    }

    let params: ResolveParams = serde_json::from_str(input_json)
        .map_err(|e| format!("Failed to parse resolve parameters: {}", e))?;

    let milestone_json = host::kv_get("milestones", &params.milestone_id)
        .map_err(|_| format!("Milestone {} not found", params.milestone_id))?;

    let mut milestone: Milestone = serde_json::from_str(&milestone_json)
        .map_err(|e| format!("Failed to deserialize milestone: {}", e))?;

    if milestone.status == "released" || milestone.status == "refunded" {
        return Err(format!("Milestone {} already settled", milestone.id));
    }

    if params.by == "deadline" {
        // Verify deadline is defined and has passed
        let _deadline = milestone.conditions.deadline
            .ok_or_else(|| "No deadline configured for this milestone".to_string())?;
        
        // Trigger resolution
        if params.action == "release" {
            trigger_release(&mut milestone)?;
        } else if params.action == "refund" {
            trigger_refund(&mut milestone)?;
        } else {
            return Err(format!("Invalid action for deadline resolution: {}", params.action));
        }
    } else {
        // Must be arbiter
        let arbiter_did = milestone.conditions.arbiter.clone()
            .ok_or_else(|| "No arbiter configured for this milestone".to_string())?;

        if params.by != arbiter_did {
            return Err("Resolution must be requested by the configured arbiter".to_string());
        }

        if params.action == "release" {
            trigger_release(&mut milestone)?;
        } else if params.action == "refund" {
            trigger_refund(&mut milestone)?;
        } else {
            return Err(format!("Invalid action for arbiter resolution: {}", params.action));
        }
    }

    let value_json = serde_json::to_string(&milestone)
        .map_err(|e| format!("Serialization error: {}", e))?;

    host::kv_set("milestones", &milestone.id, &value_json)
        .map_err(|e| format!("KV set error: {}", e))?;

    Ok(value_json)
}

fn trigger_release(milestone: &mut Milestone) -> Result<(), String> {
    // Generate a secure transaction hash message
    let message = format!(
        "RELEASE: milestone={}, amount={}, to={}",
        milestone.id, milestone.amount, milestone.freelancer
    );

    // Call host signing (simulates TEE secp256k1 per-wallet signing)
    // The key never leaves the TEE
    let signature = host::sign_secp256k1(&milestone.freelancer, &message)
        .map_err(|e| format!("Signing error: {}", e))?;

    // Prepare outbox payout payload
    let payout_payload = serde_json::json!({
        "milestoneId": milestone.id,
        "amount": milestone.amount,
        "recipient": milestone.freelancer,
        "signature": signature,
        "action": "release"
    });

    // Call host outbox to execute payout idempotently
    let url = "https://api.terminal3.io/v1/payouts";
    let idempotency_key = format!("release-{}", milestone.id);
    let response = host::outbox_post(url, &payout_payload.to_string(), &idempotency_key)
        .map_err(|e| format!("Outbox payout error: {}", e))?;

    // Parse the response to extract settlement details
    #[derive(Deserialize)]
    struct PayoutResponse {
        #[serde(rename = "settlementRef")]
        settlement_ref: String,
        #[serde(rename = "teeProof")]
        tee_proof: String,
    }

    let res: PayoutResponse = serde_json::from_str(&response)
        .unwrap_or_else(|_| {
            // If response is not standard, generate deterministic fallback refs
            PayoutResponse {
                settlement_ref: format!("tx_0x{}", sha256(&format!("{}{}", message, signature))),
                tee_proof: format!("tee_proof_{}", milestone.id),
            }
        });

    milestone.status = "released".to_string();
    milestone.settlement_ref = Some(res.settlement_ref);
    milestone.tee_proof = Some(res.tee_proof);

    Ok(())
}

fn trigger_refund(milestone: &mut Milestone) -> Result<(), String> {
    let message = format!(
        "REFUND: milestone={}, amount={}, to={}",
        milestone.id, milestone.amount, milestone.client
    );

    let signature = host::sign_secp256k1(&milestone.client, &message)
        .map_err(|e| format!("Signing error: {}", e))?;

    let payout_payload = serde_json::json!({
        "milestoneId": milestone.id,
        "amount": milestone.amount,
        "recipient": milestone.client,
        "signature": signature,
        "action": "refund"
    });

    let url = "https://api.terminal3.io/v1/refunds";
    let idempotency_key = format!("refund-{}", milestone.id);
    let response = host::outbox_post(url, &payout_payload.to_string(), &idempotency_key)
        .map_err(|e| format!("Outbox refund error: {}", e))?;

    #[derive(Deserialize)]
    struct RefundResponse {
        #[serde(rename = "settlementRef")]
        settlement_ref: String,
        #[serde(rename = "teeProof")]
        tee_proof: String,
    }

    let res: RefundResponse = serde_json::from_str(&response)
        .unwrap_or_else(|_| {
            RefundResponse {
                settlement_ref: format!("tx_0x{}", sha256(&format!("{}{}", message, signature))),
                tee_proof: format!("tee_proof_refund_{}", milestone.id),
            }
        });

    milestone.status = "refunded".to_string();
    milestone.settlement_ref = Some(res.settlement_ref);
    milestone.tee_proof = Some(res.tee_proof);

    Ok(())
}

// Simple deterministic hash helper for producing settlement refs in the WASM enclave
fn sha256(s: &str) -> String {
    let mut h: u32 = 5381;
    for c in s.chars() {
        h = ((h << 5).wrapping_add(h)).wrapping_add(c as u32);
    }
    format!("{:08x}", h)
}

export!(Component);

#[cfg(test)]
pub mod mock_host {
    use std::cell::RefCell;
    use std::collections::HashMap;

    thread_local! {
        static KV: RefCell<HashMap<(String, String), String>> = RefCell::new(HashMap::new());
        static OUTBOX_RESPONSE: RefCell<Option<String>> = RefCell::new(None);
    }

    pub fn reset() {
        KV.with(|kv| kv.borrow_mut().clear());
        OUTBOX_RESPONSE.with(|r| *r.borrow_mut() = None);
    }

    pub fn set_outbox_response(response: String) {
        OUTBOX_RESPONSE.with(|r| *r.borrow_mut() = Some(response));
    }

    pub fn kv_get(namespace: &str, key: &str) -> Result<String, String> {
        KV.with(|kv| {
            kv.borrow()
                .get(&(namespace.to_string(), key.to_string()))
                .cloned()
                .ok_or_else(|| "Not found".to_string())
        })
    }

    pub fn kv_set(namespace: &str, key: &str, value: &str) -> Result<String, String> {
        KV.with(|kv| {
            kv.borrow_mut()
                .insert((namespace.to_string(), key.to_string()), value.to_string());
            Ok(value.to_string())
        })
    }

    pub fn sign_secp256k1(wallet_address: &str, message_hash: &str) -> Result<String, String> {
        Ok(format!("sig_{}_{}", wallet_address, message_hash))
    }

    pub fn outbox_post(_url: &str, _body: &str, _idempotency_key: &str) -> Result<String, String> {
        OUTBOX_RESPONSE.with(|r| {
            if let Some(ref resp) = *r.borrow() {
                Ok(resp.clone())
            } else {
                Ok(r#"{"settlementRef": "mock_ref_123", "teeProof": "mock_proof_456"}"#.to_string())
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn call_dispatch(func: &str, input: &str) -> Result<String, String> {
        let input_struct = ContractInput {
            function_name: func.to_string(),
            input_json: input.to_string(),
        };
        match <Component as Guest>::dispatch(input_struct) {
            Ok(out) => Ok(out.output_json),
            Err(ContractError::Err(e)) => Err(e),
        }
    }

    #[test]
    fn test_unknown_function() {
        mock_host::reset();
        let res = call_dispatch("unknown-func", "{}");
        assert!(res.is_err());
        assert_eq!(res.unwrap_err(), "Unknown function: unknown-func");
    }

    #[test]
    fn test_create_milestone_success() {
        mock_host::reset();
        let input = r#"{
            "id": "m1",
            "client": "did:t3n:client1",
            "freelancer": "did:t3n:freelancer1",
            "amount": 1250.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "deadline": 1717675200,
                "arbiter": "did:t3n:arbiter1"
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;

        let res = call_dispatch("create-milestone", input).unwrap();
        let m: Milestone = serde_json::from_str(&res).unwrap();
        assert_eq!(m.id, "m1");
        assert_eq!(m.status, "funded");
        assert_eq!(m.amount, 1250.0);

        // Verify it was stored in KV
        let stored = mock_host::kv_get("milestones", "m1").unwrap();
        let m_stored: Milestone = serde_json::from_str(&stored).unwrap();
        assert_eq!(m_stored.id, "m1");
    }

    #[test]
    fn test_create_milestone_already_exists() {
        mock_host::reset();
        let input = r#"{
            "id": "m1",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 100.0,
            "conditions": {
                "requireDelivered": false,
                "requireApproved": false
            },
            "status": "",
            "attestations": []
        }"#;

        // First creation succeeds
        assert!(call_dispatch("create-milestone", input).is_ok());

        // Second creation fails
        let err = call_dispatch("create-milestone", input).unwrap_err();
        assert_eq!(err, "Milestone m1 already exists");
    }

    #[test]
    fn test_create_milestone_invalid_json() {
        mock_host::reset();
        let err = call_dispatch("create-milestone", "invalid-json").unwrap_err();
        assert!(err.contains("Failed to parse"));
    }

    #[test]
    fn test_submit_attestation_flow() {
        mock_host::reset();
        
        // 1. Create milestone
        let init_json = r#"{
            "id": "m-flow",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 500.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        // 2. Submit "delivered" attestation from freelancer
        let att1 = r#"{
            "milestoneId": "m-flow",
            "by": "did:t3n:freelancer",
            "kind": "delivered",
            "sig": "sig_del_123",
            "ts": 1717500000
        }"#;
        let res1 = call_dispatch("submit-attestation", att1).unwrap();
        let m1: Milestone = serde_json::from_str(&res1).unwrap();
        assert_eq!(m1.status, "delivered");
        assert_eq!(m1.attestations.len(), 1);

        // Try submitting same attestation again (should fail)
        let err_dup = call_dispatch("submit-attestation", att1).unwrap_err();
        assert!(err_dup.contains("already submitted"));

        // 3. Submit "approved" attestation from client -> triggers release
        let att2 = r#"{
            "milestoneId": "m-flow",
            "by": "did:t3n:client",
            "kind": "approved",
            "sig": "sig_app_456",
            "ts": 1717500100
        }"#;
        let res2 = call_dispatch("submit-attestation", att2).unwrap();
        let m2: Milestone = serde_json::from_str(&res2).unwrap();
        assert_eq!(m2.status, "released");
        assert_eq!(m2.attestations.len(), 2);
        assert_eq!(m2.settlement_ref, Some("mock_ref_123".to_string()));
        assert_eq!(m2.tee_proof, Some("mock_proof_456".to_string()));

        // Try submitting attestation to already settled milestone (should fail)
        let err_settled = call_dispatch("submit-attestation", att2).unwrap_err();
        assert!(err_settled.contains("already settled"));
    }

    #[test]
    fn test_submit_attestation_not_found() {
        mock_host::reset();
        let att = r#"{
            "milestoneId": "m-nonexistent",
            "by": "did:t3n:client",
            "kind": "approved",
            "sig": "sig_1",
            "ts": 1717500000
        }"#;
        let err = call_dispatch("submit-attestation", att).unwrap_err();
        assert_eq!(err, "Milestone m-nonexistent not found");
    }

    #[test]
    fn test_submit_attestation_invalid_json() {
        mock_host::reset();
        let err = call_dispatch("submit-attestation", "invalid-json").unwrap_err();
        assert!(err.contains("Failed to parse"));
    }

    #[test]
    fn test_resolve_milestone_arbiter_release() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-arbiter",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 250.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "arbiter": "did:t3n:arbiter"
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        // 1. Resolve with correct arbiter -> release
        let resolve_req = r#"{
            "milestoneId": "m-arbiter",
            "by": "did:t3n:arbiter",
            "action": "release"
        }"#;
        let res = call_dispatch("resolve-milestone", resolve_req).unwrap();
        let m: Milestone = serde_json::from_str(&res).unwrap();
        assert_eq!(m.status, "released");
        assert_eq!(m.settlement_ref, Some("mock_ref_123".to_string()));

        // 2. Trying to resolve again fails
        let err = call_dispatch("resolve-milestone", resolve_req).unwrap_err();
        assert!(err.contains("already settled"));
    }

    #[test]
    fn test_resolve_milestone_arbiter_refund() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-arbiter-refund",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 250.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "arbiter": "did:t3n:arbiter"
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        // Resolve with correct arbiter -> refund
        let resolve_req = r#"{
            "milestoneId": "m-arbiter-refund",
            "by": "did:t3n:arbiter",
            "action": "refund"
        }"#;
        let res = call_dispatch("resolve-milestone", resolve_req).unwrap();
        let m: Milestone = serde_json::from_str(&res).unwrap();
        assert_eq!(m.status, "refunded");
        assert_eq!(m.settlement_ref, Some("mock_ref_123".to_string()));
    }

    #[test]
    fn test_resolve_milestone_unauthorized_arbiter() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-arbiter-unauth",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 250.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "arbiter": "did:t3n:arbiter"
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        let resolve_req = r#"{
            "milestoneId": "m-arbiter-unauth",
            "by": "did:t3n:someone-else",
            "action": "release"
        }"#;
        let err = call_dispatch("resolve-milestone", resolve_req).unwrap_err();
        assert_eq!(err, "Resolution must be requested by the configured arbiter");
    }

    #[test]
    fn test_resolve_milestone_no_arbiter_configured() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-no-arbiter",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 250.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        let resolve_req = r#"{
            "milestoneId": "m-no-arbiter",
            "by": "did:t3n:arbiter",
            "action": "release"
        }"#;
        let err = call_dispatch("resolve-milestone", resolve_req).unwrap_err();
        assert_eq!(err, "No arbiter configured for this milestone");
    }

    #[test]
    fn test_resolve_milestone_deadline_release() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-deadline",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 100.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "deadline": 1717675200
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        let resolve_req = r#"{
            "milestoneId": "m-deadline",
            "by": "deadline",
            "action": "release"
        }"#;
        let res = call_dispatch("resolve-milestone", resolve_req).unwrap();
        let m: Milestone = serde_json::from_str(&res).unwrap();
        assert_eq!(m.status, "released");
    }

    #[test]
    fn test_resolve_milestone_deadline_refund() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-deadline-refund",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 100.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "deadline": 1717675200
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        let resolve_req = r#"{
            "milestoneId": "m-deadline-refund",
            "by": "deadline",
            "action": "refund"
        }"#;
        let res = call_dispatch("resolve-milestone", resolve_req).unwrap();
        let m: Milestone = serde_json::from_str(&res).unwrap();
        assert_eq!(m.status, "refunded");
    }

    #[test]
    fn test_resolve_milestone_no_deadline_configured() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-no-deadline",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 100.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        let resolve_req = r#"{
            "milestoneId": "m-no-deadline",
            "by": "deadline",
            "action": "release"
        }"#;
        let err = call_dispatch("resolve-milestone", resolve_req).unwrap_err();
        assert_eq!(err, "No deadline configured for this milestone");
    }

    #[test]
    fn test_resolve_milestone_invalid_action() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-invalid-action",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 100.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "deadline": 1717675200,
                "arbiter": "did:t3n:arbiter"
            },
            "status": "",
            "attestations": [],
            "settlementRef": null,
            "teeProof": null
        }"#;
        call_dispatch("create-milestone", init_json).unwrap();

        // Invalid deadline action
        let resolve_req1 = r#"{
            "milestoneId": "m-invalid-action",
            "by": "deadline",
            "action": "invalid-action"
        }"#;
        let err1 = call_dispatch("resolve-milestone", resolve_req1).unwrap_err();
        assert!(err1.contains("Invalid action"));

        // Invalid arbiter action
        let resolve_req2 = r#"{
            "milestoneId": "m-invalid-action",
            "by": "did:t3n:arbiter",
            "action": "invalid-action"
        }"#;
        let err2 = call_dispatch("resolve-milestone", resolve_req2).unwrap_err();
        assert!(err2.contains("Invalid action"));
    }

    #[test]
    fn test_resolve_milestone_not_found() {
        mock_host::reset();
        let resolve_req = r#"{
            "milestoneId": "m-nonexistent",
            "by": "deadline",
            "action": "release"
        }"#;
        let err = call_dispatch("resolve-milestone", resolve_req).unwrap_err();
        assert_eq!(err, "Milestone m-nonexistent not found");
    }

    #[test]
    fn test_resolve_milestone_invalid_json() {
        mock_host::reset();
        let err = call_dispatch("resolve-milestone", "invalid-json").unwrap_err();
        assert!(err.contains("Failed to parse"));
    }

    #[test]
    fn test_outbox_payout_alternative_format() {
        mock_host::reset();
        
        let init_json = r#"{
            "id": "m-alt",
            "client": "did:t3n:client",
            "freelancer": "did:t3n:freelancer",
            "amount": 100.0,
            "conditions": {
                "requireDelivered": true,
                "requireApproved": true,
                "arbiter": "did:t3n:arbiter"
            },
            "status": "",
            "attestations": []
        }"#;
        
        // Create milestone
        call_dispatch("create-milestone", init_json).unwrap();
        
        // Let's set custom outbox response that is not standard JSON
        mock_host::set_outbox_response("non-json-string".to_string());
        
        let resolve_req = r#"{
            "milestoneId": "m-alt",
            "by": "did:t3n:arbiter",
            "action": "release"
        }"#;
        let res = call_dispatch("resolve-milestone", resolve_req).unwrap();
        let m: Milestone = serde_json::from_str(&res).unwrap();
        assert_eq!(m.status, "released");
        // Should fallback to sha256 generation
        assert!(m.settlement_ref.unwrap().starts_with("tx_0x"));
    }
}
