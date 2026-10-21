import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCustomerDataset, validateCustomerDataset } from '../src/os/customer-fixtures.mjs';

test('customer fixture import rejects ambiguous identities and live workspace IDs', () => {
  const dataset = makeCustomerDataset();
  dataset.customers[1].customer_id = dataset.customers[0].customer_id;
  assert.throws(() => validateCustomerDataset(dataset), /unique and isolated/);
  dataset.customers[1].customer_id = 'SYN-002';
  dataset.customers[0].organization_id = 'org_' + 'a'.repeat(32);
  assert.throws(() => validateCustomerDataset(dataset), /unique and isolated/);
});
test('customer fixture import rejects negative, sub-cent and impossible outcome evidence', () => {
  for (const value of [-0.000001, 12.345, Infinity]) {
    const dataset = makeCustomerDataset();
    dataset.customers[0].spend_usd = value;
    assert.throws(() => validateCustomerDataset(dataset), /cent precision/);
  }
  const dataset = makeCustomerDataset();
  dataset.customers[0].qualified = dataset.customers[0].eligible + 1;
  assert.throws(() => validateCustomerDataset(dataset));
});
