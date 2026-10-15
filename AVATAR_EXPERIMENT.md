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
4. As Admin, open the avatar panel's **Experimentar o bônus Ninho+** and select simulated plus.
5. Complete another fresh assigned task. Check +2 for the assignee, including a child member.
6. In **Lojinha**, exchange points for clothing, then select **Vestir** in the wardrobe. Reload and check persistence.
7. Return to simulated free. Owned clothes and the remaining balance must remain.
8. Try a purchase with insufficient points and a child attempt to change the simulation. Both must be blocked.
9. Check the avatar in the family members list from another test account; it refreshes on focus and periodic membership refresh.

Promotion to the original requires separate approval after user validation and a production entitlement design for the 2× bonus.
