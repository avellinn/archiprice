import test from 'node:test';
import assert from 'node:assert/strict';
import Demande from '../models/Demande.js';

function buildMessage(overrides = {}) {
  return {
    senderRole: 'user',
    senderName: 'Client',
    message: 'Bonjour',
    readByUserAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

test('stores message read timestamps on the message itself', () => {
  const demande = new Demande({
    user: '507f191e810c19729de860ea',
    supplier: '507f191e810c19729de860eb',
    messages: [buildMessage()],
  });

  demande.messages.push(buildMessage({ senderRole: 'supplier', senderName: 'Boutique', message: 'Réponse', readBySupplierAt: new Date('2024-01-02T00:00:00.000Z') }));

  assert.equal(demande.messages.length, 2);
  assert.equal(demande.messages[1].message, 'Réponse');
  assert.ok(demande.messages[0].readByUserAt);
  assert.ok(demande.messages[1].readBySupplierAt);
});

test('keeps user and supplier visibility flags independent', () => {
  const demande = new Demande({
    user: '507f191e810c19729de860ea',
    supplier: '507f191e810c19729de860eb',
    messages: [buildMessage()],
    hiddenByUser: false,
    hiddenBySupplier: false,
  });

  demande.hiddenByUser = true;
  demande.hiddenBySupplier = true;

  assert.equal(demande.hiddenByUser, true);
  assert.equal(demande.hiddenBySupplier, true);
});
