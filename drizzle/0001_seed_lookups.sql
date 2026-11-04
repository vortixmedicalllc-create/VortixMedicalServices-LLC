-- Custom SQL migration file, put your code below! ---- Default lookup values (editable later in CRM Settings). Business data only; no PHI.
INSERT INTO "service_categories" ("key","label","sort_order") VALUES
 ('dme','DME Services',1),('medical_billing','Medical Billing',2),('ai','AI Services',3),('multiple','Multiple Services',4),('other','Other',5)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "lead_sources" ("key","label","sort_order") VALUES
 ('website','Website',1),('referral','Referral',2),('linkedin','LinkedIn',3),('social_media','Social Media',4),('email','Email',5),('phone','Phone',6),('manual','Manual Entry',7),('other','Other',8)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "pipeline_stages" ("key","label","sort_order","is_won","is_lost") VALUES
 ('new_opportunity','New Opportunity',1,false,false),('discovery','Discovery',2,false,false),('needs_assessment','Needs Assessment',3,false,false),
 ('proposal_sent','Proposal Sent',4,false,false),('negotiation','Negotiation',5,false,false),('won','Won',6,true,false),('lost','Lost',7,false,true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "company_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
