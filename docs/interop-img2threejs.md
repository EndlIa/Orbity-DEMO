# Interop proposal: an `orbity` emission target for img2threejs

Status: draft, not yet submitted upstream. Target repo: `img2threejs/img2threejs`
(Apache-2.0, v2.0.0), contract reference: `docs/EMISSION_TARGET_SOCKET.md`.

## Why this fits their existing contract

`EMISSION_TARGET_SOCKET.md` states the design rule the exporter must obey:

> a target is an addition, never a replacement. With no `--target` the export step is a
> no-op that returns before any registry read.

An `orbity` target is exactly that shape: it writes one extra artifact beside
`src/createObjectModel.ts` and changes nothing on the default path. Concretely it needs
only what their socket already provides — `targets.py` resolution, bounded subprocess,
`verify`-by-kind, run ×2 determinism, provenance. No base changes, no fragment splicing,
no `overrides` machinery.

## What it emits

`orbity.json` beside the existing TypeScript output:

```json
{
  "spec": "orbity/0.1",
  "id": "<owner>/<object-slug>",
  "version": "0.0.0",
  "entry": "src/createObjectModel.ts",
  "units": "m",
  "bounds": [0.4, 0.9, 0.35],
  "capabilities": { "edit": "params", "ownsWorld": false, "tick": false },
  "params": [ /* from object-sculpt-spec.json */ ],
  "sockets": [ /* from the emitted runtime hierarchy */ ],
  "pivots": [ /* same */ ],
  "provenance": {
    "generator": "img2threejs",
    "generatorVersion": "2.0.0",
    "gates": { "passed": 8, "total": 8, "profile": "generic" }
  },
  "license": "Apache-2.0"
}
```

## Where params come from — and where they must not

**From `object-sculpt-spec.json`, not from the emitted TypeScript.**

`EMISSION_TARGET_SOCKET.md` calls the spec "the architecture's real fork point" with 12
non-test consumers. Dimensions, proportions, material regions and measured surfaces are
already represented there; the emitter is one consumer of that data. A `params` block is
therefore a *deterministic projection of an existing structure*, not an inference.

Explicitly rejected: scanning the generated `.ts` for numeric literals. `1.2` may be a
radius, a segment count, a colour scale or a magic constant. A wrongly-labelled slider is
worse than no slider, and orbity's conformance suite rejects it (C4) anyway — the target
would be shipping output that cannot be published at the `params` tier, which is a bad
look for both projects.

If the spec does not carry a parameter, the honest output is `"edit": "sockets"`. The
target MUST NOT fabricate a tier.

## Sockets and provenance

Sockets and pivots already exist in the emitted hierarchy (their README: "a runtime
hierarchy (pivots, sockets, colliders) so the result is ready to animate"). The target
serialises the same names and frames into the manifest. orbity deliberately adopted their
vocabulary rather than coining `anchors`, so no translation layer is needed.

`provenance.gates` maps onto the pass loop's existing verdicts. orbity surfaces it as
search and trust metadata, which is something no other asset registry has: a bundle can be
filtered by "all gates passed" rather than by star count.

## Determinism

Already required by their socket ("determinism: run ×2 · cached by sha+spec-hash"). The
orbity target adds only the content digest from `spec/README.md §4.1`, computed over the
packed tree byte-exactly. Their run ×2 check then also covers the manifest, for free.

## Failure paths, named

| failure | behaviour |
| --- | --- |
| sculptor spec has no parameterisable fields | emit `edit: "sockets"`, log that the tier was downgraded |
| a socket name collides after sanitisation | fail loudly, name both; do not rename silently |
| `units` absent from the spec | fail; do not assume metres |
| digest mismatch across run ×2 | fail, naming the file that differs |

No silent fallback, matching their socket contract.

## What orbity gives back

- A publish path: `orbity publish` takes the emitted bundle, runs C1–C5, and returns a
  digest-addressed URL plus an embeddable viewer.
- A composition demo: placing generated assets by socket into one scene with pinned
  digests — the assembly story their per-model sockets were built for but currently have
  no consumer for.
- A conformance suite that verifies third-party implementations, so the format is not
  defined by one codebase.

## Open questions for upstream

1. Does `object-sculpt-spec.json` already carry explicit dimension/proportion fields, or
   only measurements consumed by the draw calls? This decides whether `params` is a
   projection or requires a small spec change.
2. Should `bounds` come from the spec or be measured from the built object? Measured is
   more truthful; specified is cheaper.
3. Is a per-object `license` field already tracked anywhere in the pipeline?
