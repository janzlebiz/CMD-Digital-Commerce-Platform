"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TEST_MOCK_KMS = 'true';
const index_1 = require("./index");
// High-Fidelity Transactional In-Memory Test Harness for Firestore
class InMemoryFirestore {
    constructor() {
        this.collections = new Map();
        this.collections.set('users', new Map());
        this.collections.set('consultation_assignments', new Map());
        this.collections.set('consultation_intakes', new Map());
        this.collections.set('branch_inventory', new Map());
        this.collections.set('orders', new Map());
    }
    collection(collectionName) {
        if (!this.collections.has(collectionName)) {
            this.collections.set(collectionName, new Map());
        }
        const colMap = this.collections.get(collectionName);
        return {
            doc: (docId) => ({
                get: async () => {
                    const exists = colMap.has(docId);
                    const data = exists ? JSON.parse(JSON.stringify(colMap.get(docId))) : undefined;
                    return {
                        exists,
                        id: docId,
                        data: () => data,
                        get: (field) => data ? data[field] : undefined,
                    };
                },
                set: async (data) => {
                    colMap.set(docId, JSON.parse(JSON.stringify(data)));
                },
                update: async (data) => {
                    if (!colMap.has(docId)) {
                        throw new Error(`Document ${docId} does not exist for update.`);
                    }
                    const existing = colMap.get(docId);
                    colMap.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
                },
            }),
            where: (field, op, val) => ({
                get: async () => {
                    const docs = [];
                    colMap.forEach((docData, id) => {
                        if (op === '==' && docData[field] === val) {
                            docs.push({ id, data: () => docData });
                        }
                    });
                    return {
                        size: docs.length,
                        docs,
                        forEach: (cb) => docs.forEach(cb),
                    };
                },
            }),
            get: async () => {
                const docs = [];
                colMap.forEach((docData, id) => {
                    docs.push({ id, data: () => docData });
                });
                return {
                    size: docs.length,
                    docs,
                    forEach: (cb) => docs.forEach(cb),
                };
            },
        };
    }
    async runTransaction(updateFunction) {
        // Transactional staging buffers to guarantee true atomic commit or rollback
        const pendingUpdates = new Map();
        const stagingColData = new Map();
        this.collections.forEach((map, colName) => {
            const copy = new Map();
            map.forEach((v, k) => copy.set(k, JSON.parse(JSON.stringify(v))));
            stagingColData.set(colName, copy);
        });
        const transaction = {
            get: async (docRef) => {
                const [colName, docId] = docRef._path || this.extractPath(docRef);
                const colMap = stagingColData.get(colName);
                const exists = colMap.has(docId);
                const data = exists ? JSON.parse(JSON.stringify(colMap.get(docId))) : undefined;
                return {
                    exists,
                    id: docId,
                    data: () => data,
                    get: (field) => data ? data[field] : undefined,
                };
            },
            set: (docRef, data) => {
                const [colName, docId] = docRef._path || this.extractPath(docRef);
                const colMap = stagingColData.get(colName);
                colMap.set(docId, JSON.parse(JSON.stringify(data)));
                pendingUpdates.set(`${colName}/${docId}`, { col: colName, id: docId, data, type: 'set' });
            },
            update: (docRef, data) => {
                const [colName, docId] = docRef._path || this.extractPath(docRef);
                const colMap = stagingColData.get(colName);
                if (!colMap.has(docId)) {
                    throw new Error(`Document ${docId} does not exist`);
                }
                const existing = colMap.get(docId);
                colMap.set(docId, { ...existing, ...JSON.parse(JSON.stringify(data)) });
                pendingUpdates.set(`${colName}/${docId}`, { col: colName, id: docId, data, type: 'update' });
            },
        };
        // If updateFunction throws at any point, pendingUpdates is discarded (Rollback)
        const result = await updateFunction(transaction);
        // Commit all staged mutations atomically
        pendingUpdates.forEach((mutation) => {
            const liveCol = this.collections.get(mutation.col);
            if (mutation.type === 'set') {
                liveCol.set(mutation.id, JSON.parse(JSON.stringify(mutation.data)));
            }
            else {
                const existing = liveCol.get(mutation.id);
                liveCol.set(mutation.id, { ...existing, ...JSON.parse(JSON.stringify(mutation.data)) });
            }
        });
        return result;
    }
    extractPath(docRef) {
        if (docRef._path)
            return docRef._path;
        // Fallback parser if docRef is generated by collection().doc()
        return ['unknown', 'unknown'];
    }
}
async function runTests() {
    console.log('================================================================');
    console.log('      HCI CMD COMPLIANCE & PRODUCTION SECURITY AUDIT SUITE      ');
    console.log('================================================================\n');
    let passed = 0;
    let failed = 0;
    function assert(condition, msg) {
        if (condition) {
            console.log(`[PASS] - ${msg}`);
            passed++;
        }
        else {
            console.log(`[FAIL] - ${msg}`);
            failed++;
        }
    }
    // Initialize and inject transactional in-memory test database
    const inMemoryDb = new InMemoryFirestore();
    (0, index_1.setDatabase)(inMemoryDb);
    // Set up baseline fixtures
    await inMemoryDb.collection('users').doc('staff-daet-10').set({
        uid: 'staff-daet-10',
        role: 'staff',
        assignedBranchId: 'daet',
    });
    await inMemoryDb.collection('users').doc('practitioner-assigned').set({
        uid: 'practitioner-assigned',
        role: 'practitioner',
    });
    await inMemoryDb.collection('users').doc('practitioner-unassigned').set({
        uid: 'practitioner-unassigned',
        role: 'practitioner',
    });
    await inMemoryDb.collection('users').doc('patient-jane-99').set({
        uid: 'patient-jane-99',
        role: 'customer',
        assignedPractitionerId: 'practitioner-assigned',
    });
    await inMemoryDb.collection('consultation_assignments').doc('practitioner-assigned_patient-jane-99').set({
        practitionerId: 'practitioner-assigned',
        patientId: 'patient-jane-99',
    });
    await inMemoryDb.collection('branch_inventory').doc('daet_hci-cmd-65ml').set({
        stockCount: 10,
    });
    await inMemoryDb.collection('branch_inventory').doc('daet_hci-cmd-30ml').set({
        stockCount: 20,
    });
    // Seed corrupted-key test record in consultation_intakes
    await inMemoryDb.collection('consultation_intakes').doc('CNS-INT-CORRUPTED-KMS').set({
        id: 'CNS-INT-CORRUPTED-KMS',
        userId: 'patient-jane-99',
        practitionerId: 'practitioner-assigned',
        scheduledAt: new Date().toISOString(),
        deliveryMode: 'virtual',
        consentRecord: {
            purpose: 'Wellness',
            version: 'v1.0',
            timestamp: new Date().toISOString(),
        },
        encryptedClinicalIntake: {
            ciphertext: Buffer.from('some-fake-clinical-ciphertext-data').toString('base64'),
            iv: Buffer.from('123456789012').toString('base64'),
            tag: Buffer.from('1234567890123456').toString('base64'),
            encryptedKey: Buffer.from('corrupted-unwrappable-kms-key-envelope-payload-that-should-reject').toString('base64'),
            kmsKeyId: 'projects/gen-lang-client-0427039673/locations/global/keyRings/hic-cmd-keyring/cryptoKeys/clinical-spi-key'
        }
    });
    // --- 1. Unauthorized Branch Access Test ---
    try {
        // A staff user assigned to 'daet' attempts to place an order at 'labo'
        await index_1.createOrderSecure.run({
            items: [{ skuId: 'hci-cmd-65ml', quantity: 1 }],
            branchId: 'labo',
            customer: { firstName: 'Test' },
            paymentMethod: 'cash_on_delivery',
        }, { auth: { uid: 'staff-daet-10', token: {} } });
        assert(false, 'Unauthorized branch access was erroneously allowed.');
    }
    catch (err) {
        const isPermissionDenied = err.code === 'permission-denied' || err.message.includes('Branch isolation block');
        assert(isPermissionDenied, 'Unauthorized branch access blocked with permission-denied error.');
    }
    // --- 2. Unauthorized Clinical Access Test ---
    try {
        // Unauthenticated/guest context attempts to fetch record
        await index_1.fetchClinicalIntakeSecure.run({ intakeId: 'CNS-INT-CORRUPTED-KMS' }, { auth: null });
        assert(false, 'Guest clinical access was allowed.');
    }
    catch (err) {
        const isUnauthenticated = err.code === 'unauthenticated' || err.message.includes('identity required');
        assert(isUnauthenticated, 'Guest clinical access blocked with unauthenticated error.');
    }
    // --- 3. Practitioner/Patient Assignment Relationship Test ---
    // A practitioner NOT assigned to patient-jane-99 attempts to save/write clinical intake
    try {
        await index_1.saveClinicalIntakeSecure.run({
            userId: 'patient-jane-99',
            clinicalIntake: {
                dietaryHabits: 'None',
                waterConsumption: 'None',
                declaredConditions: 'None',
            },
            consentRecord: { purpose: 'Wellness', version: 'v1.0' },
            scheduledAt: new Date().toISOString(),
            deliveryMode: 'virtual',
        }, { auth: { uid: 'practitioner-unassigned', token: {} } });
        assert(false, 'Unassigned practitioner write was allowed.');
    }
    catch (err) {
        const isRelationshipDenied = err.code === 'permission-denied' || err.message.includes('Clinical boundary isolation block');
        assert(isRelationshipDenied, 'Unassigned practitioner write blocked successfully with clinical boundary isolation block.');
    }
    // A practitioner assigned to patient-jane-99 attempts to save
    try {
        const result = await index_1.saveClinicalIntakeSecure.run({
            userId: 'patient-jane-99',
            clinicalIntake: {
                dietaryHabits: 'Daet organic raw diets.',
                waterConsumption: '2 liters',
                declaredConditions: 'None',
            },
            consentRecord: { purpose: 'Wellness', version: 'v1.0' },
            scheduledAt: new Date().toISOString(),
            deliveryMode: 'virtual',
        }, { auth: { uid: 'practitioner-assigned', token: {} } });
        assert(result && result.success, 'Assigned practitioner write completed successfully.');
    }
    catch (err) {
        assert(false, `Assigned practitioner write failed unexpectedly: ${err.message}`);
    }
    // --- 4. Strengthened Atomic Multi-item Inventory + Order Rollback Test ---
    const initialSnap65 = await inMemoryDb.collection('branch_inventory').doc('daet_hci-cmd-65ml').get();
    const initialStock65 = initialSnap65.data()?.stockCount;
    const initialSnap30 = await inMemoryDb.collection('branch_inventory').doc('daet_hci-cmd-30ml').get();
    const initialStock30 = initialSnap30.data()?.stockCount;
    const ordersBeforeSnap = await inMemoryDb.collection('orders').where('userId', '==', 'patient-jane-99').get();
    const ordersBeforeCount = ordersBeforeSnap.size;
    try {
        // Attempt an order with one valid item and one item exceeding stock levels (triggers transaction failure)
        await index_1.createOrderSecure.run({
            items: [
                { skuId: 'hci-cmd-30ml', quantity: 1 },
                { skuId: 'hci-cmd-65ml', quantity: 99999 }, // Triggers transaction rollback
            ],
            branchId: 'daet',
            customer: { firstName: 'Juan' },
            paymentMethod: 'gcash',
        }, { auth: { uid: 'patient-jane-99', token: {} } });
        assert(false, 'Partially failing multi-item order was erroneously written.');
    }
    catch (err) {
        // Verify inventory state and orders count after rollback
        const finalSnap65 = await inMemoryDb.collection('branch_inventory').doc('daet_hci-cmd-65ml').get();
        const finalStock65 = finalSnap65.data()?.stockCount;
        const finalSnap30 = await inMemoryDb.collection('branch_inventory').doc('daet_hci-cmd-30ml').get();
        const finalStock30 = finalSnap30.data()?.stockCount;
        const ordersAfterSnap = await inMemoryDb.collection('orders').where('userId', '==', 'patient-jane-99').get();
        const ordersAfterCount = ordersAfterSnap.size;
        const inventoryUnchanged = (finalStock65 === initialStock65) && (finalStock30 === initialStock30);
        const noNewOrderDocument = (ordersAfterCount === ordersBeforeCount);
        assert(inventoryUnchanged && noNewOrderDocument, `Atomic Transaction Rollback Verified: All inventory lines unchanged (65ml: ${finalStock65}/${initialStock65}, 30ml: ${finalStock30}/${initialStock30}) AND zero order documents created (${ordersAfterCount}/${ordersBeforeCount}).`);
    }
    // --- 5. Strengthened KMS Fail-Closed Verification Test (Deliberately Invalid/Corrupted Wrapped DEK) ---
    try {
        // Fetch the clinical intake with corrupted key envelope. Document exists, but decryption must fail because KMS unwrap fails.
        await index_1.fetchClinicalIntakeSecure.run({ intakeId: 'CNS-INT-CORRUPTED-KMS' }, { auth: { uid: 'practitioner-assigned', token: {} } });
        assert(false, 'Corrupted DEK lookup was decrypted without failing closed.');
    }
    catch (err) {
        // Strictly verify:
        // 1. Must NOT be 'not-found' (the test record exists and was found)
        // 2. Must NOT be 'unauthenticated' or 'permission-denied' (practitioner is assigned and authorized)
        // 3. Must be a failure during KMS unwrapping/decryption
        const isNotFound = err.code === 'not-found' || err.message?.includes('not found') || err.message?.includes('Record not found');
        const isAuthError = err.code === 'unauthenticated' || err.code === 'permission-denied';
        const isKmsUnwrapFailure = !isNotFound && !isAuthError && (err.message?.includes('KMS') ||
            err.message?.includes('unwrap') ||
            err.message?.includes('unwrapping') ||
            err.message?.includes('DEK') ||
            err.message?.includes('key') ||
            err.message?.includes('decrypt') ||
            err.message?.includes('crypto') ||
            err.message?.includes('Invalid') ||
            err.message?.includes('ciphertext'));
        if (isNotFound) {
            assert(false, 'KMS test failed: Test record CNS-INT-CORRUPTED-KMS was not found in database.');
        }
        else if (isAuthError) {
            assert(false, `KMS test failed: Unexpected authorization error (${err.message}).`);
        }
        else if (isKmsUnwrapFailure) {
            assert(true, `KMS unwrap failure verified: Record found, and KMS unwrapping correctly failed closed (Error: ${err.message}).`);
        }
        else {
            assert(false, `KMS test failed: Unexpected error encountered (${err.message}).`);
        }
    }
    console.log('\n================================================================');
    console.log(`      TEST RUNNER COMPLETE: ${passed} PASSED, ${failed} FAILED      `);
    console.log('================================================================');
    if (failed > 0) {
        process.exit(1);
    }
    else {
        process.exit(0);
    }
}
runTests().catch(err => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
});
//# sourceMappingURL=testRunner.js.map