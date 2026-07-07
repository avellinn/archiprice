export function getProjectStatusLabel(status) {
  switch (String(status || '').toLowerCase()) {
    case 'draft':
    case 'active':
      return 'En cours';
    case 'treated':
      return 'Traité';
    case 'archived':
      return 'Archivé';
    default:
      return 'En cours';
  }
}

export function isTreatedProject(project) {
  return String(project?.status || '').toLowerCase() === 'treated';
}
