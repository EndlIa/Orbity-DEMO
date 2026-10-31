# orbity spec 0.1 (draft)

Normative. A **bundle** is a code-only 3D component. A **composition** is a pinned
assembly of bundles. A **registry** stores bundles by content digest.

Status: draft, partial reference implementation and tooling; full conformance is not implemented. Changes are breaking until `0.1` is frozen.

The current prototype follows the separate [MVP profile](./mvp-profile.md): Adapter Lab drafts are review artifacts, while parameters, bounds, units and animation claims remain deferred product extensions. The normative schema below is intentionally unchanged until a breaking profile decision is made.

## 1. Bundle = component, never application

A bundle MUST NOT create a renderer, a camera, a render loop, or a DOM container.
`capabilities.ownsWorld` is always `false`; there is no other legal value.
The host owns camera, input, environment, tone mapping, post-processing, and the tick.

| Host owns | Bundle declares |
| --- | --- |
| camera, controls | — |
| lighting, environment, exposure | `env.prefersEnv` (advisory) |
| the single animation tick | `capabilities.tick: true` + instance `tick(dt)` |
| post-processing stack | — |
| scene placement | `bounds` (AABB half-extents, in `units`) |

Units are mandatory and mean real-world scale. Composition without units is rejected.

## 2. Editability tiers

`capabilities.edit` is one of:

| tier | obligation | verified by |
| --- | --- | --- |
| `params` | ≥1 entry in `params`; every entry is consumed | C4: each param must change the output at min and at max |
| `sockets` | no `params`; ≥1 socket or pivot | C3: declared sockets resolve and are inside `bounds` |
| `static` | neither | C3 partial: placement only |

Tiers are **derived by conformance, not trusted from the author**. A declared `params`
tier with an inert parameter is a failing bundle; a bundle that fails C4 is downgraded
to `sockets` at registry ingest, never silently accepted as `params`.

`params` MUST NOT be inferred from source code by any adapter. Heuristic recovery of
numeric literals produces unavailable controls, which is worse than no controls.
Parameters have exactly two legitimate origins:

1. the generator emits them from its own spec (preferred), or
2. the author writes them.

## 3. Sockets

Vocabulary is aligned with the img2threejs emitter so that its output is directly
publishable: `sockets`, `pivots`, `colliders`.

A socket is a named frame on the bundle, expressed in the bundle's local space and in
`units`. Composition may only attach to declared sockets, or place by transform.

`kind` is advisory for UI grouping and for `accepts` matching; it carries no solver
semantics. This spec has **no constraint solver and no mates**. Assembly is:
transform, or attach-to-socket, and nothing else.

## 4. Integrity

`integrity` is the only way to reference content. Semantic version ranges are a query
input for tooling and never appear in a stored document.

### 4.1 canonical digest

```
payload  := concat over files sorted by path (UTF-8 byte order) of:
              lowercase_hex(sha256(file_bytes)) + " " + path + "\n"
integrity := "sha256-" + base64(sha256(payload))
```

Rules:

- **Byte-exact.** No line-ending normalisation, no re-encoding, no comment stripping.
  Text detection is heuristic and would make digests depend on the tool, so it is
  forbidden. Packers MUST pack from a clean checkout with `core.autocrlf=false`; the
  conformance suite checks that two independent packers agree.
- **Normative exclusions**, fixed for this spec version: `.git/**`, `node_modules/**`,
  `.orbity/**`, `.DS_Store`, `Thumbs.db`. Nothing else may be excluded, and no packer
  config can extend the list.
- **Manifest formatting is normative.** `orbity.json` MUST be written with sorted keys,
  UTF-8 without BOM, LF line endings, and 2-space indent, with exactly one trailing LF. This removes the need for a
  canonical-JSON algorithm.
- The manifest is inside the digest. A bundle cannot carry its own digest; it is
  computed at pack time and stored by the publisher.

## 5. Composition

A composition is a document, not an editor mode. Forking a composition means forking a
small JSON file; it is therefore diffable, reviewable, and CI-checkable.

- Every instance pins `integrity`. `version` is informational; a mismatch between the
  pinned digest and the resolved manifest's `version` is a hard failure.
- Transitive dependencies obey the same rule: a bundle that depends on another bundle
  embeds the pinned digest. The host never resolves.
- `attach.to` MUST reference an earlier instance index (no cycles, forward refs illegal).
  This is not expressible in JSON Schema and is checked by the conformance tool.
- Each instance may carry `seed`. Given the same digests, transforms, params, seeds and
  a fixed host environment, two runs MUST produce identical frames (C7).

## 6. Files

- `manifest.schema.json` — bundle interface
- `composition.schema.json` — assembly document
- `conformance.md` — the checks that make the above real

## 7. Open

- Digest of a bundle whose manifest declares `deps`: no registry-record field yet for
  the resolution that produced it.
- `env.prefersEnv` vocabulary is unversioned.
- No decision yet on whether `colliders` are ever host-consumed. Currently declared-only.

## Instance lifecycle

The entry module exports synchronous `create(host)` returning an instance:

```ts
interface OrbityInstance {
  root: THREE.Object3D;
  tick?: (dt: number) => void;
  dispose: () => void;
}
```

`tick` is required when `capabilities.tick` is true. The host passes finite,
nonnegative seconds. Each instance owns its elapsed time and mutable state.
`dispose()` is required, idempotent, detaches the root and releases instance-owned
resources. After disposal, tick has no effect. Shared resources require explicit
reference ownership; disposing one instance MUST NOT invalidate another.
The host MUST call dispose when an instance is removed. `create` MUST NOT store
the current instance in module-level mutable state. Parameter editing remains
subject to C4; this lifecycle change does not infer parameters.

## Host texture drawing (draft)

`create(host)` may request `host.createTexture({width, height}, draw)`. The host
invokes draw synchronously with a restricted drawing facade and returns a Three.js
pixel texture. The returned image contains pixel data, never a native canvas. The facade supports clearRect, strokeRect, arc, beginPath, stroke,
fillText, measureText (width only), fillStyle, strokeStyle, font, textAlign,
textBaseline and lineWidth. It MUST NOT expose canvas, native contexts, image
loading, pixel reads, DOM or network access. Drawing handles expire when draw returns.

The reference host limits dimensions to 2048, concurrent pixels to 4,194,304,
text to 4096 characters per call and operations to 20,000 per texture. Hosts own
the texture allocation budget; instance disposal releases its textures. This API
is a capability interface, not a sandbox. C6 isolation and frame budgets remain
required for untrusted code. Font availability and rasterization are part of the
fixed host environment for C7.

The host supplies a separate texture scope to each create(host) call, disposes the scope if creation fails, and disposes it after the instance is removed. Texture allocations from one instance MUST NOT consume another instance's scope.
