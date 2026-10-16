-- QA ONLY mqpjujirwooqzzirzwrr. Add complete characters; retain Lisbon/Jane and all owned items.
insert into private.qa_avatar_catalog(id,slot,name,price) values
 ('set_deku','set','Deku',20),('set_heisenberg','set','Heisenberg',20),('set_gus','set','Gus Fring',20)
on conflict(id) do nothing;
