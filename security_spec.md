# Firestore Security Specification

## Data Invariants
1. A user can only read and write their own profile and history.
2. News items must have a unique ID, headline, spot, and content.
3. Created timestamps must be server-generated.
4. User IDs in paths must match the authenticated user's UID.

## The "Dirty Dozen" Payloads (Target: DENY)

1. **Identity Spoofing**: Attempt to write to another user's history.
   - Path: `/users/victim_uid/history_changed/item_1`
   - Auth: `uid: attacker_uid`
2. **Shadow Field Injection**: Adding `isAdmin: true` to a news item.
   - Payload: `{ ..., isAdmin: true }`
3. **Invalid ID Poisoning**: Using a very large/illegal string as document ID.
   - Path: `/users/uid/history_changed/VERY_LONG_STRING...`
4. **Timestamp Forgery**: Providing a client-side `createdAt` timestamp.
   - Payload: `{ ..., createdAt: "2020-01-01T00:00:00Z" }`
5. **Type Confusion**: Sending `content` as an array instead of string.
   - Payload: `{ ..., content: ["bad", "data"] }`
6. **Missing Required Fields**: Creating news without `spot`.
   - Payload: `{ formattedHeadline: "X", content: "Y" }`
7. **Cross-User Retrieval**: Authenticated user trying to `get` another user's document.
   - Path: `/users/other_user/history_changed/doc1`
8. **PII Leakage**: Unauthenticated user trying to read user profiles.
   - Auth: `null`
9. **Resource Exhaustion**: Sending a 1MB string in `formattedHeadline`.
   - Payload: `{ formattedHeadline: "A".repeat(1000000) }`
10. **State Corruption**: Updating a finished news item with illegal characters in ID.
11. **Email Spoofing (if used)**: Setting email to admin email without verification.
12. **Blanket Query**: Requesting `list` on `/users` collection directly.

## Test Implementation
I will implement `firestore.rules` to prevent these.
