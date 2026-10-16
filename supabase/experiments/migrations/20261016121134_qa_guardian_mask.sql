-- QA ONLY mqpjujirwooqzzirzwrr. Additive accessory; preserves inventory and balances.
insert into private.qa_avatar_catalog(id,slot,name,price)
values('accessory_guardian_mask','accessory','Máscara do Guardião',8)
on conflict(id) do nothing;
