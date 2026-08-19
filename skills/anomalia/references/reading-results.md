# Reading Anomalia's results honestly

Anomalia does not hand back a number and leave you to interpret it. Several results carry an
explicit statement of **what the number can and cannot support**, and an agent that ignores those
fields will confidently report something the data does not say — which is worse than reporting
nothing, because the user acts on it.

Read this before summarising any audit, recap or campaign read to a user.

---

## 1. A score and its coverage are two numbers

Scores across the product (`article`, `geo.citability`, video review) come from a four-verdict
model, never two: **pass / fail / unknown / n.a.**

- An `unknown` means *nobody looked*. It costs **coverage**, never score.
- An `na` means the question does not apply to this subject (alt text on an article with no
  images) and leaves the calculation entirely.

Coverage decides what may be reported at all:

| Inspected weight | What you may say |
|---|---|
| ≥ 80% (`tier: "full"`) | The score, stated over its denominator |
| 60-79% (`tier: "provisional"`) | The score, **labelled provisional**, naming what was not inspected |
| < 60% (`tier: "ungraded"`) | **No score.** Report the findings and say the evidence is insufficient |

**A `score` of `null` is not a zero and not a failure.** Never substitute another number for it —
in particular never report `tech_score` when `citability.score` is null.

---

## 2. GEO: citability, not tech score

`get_geo` returns two different numbers and they answer different questions.

- `citability.score` — will a model **cite** us? Five weighted levers: extractability 25%,
  evidence 25%, entity clarity 20%, corroboration 20%, machine access 10%.
- `audit.tech_score` — can a **crawler reach** us? That is the machine-access lever alone: **10%**
  of the answer. A site can score 95 here and never be named in an answer.

When the user asks about AI visibility, lead with citability.

**Two citation events, two fixes.** `audit.share_of_voice` is how often the brand was **named** in
an answer; `citability.domainCitedShare` is how often its **own domain was cited as a source**.
A brand can be named constantly and linked never. Being named is won on third-party sources; being
cited is won on the page. Do not merge them into one number.

**Lead with the binding constraint.** `citability.bindingConstraint` names the one lever actually
limiting citation. Fixing the other four moves nothing until it is addressed, so a to-do list that
does not start there is misleading. `citability.priorities` is already ranked; keep the order.

**Anti-citation signals are disqualifiers.** `citability.antiSignals` are things that block citation
regardless of how good the levers are — a CTA density that reads as a funnel step, an interstitial
over the content, undated claims. Removing one is usually cheaper than adding anything.

**Never promise citation.** `citability.disclaimer` explains why: no engine publishes its criteria,
citation is non-deterministic, and the score is a heuristic. Pass it through — do not paraphrase it
into a promise. Promise extractability, evidence density and entity consistency, which the client
controls.

**Do not re-run an audit to "check" a result.** Each question is already asked several times per
engine precisely because a single observation is noise.

---

## 3. Ads: read the diagnosis before recommending anything

Every campaign in `get_ads` carries `fatigue`, which says **why** the numbers moved:

| `fatigue.id` | What it means | What NOT to do |
|---|---|---|
| `tracking_failure` | Clicks and conversions collapsed together at flat cost | Do not touch creative. Check the pixel first. |
| `creative_fatigue` | CTR down, cost flat, frequency up | Do not ship new executions of the same concept — the argument is what exhausted |
| `audience_exhaustion` | Everything decaying with cost and frequency rising | Do not make new creative; the pool is too small |
| `auction_pressure` | Cost up, CTR unchanged | Do not treat it as a creative problem |
| `post_click` | Conversions down, click behaviour unchanged | Do not rewrite ads |
| `message_match` | Both rates sliding at flat cost and frequency | The ad promises what the page does not keep |
| `bad_concept` | Flat-poor with frequency never rising | It is not fatigue; nobody saw it twice |
| `learning_reset` | Creative or budget changed inside the window | Conclude nothing from these numbers |
| `insufficient_data` | Below the volume floor | Say there is nothing to diagnose yet |
| `healthy` | Nothing decaying | Do not remake what is working |

These call for **opposite** actions. Prescribing new creative for an audience-size problem burns a
production cycle and changes nothing; prescribing it for a broken pixel is worse.

`fatigue.wouldChangeMyMind` states what would overturn the read. Include it — a diagnosis without
its falsifier is a claim, not an analysis.

**Longevity and spend are inference, not measurement.** Sustained spend means someone kept funding
it. Say so when using it as a signal.

---

## 4. Analytics: never declare a winner the sample cannot support

Weekly reads carry an evidence block: level (1-6), sample, window, what it **can** and **cannot**
support, and the cheapest next observation.

- Under ~10 observations there is nothing to read. "Not enough signal to rank these, here is what to
  run to get it" is a **legitimate and often correct answer**, not a failure.
- Under ~50 it is directional. Say so, and attach the confidence.
- Ship reversible changes (a caption, a slot, next week's brief) on a directional read. Demand real
  evidence for irreversible ones (pricing, positioning, killing a format).
- A drop from last period's best performer is partly **arithmetic**, not fatigue.
- Impressions and views measure the algorithm's distribution decision, not the content's value.
  Weight replies, saves, profile visits and DMs.
- Never compute a precision the inputs do not have. "Roughly 3x" is honest; "2.94x" is theatre.

Every report ends with **what could not be determined**. Pass it through. A stated gap is credible;
the same report without it reads as complete when it is not.

---

## 5. Copy: `[NEED: …]` is a blocker, not a typo

The generators are forbidden from inventing statistics, testimonials, customer names or case
studies — even as placeholders. Where a claim needs a number nobody supplied, the caption carries a
literal `[NEED: what is missing]` marker.

- The marker **blocks publishing**. `approve_posts` and the scheduler will refuse the post.
- The fix is to **supply the fact**. Never edit the marker out: deleting it does not supply the
  number, it converts an honest gap into an unsupported claim published under the brand's name.
- If the user cannot supply it, rewrite the caption so it no longer needs the claim.

Ask the user for the missing figure, naming exactly what the marker asks for.
