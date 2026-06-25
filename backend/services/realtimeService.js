const realtimeClients = new Map();

function normalizeId(value) {
  return value ? String(value) : '';
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function matchesTarget(client, targets = {}) {
  const roles = Array.isArray(targets.roles) ? targets.roles.map(String) : [];
  const userIds = Array.isArray(targets.userIds) ? targets.userIds.map(normalizeId) : [];

  if (roles.length === 0 && userIds.length === 0) return true;

  return roles.includes(client.role) || userIds.includes(client.userId);
}

export function addRealtimeClient(req, res) {
  const clientId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const client = {
    id: clientId,
    userId: normalizeId(req.user?._id),
    role: String(req.user?.role || '').toLowerCase(),
    res,
  };

  realtimeClients.set(clientId, client);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  writeSse(res, {
    type: 'connected',
    createdAt: new Date().toISOString(),
    userId: client.userId,
    role: client.role,
  });

  req.on('close', () => {
    realtimeClients.delete(clientId);
  });
}

function publishRealtimeEvent(event, targets = {}) {
  const payload = {
    createdAt: new Date().toISOString(),
    ...event,
  };

  realtimeClients.forEach((client) => {
    if (!matchesTarget(client, targets)) return;
    writeSse(client.res, payload);
  });
}

export function publishCrudEvent(entity, action, payload = {}, targets = {}) {
  publishRealtimeEvent(
    {
      type: `${entity}:${action}`,
      entity,
      action,
      payload,
    },
    targets,
  );
}
