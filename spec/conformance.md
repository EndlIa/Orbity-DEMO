# Conformance 0.1

A check is either **MUST** (failure rejects the bundle or composition) or **SHOULD**
(reported, does not reject). Every check below is mechanically decidable. Checks that
need rendering run in the sandbox host described in C6.

`orbity conformance <digest|dir|composition.json>` runs all applicable checks.

## C1 — schema

- MUST validate the manifest against `manifest.schema.json`.
- MUST validate the composition against `composition.schema.json`.
- MUST reject unknown keys. `additionalProperties: false` is not advisory.

## C2 — component, not application

Static analysis of the entry module, then a runtime probe.

- MUST NOT construct `WebGLRenderer`, `PerspectiveCamera`, `OrthographicCamera`.
- MUST NOT call `requestAnimationFrame`, `setAnimationLoop`, `setInterval`.
- MUST NOT touch `document`, `window.devicePixelRatio`, or create native canvases.
  Host-mediated texture drawing is allowed through the restricted texture interface.
- MUST NOT perform network I/O: no `fetch`, `XMLHttpRequest`, `import()` of remote URLs,
  `new Worker(remote)`.
- MUST export `create(): OrbityInstance` with `root: THREE.Object3D` and idempotent
  `dispose(): void`. If `capabilities.tick` is `true`, the instance MUST provide
  `tick(dt: number): void`. After disposal tick MUST have no effect.
- Runtime probe: mount twice in the same host; two mounts MUST NOT share mutable state. Advance one instance and verify the
  other is unchanged; dispose one and verify the other remains usable.

## C3 — geometry and sockets

- The instance root MUST be a single rooted object. Multiple roots or a bare `Mesh` with siblings are
  accepted only if wrapped; otherwise the host cannot place it.
- MUST be within `bounds` when scaled by `units`. Tolerance 2%. `bounds` is framing
  metadata, so exceeding it means the field is wrong, not the model.
- Every declared socket: MUST be reachable on the returned hierarchy by name; its world
  position MUST be inside `bounds`. A socket that cannot be located fails the tier.
- `pivots` MAY be unresolved; they are advisory in 0.1.

## C4 — editability tier

This is the check that makes `edit: "params"` mean something.

For `edit: "params"`:

- MUST have ≥1 param (schema).
- For each param independently, holding all others at `default`:
  - render at `min` and at `max`
  - hash quantised `position`/`normal` buffer data and material identity of every
    descendant, order-independent
  - MUST differ from the hash at `default`
- A single inert param **fails the whole tier**: the registry ingests the bundle as
  `sockets`, and the downgrade is recorded and shown on the bundle page.
- `default` MUST lie inside `[min, max]` for numeric params, and be a member of `values`
  for `enum` params. This is not expressible in JSON Schema (it compares across fields),
  so it is enforced here and only here. Do not assume a schema-valid manifest has a sane
  default.

For `edit: "sockets"`: MUST have ≥1 socket or pivot and MUST NOT have `params`.
For `edit: "static"`: neither.

Rationale: a declared-but-inert control is a false affordance. Discovery surfaces tier as
a filter, so the failure mode of a lying manifest is invisible in the worst place.

## C5 — integrity

- Two independent packers (at least one not authored by orbity) MUST produce the same
  `integrity` for the same tree. Byte-exact packing, no line-ending normalisation.
- The exclusion list MUST be exactly the normative set in `spec/README.md §4.1`.
- Packing a tree containing a symlink escaping the root MUST fail.
- Re-packing an unpacked bundle MUST reproduce the digest.

## C6 — sandbox

Host requirements, not bundle requirements:

- MUST run bundle code in an `iframe` with `sandbox="allow-scripts"` and MUST NOT grant
  `allow-same-origin`. No exception.
- MUST apply `default-src 'none'`; script and asset origins are served by the host only.
- MUST deny network egress unless the bundle declares it. 0.1 has no egress declaration,
  so egress is always denied.
- MUST enforce a frame-time budget and MUST suspend a bundle that exceeds it (this is the
  WebGL compute / mining case, which is reachable from a `fragmentShader` alone).
- MUST NOT expose host globals to the bundle realm.

## C7 — determinism

- Same digests + same transforms + same params + same seeds + same host environment
  ⇒ identical frames. Render twice, compare frame hashes. MUST match.
- Any unseeded random source MUST be reported as a failure, not a warning.

## C8 — composition resolution

- Every `integrity` MUST resolve. A composition referencing a missing digest is invalid;
  there is no "latest" fallback.
- `version` MUST equal the resolved manifest's `version`.
- `attach.to` MUST be a strictly smaller index than the instance carrying it.
- Every key in `params` MUST exist in the target manifest. Unknown key fails; there is no
  silent ignore.
- Attachment MUST land the instance's socket within tolerance of the host socket frame.

## Not checked in 0.1

Aesthetics, polygon budget, texture resolution, license validity, spam, and content
moderation. Listing these explicitly so no reader assumes the spec is a quality claim.
