const AVATAR_COLORS = ['#0a3764', '#c0893f', '#22c55e', '#5877f7', '#1d0870', '#dc2626'];

export function getDisplayName(user) {
  const name = user?.name?.trim();
  if (name) return name;

  const emailName = user?.email?.split('@')[0]?.trim();
  if (emailName) return emailName;

  return 'Utilisateur';
}

export function getUserInitials(user) {
  return getDisplayName(user)
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarColor(user) {
  if (user?.avatarColor) return user.avatarColor;

  const source = user?.email || user?.name || 'archiprice';
  const sum = [...source].reduce((total, char) => total + char.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function getRandomAvatarColor(previousColor) {
  const availableColors = previousColor
    ? AVATAR_COLORS.filter((color) => color !== previousColor)
    : AVATAR_COLORS;
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}
