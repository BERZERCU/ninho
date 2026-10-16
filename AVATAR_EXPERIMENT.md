# Avatar experiment — QA only

This branch targets Supabase `mqpjujirwooqzzirzwrr`. Do not merge its QA configuration into `main`, promote its Vercel preview to production, or apply its experimental SQL to the original database.

## Behavior

- All family members receive a starter avatar and free skin tones, shirt, hair and no-accessory option.
- A task earns points once, for its assignee. An unassigned task rewards the authenticated member who completes it.
- Free earns 1 point; simulated Ninho+ earns 2 for subsequent first completions. No retroactive multiplier.
- Already-completed tasks are consumed without rewards. Reopening, deleting or recreating the same task ID does not mint another reward.
- Purchases and balances are enforced in PostgreSQL. A wallet row lock serializes spending; repeated requests for an already-owned item do not charge again.
- Clothing and points belong to the account and remain when changing family or simulation mode. Only the account owner can spend or equip their inventory.
- Current family members can see each other's avatar, without seeing other people's balances or inventory.
- Only the family's Admin can simulate the free/plus modes. Simulation does not change `families.plan`, billing or real subscriptions.

## Deployment boundaries

The additive QA migration is deliberately outside `supabase/migrations`, under `supabase/experiments/migrations`. The browser module also checks both the explicit experiment flag and the exact QA backend URL before initializing.

No real purchases, payment integration or production changes are included. Prices and designs are experimental. Task editing by adults remains possible; this version prevents duplicate completion rewards, rather than attempting to police whether a real-world chore happened.

## Validation

- PostgreSQL migration and SQL security fixtures pass locally with PGlite 0.3.14.
- The migration and transactional fixtures pass on the QA Supabase project; fixtures roll back.
- Node tests cover deterministic SVG, malicious style fallback and the original-backend initialization guard.
- Existing child, tutorial, closure, notifications and backup tests run on this branch.
- Interactive browser validation remains pending. Local browser binaries were unavailable in this environment; avatar vectors were rendered and visually inspected separately.

## Manual QA

1. Sign in with a test family and open **Meu avatar** on Today or in Settings.
2. Create a fresh task assigned to the member being tested; complete it. Check +1.
3. Reopen and complete it again. Balance must not increase.
4. As Admin, open the avatar panel's **Experimentar o plano Ninho+** and select simulated plus.
5. Complete another fresh assigned task. Check +2 for the assignee, including a child member.
6. In **Lojinha**, exchange points for clothing, then select **Vestir** in the wardrobe. Reload and check persistence.
7. Return to simulated free. Owned clothes and the remaining balance must remain.
8. Try a purchase with insufficient points and a child attempt to change the simulation. Both must be blocked.
9. Check the avatar in the family members list from another test account; it refreshes on focus and periodic membership refresh.

Promotion to the original requires separate approval after user validation and a production entitlement design for the 2× bonus.

## Ninho+ feature lab

Added recurring tasks, household expense records, savings goals and provisional member limits. Free is 4 members; simulated plus is 12, including children. Existing members are preserved on downgrade; only new entries are blocked. The independent five-managed-children-per-guardian protection remains in place.

Settings includes **Rotinas recorrentes**, **Finanças da casa** and **Plano e integrantes** for adults. Only the Admin can switch the simulated plan. Child accounts cannot read finance or routine configuration through the RPC API. Existing generated tasks remain visible according to normal family permissions.

Routines support daily, weekly and monthly schedules in America/Sao_Paulo. Monthly scheduling preserves the original anchor (31 Jan → 28 Feb → 31 Mar; leap years are supported). A unique occurrence key and row locking prevent duplicate generation. Creating a routine due today generates its first task immediately; a QA-only pg_cron job runs every 10 minutes thereafter. Pause stops future generation. Downgrade suspends generation; re-upgrade resumes from the current schedule rather than accumulating the unpaid period.

Finances are manual records only, stored in integer BRL cents. Monthly category summaries and savings goals are shared with Admins and Adults. Archiving hides a record rather than physically deleting it. On downgrade, adults retain read access to history; writes require simulated plus. No bank integration, money movement, real subscription or price change is included.

QA scheduler installation (never run against production):

```sql
select cron.schedule('qa-plus-recurring','*/10 * * * *',
  $$select private.qa_materialize_routines((now() at time zone 'America/Sao_Paulo')::date);$$);
```

The migration is under `supabase/experiments/migrations/20261015155325_qa_plus_features.sql`. `tests/plus-security.sql` verifies recurrence idempotency, calendars, pause/downgrade, capacity, cents, private data isolation, cross-family access and history retention using rollback fixtures.

Manual acceptance is still required for the new screens and the next scheduled execution. This remains a QA-only draft; do not merge the branch into main or promote it to the original.

## Conquista da semana — QA only (15 October)

Children receive weekly ranking points from NEW insertions in the existing single-use task reward ledger, beginning with this feature's installation. No retroactive backfill; pre-existing completed tasks stay consumed. The wallet and shop spending are independent. Adults do not compete. Free/plus use the existing 1/2 point task rewards; no billing changes.

Weeks run Monday 00:00 through Sunday in America/Sao_Paulo. Server time exclusively determines the current week; there is no public date override or early-close API. Opening the challenge after rollover snapshots previous scored rounds under a family row lock. All children tied at a positive maximum win; zero-score weeks have no winner. Only current child members appear or make choices. A removed member cannot read or claim; finalized rounds do not assign replacement winners. Unfinalized rounds exclude children who have left or changed role. A rejoining child retains the score already earned in that family/week.

Each winner may choose movie, dinner or outing for themselves, with an explicit confirmation before the immutable choice. Repeated identical requests are idempotent. An Admin or Adult records that the details have been agreed with the child; no external purchases or bookings occur. Pending choices remain visible; confirmed history is visible for 52 weeks. Ranking and choice endpoints expose only the caller's family, never wallet balances, auth data or household finances.

Entry: trophy button beside the notification bell in the header and Settings, all family roles. UI clears on logout/family change, ignores late responses and refreshes on shared task changes/settings membership refresh. Private RLS tables have no client grants; privileged RPCs verify live Auth existence and membership, pin empty search_path and explicitly revoke anonymous execution.

Validation: 46 Node tests, 4 database suites, 9 DOM tests, 4 Python tests pass. New SQL suite also passed on QA with full rollback, covering real task rewards, duplicate completions, spending independence, ties, rollover, immutable choices, invalid rewards, loser/adult/outsider/anonymous rejection, adult confirmation, member removal and grant checks. Browser acceptance of the new challenge remains pending; no claim of authenticated E2E completion.

Manual Ninho+ acceptance reported by Miguel before challenge launch: first routine task, expense/goal totals, child hidden panels, downgrade/read-only retention/reactivation, pause/resume, reload persistence, Adult→Admin updates, +2 task points, no repeat reward, avatar purchases/equip/reload, insufficient funds and Adult plan restrictions passed. Next-day scheduled recurrence still awaits manual observation.

Pricing decision reserved for later: R$12.90 monthly per family or R$150 one-time per family while the service operates, family-linked across administrator changes. This note does not enable payment or change plan entitlement.

## Reference outfit (16 October)

Added `top_guardian` / Guardião Esmeralda for 12 points, a hand-drawn vector adaptation of the supplied outfit reference: dark green uniform, worn golden scarf, burgundy sleeves, light gloves and belt pouches. Fits the established chibi paper-sticker body; uses existing hair/skin/accessory choices. Additive QA-only catalog migration, no grants, wallet or inventory changes. Visual SVG render reviewed; existing avatar tests passed. Browser purchase/equip acceptance pending.

Added a separate `accessory_guardian_mask` / Máscara do Guardião, 8 points: green hood, raised tips, dark eye panels and grey vented mouth guard. Hair is tucked away while equipped and restored on removal; compatible with all tops and skin tones. Hand-drawn SVG reviewed, avatar checks passed, QA-only additive catalog migration.
