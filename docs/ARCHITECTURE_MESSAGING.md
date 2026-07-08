# Architecture de Messagerie Commune

## Vue d'ensemble

Ce document décrit l'architecture commune partagée par les systèmes de messagerie de l'application : **Demandes** (client-fournisseur) et **Support** (client-admin).

## Principes directeurs

### 1. Séparation des responsabilités

Trois concepts distincts sont explicitement séparés :

| Concept | Porteur | Cas d'usage |
|---------|--------|-----------|
| **Conversation** | `messages[]` | Historique complet de l'échange |
| **État de lecture** | Timestamps sur les messages | `readByUserAt`, `readBySupplierAt`, `readByOwnerAt`, `readByAdminAt` |
| **Visibilité** | Flags de masquage | `hiddenByUser`, `hiddenBySupplier` |
| **Statut** | Champ technique (optionnel) | Compatibility, non pilotant |

### 2. Architecture des modèles

#### Demande (Conversation Client-Fournisseur)

```javascript
{
  user: ObjectId,                    // Client
  supplier: ObjectId,                // Fournisseur
  status: 'Nouveau',                 // Technique, non utilisé pour logic
  messages: [
    {
      sender: ObjectId,
      senderRole: 'user'|'supplier'|'admin',
      senderName: String,
      message: String,
      readByUserAt: Date,            // Marque la lecture par le client
      readBySupplierAt: Date,        // Marque la lecture par le fournisseur
      createdAt: Date,
      updatedAt: Date,
    }
  ],
  hiddenByUser: Boolean,             // Client a masqué la conversation
  hiddenBySupplier: Boolean,         // Fournisseur a masqué la conversation
  unreadForUser: Number,             // Dénormalisé pour perf
  unreadForSupplier: Number,         // Dénormalisé pour perf
  lastMessageAt: Date,               // Dénormalisé pour tri
  createdAt: Date,
  updatedAt: Date,
}
```

#### SupportItem (Conversation Client-Admin)

```javascript
{
  userId: ObjectId,                  // Client
  status: 'Ouvert'|'En cours'|'Résolu',  // Cycle de vie du ticket
  subject: String,
  description: String,
  reply: String,                     // Deprecated: utiliser messages[]
  messages: [
    {
      sender: ObjectId,
      senderRole: 'user'|'supplier'|'admin',
      senderName: String,
      message: String,
      readByOwnerAt: Date,           // Marque la lecture par le client/supplier
      readByAdminAt: Date,           // Marque la lecture par l'admin
      createdAt: Date,
      updatedAt: Date,
    }
  ],
  unreadForOwner: Number,            // Dénormalisé pour perf
  unreadForAdmin: Number,            // Dénormalisé pour perf
  tab: 'tickets'|'feedback'|'priceReports',
  type: String,
  sourceRole: 'user'|'supplier'|'admin',
  createdAt: Date,
  updatedAt: Date,
}
```

## Patterns API

### Création d'une conversation

**POST /api/demandes** ou **POST /api/support-items**

```javascript
{
  "clientName": String,
  "clientEmail": String,
  "subject": String,
  "message": String,
  // ... autres métadonnées
}
```

Le backend crée un premier message dans `messages[]` avec le contenu fourni.

### Ajouter un message

**POST /api/demandes/:id/messages** ou **POST /api/support-items/:id/messages**

```javascript
{
  "message": String,
}
```

Le backend :
1. Ajoute un nouveau message à `messages[]`
2. Met à jour `lastMessageAt`
3. Incrémente le compteur `unreadFor{Recipient}` approprié
4. Marque le message comme lu par l'émetteur (`readByOwnerAt` ou `readByAdminAt`)

### Marquer comme lu

**PATCH /api/demandes/:id/read** ou **PATCH /api/support-items/:id/read**

Le backend :
1. Marque tous les messages non lus du destinataire avec le timestamp approprié
2. Remet le compteur `unreadFor{User}` à 0
3. Envoie un événement realtime pour synchroniser les autres clients

### Masquer/Afficher

**PATCH /api/demandes/:id/hide** ou **PATCH /api/demandes/:id/unhide**

Le backend met à jour `hiddenByUser` ou `hiddenBySupplier`.

## Logique métier partagée

### Badge de statut de message

```javascript
// Pour Demandes
if (lastMessage.senderRole === 'supplier') {
  return lastMessage.readByUserAt ? 'Lu' : 'Envoyé';
}
if (lastMessage.senderRole === 'user') {
  return lastMessage.readBySupplierAt ? 'Lu' : 'Envoyé';
}

// Pour Support
if (lastMessage.senderRole === 'admin') {
  return lastMessage.readByOwnerAt ? 'Lu' : 'Envoyé';
}
if (lastMessage.senderRole !== 'admin') {
  return lastMessage.readByAdminAt ? 'Lu' : 'Nouveau';
}
```

### Visibilité dans les listes

```javascript
// Demandes (côté client)
visibleDemandes = demandes.filter(d => !d.hiddenByUser);

// Demandes (côté fournisseur)
visibleDemandes = demandes.filter(d => !d.hiddenBySupplier);

// Support (côté client)
visibleSupport = items.filter(s => userId === s.userId);
```

### Tri et filtrage

Les listes doivent toujours être triées par `lastMessageAt` descendant ou `updatedAt` descendant.

## Patterns Frontend

### Hook de conversation

```javascript
function useConversation(conversationId, role) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch conversation
  // Subscribe to updates
  // Handle unsubscribe on unmount
  
  return { conversation, messages, isLoading, error, refetch };
}
```

### Service de messagerie

```javascript
// demandes.js ou supportItems.js

export async function createMessage(conversationId, messageText) {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    message: messageText,
  });
  return response.data.conversation;
}

export async function markAsRead(conversationId, role) {
  const response = await api.patch(`/conversations/${conversationId}/read`, {});
  return response.data;
}

export async function hideConversation(conversationId) {
  const response = await api.patch(`/conversations/${conversationId}/hide`, {});
  return response.data;
}
```

### Composant de conversation

```javascript
function ConversationView({ messages, currentRole, onSendMessage, onMarkAsRead }) {
  // Affiche les messages
  // Gère l'envoi de messages
  // Gère la lecture automatique au scroll/focus
  
  return (
    <div>
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <MessageComposer onSend={onSendMessage} />
    </div>
  );
}
```

## Synchronisation temps réel

Les événements Realtime publiés :

### Demandes
- `demandes.created` - Nouvelle demande
- `demandes.message-created` - Nouveau message
- `demandes.read` - Conversation lue
- `demandes.hidden` - Conversation masquée
- `demandes.unhidden` - Conversation réaffichée
- `demandes.updated` - Mise à jour générale

### Support Items
- `support-items.created` - Nouveau ticket
- `support-items.message-created` - Nouveau message
- `support-items.read` - Ticket lu
- `support-items.updated` - Mise à jour générale

## Migration et compatibilité

### Champs dépréciés

- `Demande.status` : Valeur unique 'Nouveau', purement technique
- `SupportItem.reply` : Maintenu pour compatibilité, utiliser `messages[]`

### Données de tests

Les tests utilisent des données structurées avec `messages[]` de manière cohérente dans les deux systèmes.

## Conventions de nommage

### Rôles
- `user` : Client
- `supplier` : Fournisseur
- `admin` : Administrateur

### Timestamps de lecture
- `readByUserAt` : Demandes, lu par le client
- `readBySupplierAt` : Demandes, lu par le fournisseur
- `readByOwnerAt` : Support, lu par le client/supplier (propriétaire du ticket)
- `readByAdminAt` : Support, lu par l'admin

### Compteurs non lus
- `unreadForUser` : Demandes, messages non lus pour le client
- `unreadForSupplier` : Demandes, messages non lus pour le fournisseur
- `unreadForOwner` : Support, messages non lus pour le client/supplier
- `unreadForAdmin` : Support, messages non lus pour l'admin

## Évolution future

Cette architecture permet facilement :
- Ajouter des conversations de groupe
- Ajouter des pièces jointes aux messages
- Ajouter des réactions/emojis
- Ajouter des brouillons de messages
- Implémenter les indicateurs de "en train de taper"
- Ajouter la recherche full-text sur les messages
- Implémenter les threads de conversation
