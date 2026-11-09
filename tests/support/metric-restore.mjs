import { testClient } from "./approved-db.mjs";
const client = await testClient("migrator");
try {
	await client.query(`WITH principal AS (SELECT id FROM users WHERE subject='upgrade-proof'),
 batch AS (INSERT INTO import_batches(actor,environment,digest) SELECT id,'staging',repeat('0',64) FROM principal RETURNING id,actor),
 service AS (SELECT id FROM services WHERE environment='staging' AND name='Schema upgrade sentinel')
 INSERT INTO manual_readings(service_id,environment,provider,metric_name,unit,aggregation,value,observed_at,source_method,source_reference,note,entered_by,batch_id)
 SELECT service.id,'staging','azure','normalized_ru','percent','max',29,now(),'manual','restore-proof','synthetic',batch.actor,batch.id FROM service,batch`);
} finally {
	await client.end();
}
