import {openDB} from 'idb';
const DB='patkai-offline';const STORE='reports';
export async function queueReport(report:any){const db=await openDB(DB,1,{upgrade(db){if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'idempotency_key'})}});await db.put(STORE,report)}
export async function getQueuedReports(){const db=await openDB(DB,1,{upgrade(db){if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'idempotency_key'})}});return db.getAll(STORE)}
export async function clearQueued(keys:string[]){const db=await openDB(DB,1,{upgrade(db){if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'idempotency_key'})}});const tx=db.transaction(STORE,'readwrite');for(const k of keys)await tx.store.delete(k);await tx.done}
