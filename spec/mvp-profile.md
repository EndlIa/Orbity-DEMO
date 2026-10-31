# Orbity MVP profile (working agreement)

This profile describes the current prototype workflow. It does not replace or weaken the normative `orbity/0.1` manifest schema. A file produced by Adapter Lab as `orbity.draft.json` is a review artifact and is not a certified bundle manifest.

## In scope now

The MVP accepts an object asset whose source can be wrapped as a synchronous factory and whose host boundary can be reviewed. The minimum practical entry shape is:

```ts
create(host?) -> { root: THREE.Object3D, dispose(): void, tick?(dt: number): void }
```

The prototype records source bytes, dependencies, provenance, selected export rule and review findings. It does not execute uploaded source during analysis.

## Deferred extensions

These fields remain in the formal draft for future certification, but are deferred in the current product flow:

- `params` and editability tiers
- `bounds` and real-world `units`
- animation claims and deterministic frame checks
- sockets, pivots and colliders
- integrity publishing and registry resolution

A draft may leave these values unresolved. The UI must label that state as `draft` or `not certified`; it must not present missing values as verified capabilities. Studio may keep its internal parameter controls for built-in demo assets, but those controls are not evidence that an imported asset declares protocol parameters.

## Simple applications

A small Three.js showcase application may be identified and exported as a read-only review package. The package keeps the original source and a migration checklist. It has no executable Orbity application entry until the host contract is intentionally designed.

## Out of scope

The MVP does not provide accounts, cloud storage, backend persistence, remote registry resolution, real Fork/commit history, arbitrary code execution, network-enabled assets or complex application migration.
