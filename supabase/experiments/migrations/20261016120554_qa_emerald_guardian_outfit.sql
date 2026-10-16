-- QA ONLY mqpjujirwooqzzirzwrr: additive wardrobe item. Existing inventory and balances are preserved.
insert into private.qa_avatar_catalog(id,slot,name,price)
values('top_guardian','top','Guardião Esmeralda',12)
on conflict(id) do nothing;
